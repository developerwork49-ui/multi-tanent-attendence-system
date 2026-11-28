import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireSchoolAdmin } from "@/lib/auth/dal";
import { schoolDb } from "@/lib/db";
import { percent } from "@/lib/format";
import { saveUsageIfStale, storageStatus } from "@/lib/storage";
import { isCurrent } from "@/lib/billing";
import { addDays, dateOnlyLabel, dateOnlyToDb, dbToDateOnly, timeInZone, todayInZone, weekday } from "@/lib/dates";
import { PageSkeleton } from "@/components/page-skeleton";
import { StudentPhoto } from "@/components/student-photo";
import { StorageMeter, SubscriptionBadge } from "@/components/billing-ui";
import { StorageNotice } from "@/components/storage-notice";
import { ButtonLink, Card, CardHeader, EmptyState, MoreLink, PageHeader, Stat, StatGrid, formatDate, rowLink, BarChart } from "@/components/ui";

export const metadata: Metadata = { title: "School dashboard" };

export default function SchoolHome() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Dashboard />
    </Suspense>
  );
}

async function Dashboard() {
  // Every component that shows protected data checks the session itself.
  const user = await requireSchoolAdmin();
  const tz = user.school.timezone;
  const today = todayInZone(tz);
  const weekStart = addDays(today, -6);

  const d = await schoolDb(user, async (tx) => {
    const [active, inactive, classes, todayRows, week, recent, storage, subscription, cached] = await Promise.all([
      tx.student.count({ where: { status: "ACTIVE" } }),
      tx.student.count({ where: { status: "INACTIVE" } }),
      tx.classGroup.count({ where: { isActive: true } }),
      tx.attendance.groupBy({ by: ["status"], where: { date: dateOnlyToDb(today) }, _count: { _all: true } }),
      tx.attendance.groupBy({
        by: ["date"],
        where: { status: "PRESENT", date: { gte: dateOnlyToDb(weekStart), lte: dateOnlyToDb(today) } },
        _count: { _all: true },
      }),
      tx.attendance.findMany({
        where: { date: dateOnlyToDb(today), status: "PRESENT" },
        orderBy: { markedAt: "desc" },
        take: 8,
        select: {
          markedAt: true,
          source: true,
          student: { select: { id: true, fullName: true, photoKey: true, classGroup: { select: { name: true } } } },
        },
      }),
      storageStatus(tx, user.school.id),
      tx.subscription.findFirst({
        where: { status: { in: ["ACTIVE", "TRIAL"] } },
        include: { plan: { select: { name: true } } },
      }),
      tx.school.findUnique({ where: { id: user.school.id }, select: { storageCalculatedAt: true } }),
    ]);
    return { active, inactive, classes, todayRows, week, recent, storage, subscription, cached };
  });
  // Keep the Super Admin's storage overview fresh (attendance grows every day).
  await saveUsageIfStale(user.school.id, d.cached?.storageCalculatedAt ?? null, d.storage.total);

  const present = d.todayRows.find((r) => r.status === "PRESENT")?._count._all ?? 0;
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const perDay = new Map(d.week.map((w) => [dbToDateOnly(w.date), w._count._all]));
  const max = Math.max(1, d.active, ...perDay.values());
  const sub = d.subscription && isCurrent(d.subscription) ? d.subscription : null;

  const bars = days.map((day) => ({
    key: day,
    label: new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone: "UTC" }).format(dateOnlyToDb(day)),
    value: perDay.get(day) ?? 0,
    highlight: day === today,
    muted: weekday(day) === 0 || weekday(day) === 6,
  }));
  const weekTotal = bars.reduce((n, b) => n + b.value, 0);

  return (
    <>
      <PageHeader
        eyebrow={dateOnlyLabel(today)}
        title={`Welcome, ${user.fullName.split(" ")[0]}`}
        actions={
          <>
            <ButtonLink href="/school/students/new" variant="secondary">
              Add student
            </ButtonLink>
            <ButtonLink href="/school/scan">Scan attendance</ButtonLink>
          </>
        }
      />

      <div className="space-y-6">
        <StorageNotice status={d.storage} />

        <StatGrid cols="grid-cols-2 lg:grid-cols-4">
          <Stat label="Present today" value={present.toLocaleString("en-US")} hint={`${percent(present, d.active)}% of active students`} tone="good" />
          <Stat label="Not yet scanned" value={Math.max(0, d.active - present).toLocaleString("en-US")} tone="warning" />
          <Stat label="Active students" value={d.active.toLocaleString("en-US")} hint={d.inactive ? `${d.inactive} inactive` : undefined} />
          <Stat label="Classes" value={d.classes} />
        </StatGrid>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="flex flex-col lg:col-span-2">
            <CardHeader title="Present in the last 7 days" actions={<MoreLink href="/school/attendance">Open register</MoreLink>} />
            <div className="flex flex-1 flex-col px-5 pb-5 pt-4">
              <p className="mb-3 text-sm text-zinc-500">
                <span className="font-semibold tabular-nums text-zinc-950">{weekTotal.toLocaleString("en-US")}</span> check-ins this week
              </p>
              <div className="flex-1">
                <BarChart bars={bars} max={max} ariaLabel="Students present per day for the last 7 days" />
              </div>
            </div>
          </Card>

          <div className="flex flex-col gap-6">
            <Card>
              <CardHeader title="Storage" />
              <div className="p-5">
                {d.storage.quota.limit === null ? <p className="text-sm text-zinc-500">No storage plan yet.</p> : <StorageMeter status={d.storage} />}
              </div>
            </Card>
            <Card className="flex-1">
              <CardHeader title="Subscription" />
              <div className="space-y-2 p-5 text-sm">
                {sub ? (
                  <>
                    <p className="text-base font-semibold text-zinc-950">{sub.plan.name}</p>
                    <SubscriptionBadge sub={sub} />
                    <p className="text-zinc-500">Valid until {formatDate(sub.endsAt, tz)}</p>
                  </>
                ) : (
                  <p className="text-zinc-500">No active subscription. Contact the platform administrator.</p>
                )}
              </div>
            </Card>
          </div>
        </div>

        <Card>
          <CardHeader title="Latest arrivals today" actions={<MoreLink href="/school/scan">Scan</MoreLink>} />
          {d.recent.length === 0 ? (
            <EmptyState>No one has been marked present yet today.</EmptyState>
          ) : (
            <ul className="grid divide-y divide-zinc-100 sm:grid-cols-2 sm:divide-y-0">
              {d.recent.map((r) => (
                <li key={r.student.id} className="flex items-center gap-3 px-5 py-2.5 text-sm">
                  <StudentPhoto student={r.student} size={32} />
                  <div className="min-w-0 flex-1">
                    <Link href={`/school/students/${r.student.id}`} className={`block truncate ${rowLink}`}>
                      {r.student.fullName}
                    </Link>
                    <span className="text-xs text-zinc-500">{r.student.classGroup?.name ?? "No class"}</span>
                  </div>
                  <span className="shrink-0 text-xs tabular-nums text-zinc-500">
                    {r.source === "QR_SCAN" ? "QR" : "By hand"} · {timeInZone(r.markedAt, tz)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
