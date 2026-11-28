import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireSuperAdmin } from "@/lib/auth/dal";
import { platformDb } from "@/lib/db";
import { PLATFORM_TIME_ZONE } from "@/lib/platform";
import { PageSkeleton } from "@/components/page-skeleton";
import { Badge, ButtonLink, Card, CardHeader, EmptyState, MoreLink, PageHeader, Stat, StatGrid, StatusBadge, formatDate, formatDateTime, linkClass, rowLink, type Tone } from "@/components/ui";
import type { Tx } from "@/lib/db";
import { daysLeft, isCurrent } from "@/lib/billing";
import { formatBytes } from "@/lib/format";
import { WARN_AT } from "@/lib/storage";

export const metadata: Metadata = { title: "Dashboard" };

export default function SuperAdminDashboard() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Dashboard />
    </Suspense>
  );
}

/** Readable names for audit actions shown in "Recent activity". */
const ACTION_LABELS: Record<string, string> = {
  "school.create": "School created",
  "school.activate": "School activated",
  "school.deactivate": "School deactivated",
  "user.create_school_admin": "School Admin created",
  "user.create_super_admin": "Super Admin created",
  "auth.login": "Signed in",
  "auth.logout": "Signed out",
  "auth.login_failed": "Failed sign-in",
  "auth.login_blocked": "Blocked sign-in (disabled)",
  "auth.locked": "Account locked (too many attempts)",
  "school.update": "School details edited",
  "user.reset_password": "Admin password reset",
  "user.enable": "Admin enabled",
  "user.disable": "Admin disabled",
  "user.change_own_password": "Password changed",
  "plan.create": "Plan created",
  "plan.update": "Plan edited",
  "plan.activate": "Plan made available",
  "plan.deactivate": "Plan retired",
  "subscription.create": "Subscription started",
  "subscription.cancel": "Subscription ended",
  "subscription.extend": "Subscription extended",
  "payment.record": "Payment recorded",
  "student.create": "Student added",
  "student.update": "Student edited",
  "student.deactivate": "Student deactivated",
  "student.activate": "Student reactivated",
  "student.delete": "Student deleted",
  "student.import": "Students imported",
  "student.regenerate_qr": "QR card replaced",
  "student.photo": "Student photo changed",
  "attendance.update": "Attendance changed by hand",
  "settings.update": "Platform settings changed",
  "notification.send": "Notification sent",
  "notification.delete": "Notification deleted",
};

async function Dashboard() {
  const user = await requireSuperAdmin();

  const data = await platformDb(user, async (tx) => {
    const [byStatus, students, admins, recentSchools, activity] = await Promise.all([
      tx.school.groupBy({ by: ["status"], _count: { _all: true } }),
      tx.student.count({ where: { status: "ACTIVE" } }),
      tx.user.count({ where: { role: "SCHOOL_ADMIN", isActive: true } }),
      tx.school.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, name: true, status: true, createdAt: true, _count: { select: { students: true } } },
      }),
      tx.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        select: {
          id: true,
          action: true,
          createdAt: true,
          actor: { select: { fullName: true } },
          school: { select: { id: true, name: true } },
        },
      }),
    ]);
    const count = (s: "ACTIVE" | "INACTIVE") => byStatus.find((r) => r.status === s)?._count._all ?? 0;
    const attention = await needsAttention(tx);
    return { active: count("ACTIVE"), inactive: count("INACTIVE"), students, admins, recentSchools, activity, attention };
  });

  const totalSchools = data.active + data.inactive;
  const urgent = data.attention.filter((a) => a.tone === "red").length;

  return (
    <>
      <PageHeader
        eyebrow={`Welcome back, ${user.fullName.split(" ")[0]}`}
        title="Dashboard"
        actions={<ButtonLink href="/super-admin/schools/new">New school</ButtonLink>}
      />

      <StatGrid cols="grid-cols-2 lg:grid-cols-4">
        <Stat label="Schools" value={totalSchools.toLocaleString("en-US")} hint={`${data.active} active · ${data.inactive} inactive`} />
        <Stat label="Active students" value={data.students.toLocaleString("en-US")} />
        <Stat label="School Admins" value={data.admins.toLocaleString("en-US")} />
        <Stat
          label="Needs attention"
          value={data.attention.length}
          hint={urgent ? `${urgent} urgent` : "All clear"}
          tone={urgent ? "bad" : data.attention.length ? "warning" : "good"}
        />
      </StatGrid>

      {data.attention.length > 0 && (
        <Card className="mt-6">
          <CardHeader title="Needs attention" />
          <ul className="divide-y divide-zinc-100">
            {data.attention.slice(0, 10).map((item) => (
              <li key={`${item.schoolId}-${item.kind}`} className="flex flex-wrap items-center gap-3 px-5 py-2.5 text-sm">
                <Badge tone={item.tone} dot>
                  {item.label}
                </Badge>
                <Link href={`/super-admin/schools/${item.schoolId}`} className={rowLink}>
                  {item.schoolName}
                </Link>
                <span className="text-zinc-500">{item.detail}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="mt-6 grid grid-cols-1 items-start gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader title="Newest schools" actions={<MoreLink href="/super-admin/schools">View all</MoreLink>} />
          {data.recentSchools.length === 0 ? (
            <EmptyState>
              No schools yet.{" "}
              <Link href="/super-admin/schools/new" className={linkClass}>
                Create the first one
              </Link>
            </EmptyState>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {data.recentSchools.map((s) => (
                <li key={s.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <Link href={`/super-admin/schools/${s.id}`} className={`block truncate text-sm ${rowLink}`}>
                      {s.name}
                    </Link>
                    <p className="text-xs text-zinc-500">
                      {s._count.students.toLocaleString("en-US")} students · added {formatDate(s.createdAt, PLATFORM_TIME_ZONE)}
                    </p>
                  </div>
                  <StatusBadge status={s.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader title="Recent activity" />
          {data.activity.length === 0 ? (
            <EmptyState>No activity yet.</EmptyState>
          ) : (
            <ol className="divide-y divide-zinc-100">
              {data.activity.map((a) => (
                <li key={a.id.toString()} className="px-5 py-2.5 text-sm sm:flex sm:items-baseline sm:justify-between sm:gap-4">
                  <p className="text-zinc-950">
                    {ACTION_LABELS[a.action] ?? a.action}
                    {a.school && (
                      <>
                        <span className="text-zinc-300"> · </span>
                        <Link href={`/super-admin/schools/${a.school.id}`} className="text-zinc-600 underline-offset-4 hover:text-zinc-950 hover:underline">
                          {a.school.name}
                        </Link>
                      </>
                    )}
                  </p>
                  <p className="shrink-0 text-xs tabular-nums text-zinc-500">
                    {formatDateTime(a.createdAt, PLATFORM_TIME_ZONE)}
                    {a.actor && ` · ${a.actor.fullName}`}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>
    </>
  );
}

type Attention = { kind: string; schoolId: number; schoolName: string; label: string; detail: string; tone: Tone };

/** Active schools whose subscription is ending/ended or whose storage is (nearly) full. */
async function needsAttention(tx: Tx): Promise<Attention[]> {
  const now = new Date();
  const schools = await tx.school.findMany({
    where: { status: "ACTIVE" },
    select: {
      id: true,
      name: true,
      storageUsedBytes: true,
      storageQuotaOverrideBytes: true,
      subscriptions: {
        where: { status: { in: ["ACTIVE", "TRIAL"] } },
        select: { status: true, startsAt: true, endsAt: true, storageLimitBytes: true },
      },
    },
    take: 1000,
  });
  const out: Attention[] = [];
  for (const s of schools) {
    const sub = s.subscriptions[0];
    const current = sub && isCurrent(sub, now) ? sub : null;
    if (!current && !s.storageQuotaOverrideBytes) {
      out.push({ kind: "sub", schoolId: s.id, schoolName: s.name, label: sub ? "Subscription ended" : "No subscription", detail: "Cannot add students.", tone: "red" });
    } else if (current && daysLeft(current.endsAt, now) <= 14) {
      const left = daysLeft(current.endsAt, now);
      out.push({ kind: "sub", schoolId: s.id, schoolName: s.name, label: "Ending soon", detail: `${left} day${left === 1 ? "" : "s"} left`, tone: "amber" });
    }
    const limit = Number(s.storageQuotaOverrideBytes ?? current?.storageLimitBytes ?? 0);
    const used = Number(s.storageUsedBytes);
    if (limit > 0 && used >= limit * WARN_AT) {
      out.push({
        kind: "storage",
        schoolId: s.id,
        schoolName: s.name,
        label: used >= limit ? "Storage full" : "Storage 80%+",
        detail: `${formatBytes(used)} of ${formatBytes(limit)}`,
        tone: used >= limit ? "red" : "amber",
      });
    }
  }
  return out.sort((a, b) => (a.tone === b.tone ? 0 : a.tone === "red" ? -1 : 1));
}
