import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireSchoolAdmin } from "@/lib/auth/dal";
import { schoolDb } from "@/lib/db";
import { PageSkeleton } from "@/components/page-skeleton";
import { ActionButton } from "@/components/action-button";
import { Badge, Card, CardHeader, EmptyState, PageHeader, td, th, theadRow } from "@/components/ui";
import { AddClassForm, EditClassRow } from "./class-forms";
import { deleteClass, setClassActive } from "./actions";

export const metadata: Metadata = { title: "Classes" };

export default function ClassesPage() {
  return (
    <>
      <PageHeader title="Classes" description="Classes or sections, used to group students on cards and in the register." />
      <Suspense fallback={<PageSkeleton />}>
        <Content />
      </Suspense>
    </>
  );
}

async function Content() {
  const user = await requireSchoolAdmin();
  const classes = await schoolDb(user, (tx) =>
    tx.classGroup.findMany({
      orderBy: [{ isActive: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
      include: { _count: { select: { students: { where: { status: "ACTIVE" } } } } },
    }),
  );
  const allCounts = await schoolDb(user, (tx) => tx.student.groupBy({ by: ["classGroupId"], _count: { _all: true } }));
  const anyStudents = (id: number) => (allCounts.find((c) => c.classGroupId === id)?._count._all ?? 0) > 0;

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <AddClassForm />
      </Card>
      <Card>
        <CardHeader title={`All classes (${classes.length})`} />
        {classes.length === 0 ? (
          <EmptyState>No classes yet. Add your first class above.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={theadRow}>
                  <th scope="col" className={th}>Class</th>
                  <th scope="col" className={`${th} text-right`}>Active students</th>
                  <th scope="col" className={th}>Order</th>
                  <th scope="col" className={th}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {classes.map((c) => (
                  <tr key={c.id}>
                    <td className={td}>
                      <Link href={`/school/students?class=${c.id}`} className="font-bold text-slate-900 transition-colors hover:text-blue-700">{c.name}</Link>
                      {!c.isActive && <span className="ml-2"><Badge>Hidden</Badge></span>}
                    </td>
                    <td className={`${td} text-right tabular-nums`}>{c._count.students}</td>
                    <td className={`${td} tabular-nums text-slate-600`}>{c.sortOrder}</td>
                    <td className={td}>
                      <div className="flex flex-wrap items-center gap-3">
                        <EditClassRow id={c.id} name={c.name} sortOrder={c.sortOrder} />
                        <ActionButton action={setClassActive} fields={{ classId: c.id, active: String(!c.isActive) }} label={c.isActive ? "Hide" : "Show"} link />
                        {!anyStudents(c.id) && <ActionButton action={deleteClass} fields={{ classId: c.id }} label="Delete" link variant="danger" confirm="Delete class?" />}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <p className="text-xs text-slate-500">Hidden classes can’t be chosen for new students but keep their existing students.</p>
    </div>
  );
}
