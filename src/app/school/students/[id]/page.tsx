import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requireSchoolAdmin } from "@/lib/auth/dal";
import { schoolDb } from "@/lib/db";
import { toId } from "@/lib/form";
import { one } from "@/lib/params";
import { dbToDateOnly, dateOnlyLabel, timeInZone, todayInZone } from "@/lib/dates";
import { PageSkeleton } from "@/components/page-skeleton";
import { StudentPhoto } from "@/components/student-photo";
import { ActionButton } from "@/components/action-button";
import { Alert, Badge, ButtonLink, Card, CardHeader, Crumbs, PageHeader, formatDate } from "@/components/ui";
import { StudentForm } from "../_components/student-form";
import { PhotoUploader } from "../_components/photo-uploader";
import { deleteStudent, regenerateQr, removePhoto, setStudentStatus } from "../actions";

export const metadata: Metadata = { title: "Student" };

export default function StudentPage(props: PageProps<"/school/students/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Content {...props} />
    </Suspense>
  );
}

async function Content({ params, searchParams }: PageProps<"/school/students/[id]">) {
  const user = await requireSchoolAdmin();
  const id = toId((await params).id);
  if (!id) notFound();
  const created = one((await searchParams).created) === "1";
  const tz = user.school.timezone;
  const month = todayInZone(tz).slice(0, 7);

  const data = await schoolDb(user, async (tx) => {
    const student = await tx.student.findUnique({
      where: { id },
      include: { classGroup: { select: { id: true, name: true } } },
    });
    if (!student) return null;
    const [classes, recent, totals, monthPresent] = await Promise.all([
      tx.classGroup.findMany({
        where: { OR: [{ isActive: true }, { id: student.classGroupId ?? -1 }] },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: { id: true, name: true },
      }),
      tx.attendance.findMany({ where: { studentId: id }, orderBy: { date: "desc" }, take: 10 }),
      tx.attendance.groupBy({ by: ["status"], where: { studentId: id }, _count: { _all: true } }),
      tx.attendance.count({ where: { studentId: id, status: "PRESENT", date: { gte: new Date(`${month}-01T00:00:00Z`) } } }),
    ]);
    return { student, classes, recent, totals, monthPresent };
  });
  if (!data) notFound();
  const { student: s, classes, recent, totals, monthPresent } = data;
  const count = (st: "PRESENT" | "ABSENT") => totals.find((t) => t.status === st)?._count._all ?? 0;
  const hasHistory = count("PRESENT") + count("ABSENT") > 0;

  return (
    <>
      <PageHeader
        title={s.fullName}
        description={<Crumbs items={[["Students", "/school/students"], [s.fullName]]} />}
        actions={
          <>
            {s.status === "ACTIVE" ? <Badge tone="green" dot>Active</Badge> : <Badge dot>Inactive</Badge>}
            <ButtonLink href={`/school/students/${s.id}/card`} variant="secondary">View card</ButtonLink>
          </>
        }
      />
      {created && (
        <div className="mb-4">
          <Alert tone="success">Student added. You can add a photo and print their card now.</Alert>
        </div>
      )}
      {s.status === "INACTIVE" && (
        <div className="mb-4">
          <Alert tone="warning">This student is inactive: their QR card is refused at the scanner and they are hidden from the register.</Alert>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title="Details" />
            <div className="p-5">
              <StudentForm
                key={s.updatedAt.toISOString()}
                studentId={s.id}
                classes={classes}
                initial={{ studentCode: s.studentCode, fullName: s.fullName, classGroupId: s.classGroupId ? String(s.classGroupId) : "" }}
              />
            </div>
          </Card>

          <Card>
            <CardHeader title="Attendance" />
            <dl className="grid grid-cols-3 gap-4 border-b border-zinc-100 p-5">
              <div>
                <dt className="text-xs font-medium text-zinc-500">Present this month</dt>
                <dd className="mt-1 text-3xl font-semibold tracking-tight tabular-nums text-zinc-900">{monthPresent}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-zinc-500">Present (all time)</dt>
                <dd className="mt-1 text-3xl font-semibold tracking-tight tabular-nums text-zinc-900">{count("PRESENT")}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-zinc-500">Marked absent</dt>
                <dd className="mt-1 text-3xl font-semibold tracking-tight tabular-nums text-zinc-900">{count("ABSENT")}</dd>
              </div>
            </dl>
            {recent.length === 0 ? (
              <p className="px-5 py-6 text-sm text-zinc-500">No attendance recorded yet.</p>
            ) : (
              <ul className="divide-y divide-zinc-100 text-sm">
                {recent.map((a) => (
                  <li key={a.date.toISOString()} className="flex items-center justify-between gap-3 px-5 py-2.5">
                    <span>{dateOnlyLabel(dbToDateOnly(a.date))}</span>
                    <span className="flex items-center gap-3 text-zinc-500">
                      <span className="text-xs">{a.source === "QR_SCAN" ? `QR scan ${timeInZone(a.markedAt, tz)}` : "Marked by hand"}</span>
                      {a.status === "PRESENT" ? <Badge tone="green">Present</Badge> : <Badge tone="red">Absent</Badge>}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Photo" />
            <div className="flex items-center gap-4 p-5">
              <StudentPhoto student={s} size={96} />
              <div className="space-y-2">
                <PhotoUploader studentId={s.id} hasPhoto={!!s.photoKey} />
                {s.photoKey && <ActionButton action={removePhoto} fields={{ studentId: s.id }} label="Remove photo" link confirm="Remove?" />}
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="QR card" />
            <div className="space-y-3 p-5 text-sm text-zinc-600">
              <p>Issued {formatDate(s.qrIssuedAt, tz)}. If a card is lost, issue a new code: the old card stops working at once.</p>
              <div className="flex flex-wrap gap-2">
                <ButtonLink href={`/school/students/${s.id}/card`} variant="secondary">Print card</ButtonLink>
                <ActionButton action={regenerateQr} fields={{ studentId: s.id }} label="Issue new QR code" confirm="Old card will stop working." />
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Status" />
            <div className="space-y-3 p-5 text-sm text-zinc-600">
              {s.status === "ACTIVE" ? (
                <>
                  <p>Left the school? Deactivate the student. All attendance history is kept.</p>
                  <ActionButton action={setStudentStatus} fields={{ studentId: s.id, status: "INACTIVE" }} label="Deactivate" variant="danger" confirm="Deactivate this student?" />
                </>
              ) : (
                <ActionButton action={setStudentStatus} fields={{ studentId: s.id, status: "ACTIVE" }} label="Reactivate" variant="success" />
              )}
              <div className="border-t border-zinc-100 pt-3">
                {hasHistory ? (
                  <p className="text-xs text-zinc-500">This student has attendance records, so they can only be deactivated, not deleted.</p>
                ) : (
                  <ActionButton action={deleteStudent} fields={{ studentId: s.id }} label="Delete permanently" variant="danger" link confirm="Delete for good? This cannot be undone." />
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
