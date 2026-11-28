import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import type { Prisma } from "@/generated/prisma/client";
import { requireSchoolAdmin } from "@/lib/auth/dal";
import { schoolDb } from "@/lib/db";
import { toId } from "@/lib/form";
import { one, pageParam, withQuery } from "@/lib/params";
import { qrSvg } from "@/lib/qr";
import { PageSkeleton } from "@/components/page-skeleton";
import { PrintButton } from "@/components/print-button";
import { StudentCard } from "@/components/student-card";
import { Button, Card, EmptyState, inputClass, PageHeader, Pagination, subtleLink, inputBase } from "@/components/ui";

export const metadata: Metadata = { title: "Print cards" };

/** Cards per screen/print run (A4 fits 10 cards: 2 × 5). */
const PAGE_SIZE = 50;

export default function CardsPage({ searchParams }: PageProps<"/school/cards">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Content searchParams={searchParams} />
    </Suspense>
  );
}

async function Content({ searchParams }: { searchParams: PageProps<"/school/cards">["searchParams"] }) {
  const user = await requireSchoolAdmin();
  const sp = await searchParams;
  const classParam = one(sp.class);
  const classId = classParam === "none" ? "none" : toId(classParam);
  const q = one(sp.q).trim().slice(0, 100);
  const page = pageParam(sp.page);

  const where: Prisma.StudentWhereInput = {
    status: "ACTIVE",
    ...(classId === "none" ? { classGroupId: null } : classId ? { classGroupId: classId } : {}),
    ...(q && { OR: [{ fullName: { contains: q, mode: "insensitive" } }, { studentCode: { contains: q, mode: "insensitive" } }] }),
  };
  const { classes, total, students } = await schoolDb(user, async (tx) => {
    const [classes, total, students] = await Promise.all([
      tx.classGroup.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true } }),
      tx.student.count({ where }),
      tx.student.findMany({
        where,
        orderBy: [{ classGroup: { sortOrder: "asc" } }, { classGroup: { name: "asc" } }, { fullName: "asc" }],
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        include: { classGroup: { select: { name: true } } },
      }),
    ]);
    return { classes, total, students };
  });
  const cards = await Promise.all(students.map(async (s) => ({ ...s, className: s.classGroup?.name ?? null, qrSvg: await qrSvg(s.qrToken) })));

  return (
    <>
      <div className="print:hidden">
        <PageHeader
          title="Print QR cards"
          description="Cards for active students. Print on A4 at 100% scale and cut along the borders."
          actions={cards.length > 0 && <PrintButton label={`Print ${cards.length} card${cards.length === 1 ? "" : "s"}`} />}
        />
        <Card className="mb-6">
          <form className="flex flex-wrap items-end gap-3 p-4">
            <div>
              <label htmlFor="class" className="sr-only">Class</label>
              <select id="class" name="class" defaultValue={classParam} className={`${inputBase} w-auto`}>
                <option value="">All classes</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
                <option value="none">No class</option>
              </select>
            </div>
            <div className="min-w-48 flex-1">
              <label htmlFor="q" className="sr-only">Search</label>
              <input id="q" name="q" type="search" defaultValue={q} placeholder="Only some students? Search name or ID…" className={`${inputBase} block w-full`} />
            </div>
            <Button type="submit" variant="secondary">Show</Button>
            {(classParam || q) && <Link href="/school/cards" className={subtleLink}>Clear</Link>}
          </form>
          {total > PAGE_SIZE && (
            <Pagination page={page} pageSize={PAGE_SIZE} total={total} noun="cards" href={(p) => withQuery("/school/cards", { class: classParam, q, page: p })} />
          )}
        </Card>
      </div>
      {cards.length === 0 ? (
        <Card>
          <EmptyState>No active students match.</EmptyState>
        </Card>
      ) : (
        <div className="card-sheet grid justify-center gap-[4mm] sm:grid-cols-[repeat(auto-fill,85.6mm)] print:grid-cols-[85.6mm_85.6mm] print:gap-[4mm]">
          {cards.map((s) => (
            <StudentCard key={s.id} s={s} schoolName={user.school.name} />
          ))}
        </div>
      )}
    </>
  );
}
