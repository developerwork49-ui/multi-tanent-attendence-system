import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireSuperAdmin } from "@/lib/auth/dal";
import { platformDb } from "@/lib/db";
import { PLATFORM_TIME_ZONE } from "@/lib/platform";
import { PageSkeleton } from "@/components/page-skeleton";
import { Badge, ButtonLink, Card, CardHeader, EmptyState, MoreLink, PageHeader, Stat, StatGrid, StatusBadge, formatDate, formatDateTime, type Tone } from "@/components/ui";
import { icons } from "@/components/icons";
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
        actions={
          <ButtonLink href="/super-admin/schools/new">
            <icons.plus width={16} height={16} strokeWidth={2.4} /> New school
          </ButtonLink>
        }
      />

      <StatGrid className="grid-cols-2 lg:grid-cols-4">
        <Stat label="Schools" value={totalSchools.toLocaleString("en-US")} hint={`${data.active} active · ${data.inactive} inactive`} icon="school" tone="gold" />
        <Stat label="Active students" value={data.students.toLocaleString("en-US")} icon="students" tone="mint" />
        <Stat label="School Admins" value={data.admins.toLocaleString("en-US")} icon="userCheck" tone="slate" />
        <Stat
          label="Needs attention"
          value={data.attention.length}
          hint={urgent ? `${urgent} urgent` : "All clear"}
          icon="warning"
          tone={urgent ? "red" : data.attention.length ? "amber" : "mint"}
        />
      </StatGrid>

      {data.attention.length > 0 && (
        <Card className="mt-6">
          <CardHeader title="Needs attention" icon="warning" />
          <ul className="divide-y divide-slate-100">
            {data.attention.slice(0, 10).map((item) => (
              <li key={`${item.schoolId}-${item.kind}`} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm transition-colors hover:bg-[rgb(255_255_255/0.03)] sm:px-6">
                <Badge tone={item.tone} dot>
                  {item.label}
                </Badge>
                <Link href={`/super-admin/schools/${item.schoolId}`} className="font-bold text-slate-900 hover:text-blue-700">
                  {item.schoolName}
                </Link>
                <span className="text-slate-500">{item.detail}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="mt-6 grid grid-cols-1 items-start gap-6 lg:grid-cols-5">
        <div className="flex flex-col gap-6 lg:col-span-2">
        <Card>
          <CardHeader title="Newest schools" icon="school" actions={<MoreLink href="/super-admin/schools">View all</MoreLink>} />
          {data.recentSchools.length === 0 ? (
            <EmptyState icon="school">
              No schools yet.{" "}
              <Link href="/super-admin/schools/new" className="font-semibold text-blue-700">
                Create the first one
              </Link>
            </EmptyState>
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.recentSchools.map((s) => (
                <li key={s.id} className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-[rgb(255_255_255/0.03)] sm:px-6">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-sm font-black text-blue-700 ring-1 ring-blue-300/50">
                    {s.name.trim().charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <Link href={`/super-admin/schools/${s.id}`} className="block truncate font-bold text-slate-900 hover:text-blue-700">
                      {s.name}
                    </Link>
                    <p className="text-xs text-slate-500">
                      {s._count.students.toLocaleString("en-US")} students · added {formatDate(s.createdAt, PLATFORM_TIME_ZONE)}
                    </p>
                  </div>
                  <StatusBadge status={s.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="Quick actions" icon="plus" />
          <div className="grid grid-cols-2 gap-3 p-4 sm:p-5">
            {(
              [
                ["/super-admin/schools/new", "New school", "school"],
                ["/super-admin/plans/new", "New plan", "plans"],
                ["/super-admin/notifications", "Send message", "bell"],
                ["/super-admin/settings", "Settings", "settings"],
              ] as const
            ).map(([href, label, icon]) => {
              const Icon = icons[icon];
              return (
                <Link
                  key={href}
                  href={href}
                  className="group flex items-center gap-3 rounded-2xl border border-line bg-[rgb(255_255_255/0.025)] p-3 text-sm font-bold text-slate-800 transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-800"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-500 ring-1 ring-blue-300/50 transition-colors group-hover:bg-metal-gold group-hover:text-canvas">
                    <Icon width={17} height={17} strokeWidth={2.1} />
                  </span>
                  {label}
                </Link>
              );
            })}
          </div>
        </Card>
        </div>

        <Card className="lg:col-span-3">
          <CardHeader title="Recent activity" icon="pulse" />
          {data.activity.length === 0 ? (
            <EmptyState icon="pulse">No activity yet.</EmptyState>
          ) : (
            <ol className="relative px-5 py-4 sm:px-6">
              <span aria-hidden className="absolute bottom-6 left-[1.85rem] top-6 w-px bg-gradient-to-b from-[rgb(229_192_123/0.5)] via-[rgb(255_255_255/0.08)] to-transparent sm:left-[2.1rem]" />
              {data.activity.map((a, i) => (
                <li key={a.id.toString()} className="relative flex gap-4 py-2 text-sm">
                  <span
                    aria-hidden
                    className={`relative mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ring-4 ring-canvas ${i === 0 ? "bg-metal-gold shadow-[0_0_10px_rgb(229_192_123/0.9)]" : "bg-slate-400"}`}
                  />
                  <div className="min-w-0 flex-1 sm:flex sm:items-baseline sm:justify-between sm:gap-4">
                    <p className="font-semibold text-slate-900">
                      {ACTION_LABELS[a.action] ?? a.action}
                      {a.school && (
                        <>
                          <span className="text-slate-400"> · </span>
                          <Link href={`/super-admin/schools/${a.school.id}`} className="text-blue-700 hover:text-blue-800">
                            {a.school.name}
                          </Link>
                        </>
                      )}
                    </p>
                    <p className="shrink-0 text-xs text-slate-500">
                      {formatDateTime(a.createdAt, PLATFORM_TIME_ZONE)}
                      {a.actor && ` · ${a.actor.fullName}`}
                    </p>
                  </div>
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
