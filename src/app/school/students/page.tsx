import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import type { Prisma } from "@/generated/prisma/client";
import { requireSchoolAdmin } from "@/lib/auth/dal";
import { schoolDb } from "@/lib/db";
import { toId } from "@/lib/form";
import { one, pageParam, withQuery } from "@/lib/params";
import { PageSkeleton } from "@/components/page-skeleton";
import { StudentPhoto } from "@/components/student-photo";
import { Alert, Badge, Button, ButtonLink, Card, EmptyState, filterBar, inputClass, PageHeader, Pagination, subtleLink, tbodyRow, td, th, theadRow } from "@/components/ui";

export const metadata: Metadata = { title: "Students" };

const PAGE_SIZE = 50;

export default function StudentsPage({ searchParams }: PageProps<"/school/students">) {
  return (
    <>
      <PageHeader
        title="Students"
        actions={
          <>
            <ButtonLink href="/school/import" variant="secondary">Import from Excel</ButtonLink>
            <ButtonLink href="/school/students/new">+ Add student</ButtonLink>
          </>
        }
      />
      <Suspense fallback={<PageSkeleton />}>
        <List searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function List({ searchParams }: { searchParams: PageProps<"/school/students">["searchParams"] }) {
  const user = await requireSchoolAdmin();
  const sp = await searchParams;
  const q = one(sp.q).trim().slice(0, 100);
  const classParam = one(sp.class);
  const classId = classParam === "none" ? "none" : toId(classParam);
  const statusParam = one(sp.status);
  const status = statusParam === "INACTIVE" ? "INACTIVE" : statusParam === "all" ? undefined : "ACTIVE";
  const page = pageParam(sp.page);

  const where: Prisma.StudentWhereInput = {
    ...(status && { status }),
    ...(classId === "none" ? { classGroupId: null } : classId ? { classGroupId: classId } : {}),
    ...(q && {
      OR: [{ fullName: { contains: q, mode: "insensitive" } }, { studentCode: { contains: q, mode: "insensitive" } }],
    }),
  };

  const { total, students, classes } = await schoolDb(user, async (tx) => {
    const [total, students, classes] = await Promise.all([
      tx.student.count({ where }),
      tx.student.findMany({
        where,
        orderBy: [{ fullName: "asc" }, { id: "asc" }],
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        select: { id: true, fullName: true, studentCode: true, status: true, photoKey: true, classGroup: { select: { name: true } } },
      }),
      tx.classGroup.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true } }),
    ]);
    return { total, students, classes };
  });
  const deleted = one(sp.deleted) === "1";
  const filtered = q || classParam || statusParam;

  return (
    <div className="space-y-4">
      {deleted && <Alert tone="success">Student deleted.</Alert>}
      <Card>
        <form className={filterBar} role="search">
          <div className="min-w-48 flex-1">
            <label htmlFor="q" className="sr-only">Search</label>
            <input id="q" name="q" type="search" defaultValue={q} placeholder="Search name or student ID…" className={`${inputClass} mt-0`} />
          </div>
          <div>
            <label htmlFor="class" className="sr-only">Class</label>
            <select id="class" name="class" defaultValue={classParam} className={`${inputClass} mt-0 w-auto`}>
              <option value="">All classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
              <option value="none">No class</option>
            </select>
          </div>
          <div>
            <label htmlFor="status" className="sr-only">Status</label>
            <select id="status" name="status" defaultValue={statusParam || "ACTIVE"} className={`${inputClass} mt-0 w-auto`}>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="all">All</option>
            </select>
          </div>
          <Button type="submit" variant="secondary">Filter</Button>
          {filtered && <Link href="/school/students" className={subtleLink}>Clear</Link>}
        </form>

        {students.length === 0 ? (
          <EmptyState>
            {filtered ? (
              "No students match these filters."
            ) : (
              <>
                No students yet. <Link href="/school/students/new" className="font-semibold text-blue-700 transition-colors hover:text-blue-800">Add one</Link> or{" "}
                <Link href="/school/import" className="font-semibold text-blue-700 transition-colors hover:text-blue-800">import from Excel</Link>.
              </>
            )}
          </EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={theadRow}>
                  <th scope="col" className={th}>Name</th>
                  <th scope="col" className={th}>Student ID</th>
                  <th scope="col" className={th}>Class</th>
                  <th scope="col" className={th}>Status</th>
                  <th scope="col" className={th}><span className="sr-only">Card</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((s) => (
                  <tr key={s.id} className={tbodyRow}>
                    <td className={td}>
                      <Link href={`/school/students/${s.id}`} className="flex items-center gap-3 font-bold text-slate-900 transition-colors hover:text-blue-700">
                        <StudentPhoto student={s} size={32} />
                        {s.fullName}
                      </Link>
                    </td>
                    <td className={`${td} font-mono text-xs text-slate-700`}>{s.studentCode}</td>
                    <td className={`${td} text-slate-600`}>{s.classGroup?.name ?? "—"}</td>
                    <td className={td}>{s.status === "ACTIVE" ? <Badge tone="green" dot>Active</Badge> : <Badge dot>Inactive</Badge>}</td>
                    <td className={`${td} text-right`}>
                      <Link href={`/school/students/${s.id}/card`} className="text-sm font-semibold text-blue-700 transition-colors hover:text-blue-800">Card</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination
          page={page}
          pageSize={PAGE_SIZE}
          total={total}
          noun="students"
          href={(p) => withQuery("/school/students", { q, class: classParam, status: statusParam, page: p })}
        />
      </Card>
    </div>
  );
}
