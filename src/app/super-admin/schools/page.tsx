import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import type { Prisma } from "@/generated/prisma/client";
import { requireSuperAdmin } from "@/lib/auth/dal";
import { platformDb } from "@/lib/db";
import { PLATFORM_TIME_ZONE } from "@/lib/platform";
import { PageSkeleton } from "@/components/page-skeleton";
import { Button, ButtonLink, Card, EmptyState, PageHeader, Pagination, StatusBadge, filterBar, formatDate, inputClass, rowLink, subtleLink, tbodyRow, td, th, theadRow } from "@/components/ui";
import { icons } from "@/components/icons";

export const metadata: Metadata = { title: "Schools" };

const PAGE_SIZE = 20;

export default function SchoolsPage({ searchParams }: PageProps<"/super-admin/schools">) {
  return (
    <>
      <PageHeader
        eyebrow="Platform"
        title="Schools"
        actions={
          <ButtonLink href="/super-admin/schools/new">
            <icons.plus width={16} height={16} strokeWidth={2.4} /> New school
          </ButtonLink>
        }
      />
      <Suspense fallback={<PageSkeleton />}>
        <SchoolsList searchParams={searchParams} />
      </Suspense>
    </>
  );
}

function one(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

async function SchoolsList({ searchParams }: { searchParams: PageProps<"/super-admin/schools">["searchParams"] }) {
  const user = await requireSuperAdmin();
  const params = await searchParams;

  const q = one(params.q).trim().slice(0, 100);
  const statusParam = one(params.status);
  const status = statusParam === "ACTIVE" || statusParam === "INACTIVE" ? statusParam : undefined;
  const page = Math.max(1, Math.min(10_000, Number.parseInt(one(params.page), 10) || 1));

  const where: Prisma.SchoolWhereInput = {
    ...(status && { status }),
    ...(q && {
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { slug: { contains: q, mode: "insensitive" } },
        { contactEmail: { contains: q, mode: "insensitive" } },
      ],
    }),
  };

  const { total, schools } = await platformDb(user, async (tx) => {
    const [total, schools] = await Promise.all([
      tx.school.count({ where }),
      tx.school.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          timezone: true,
          createdAt: true,
          _count: { select: { students: true, users: true } },
        },
      }),
    ]);
    return { total, schools };
  });

  const link = (p: number) => {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (status) sp.set("status", status);
    if (p > 1) sp.set("page", String(p));
    const s = sp.toString();
    return `/super-admin/schools${s ? `?${s}` : ""}`;
  };

  return (
    <Card>
      {/* Plain GET form: filters live in the URL, so results can be bookmarked/shared. */}
      <form className={filterBar} role="search">
        <div className="min-w-48 flex-1">
          <label htmlFor="q" className="sr-only">
            Search schools
          </label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Search by name, web name or email…"
            className={`${inputClass} mt-0`}
          />
        </div>
        <div>
          <label htmlFor="status" className="sr-only">
            Status
          </label>
          <select id="status" name="status" defaultValue={status ?? ""} className={`${inputClass} mt-0`}>
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
        <Button type="submit" variant="secondary">
          <icons.search width={16} height={16} /> Filter
        </Button>
        {(q || status) && (
          <Link href="/super-admin/schools" className={subtleLink}>
            Clear
          </Link>
        )}
      </form>

      {schools.length === 0 ? (
        <EmptyState icon="school">
          {q || status ? (
            "No schools match these filters."
          ) : (
            <>
              No schools yet.{" "}
              <Link href="/super-admin/schools/new" className="font-semibold text-blue-700">
                Create the first one
              </Link>
            </>
          )}
        </EmptyState>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className={theadRow}>
                <th scope="col" className={th}>School</th>
                <th scope="col" className={th}>Status</th>
                <th scope="col" className={`${th} text-right`}>Students</th>
                <th scope="col" className={`${th} text-right`}>Admins</th>
                <th scope="col" className={th}>Time zone</th>
                <th scope="col" className={th}>Added</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {schools.map((s) => (
                <tr key={s.id} className={tbodyRow}>
                  <td className={td}>
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-sm font-black text-blue-700 ring-1 ring-blue-300/50">
                        {s.name.trim().charAt(0).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <Link href={`/super-admin/schools/${s.id}`} className={rowLink}>
                          {s.name}
                        </Link>
                        <div className="text-xs text-slate-500">{s.slug}</div>
                      </div>
                    </div>
                  </td>
                  <td className={td}>
                    <StatusBadge status={s.status} />
                  </td>
                  <td className={`${td} text-right font-bold tabular-nums text-slate-900`}>{s._count.students.toLocaleString("en-US")}</td>
                  <td className={`${td} text-right tabular-nums`}>{s._count.users}</td>
                  <td className={`${td} text-slate-500`}>{s.timezone}</td>
                  <td className={`${td} whitespace-nowrap text-slate-500`}>{formatDate(s.createdAt, PLATFORM_TIME_ZONE)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={page} pageSize={PAGE_SIZE} total={total} href={link} noun="schools" />
    </Card>
  );
}
