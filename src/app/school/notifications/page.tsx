import type { Metadata } from "next";
import { Suspense } from "react";
import { requireSchoolAdmin } from "@/lib/auth/dal";
import { schoolDb } from "@/lib/db";
import { inbox } from "@/lib/notifications";
import { getPlatformSettings } from "@/lib/settings";
import { storageStatus } from "@/lib/storage";
import { daysLeft, isCurrent } from "@/lib/billing";
import { formatBytes } from "@/lib/format";
import { ActionButton } from "@/components/action-button";
import { PageSkeleton } from "@/components/page-skeleton";
import { Badge, Card, CardHeader, EmptyState, PageHeader, formatDate, formatDateTime, type Tone } from "@/components/ui";
import { markAllNotificationsRead, markNotificationRead } from "./actions";

export const metadata: Metadata = { title: "Notifications" };

export default function NotificationsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Content />
    </Suspense>
  );
}

type Alert = { tone: Tone; title: string; detail: string };

async function Content() {
  const user = await requireSchoolAdmin();
  const tz = user.school.timezone;
  const [{ messages, storage, sub }, settings] = await Promise.all([
    schoolDb(user, async (tx) => {
      const [messages, storage, sub] = await Promise.all([
        inbox(tx, user.id),
        storageStatus(tx, user.school.id),
        tx.subscription.findFirst({
          where: { status: { in: ["ACTIVE", "TRIAL"] } },
          orderBy: { endsAt: "desc" },
          select: { status: true, startsAt: true, endsAt: true, plan: { select: { name: true } } },
        }),
      ]);
      return { messages, storage, sub };
    }),
    getPlatformSettings(),
  ]);

  // Automatic account alerts, worked out fresh on every visit.
  const alerts: Alert[] = [];
  const current = sub && isCurrent(sub) ? sub : null;
  if (!current) {
    alerts.push({ tone: "red", title: "No active subscription", detail: "Adding students, imports and photos is paused. Attendance still works." });
  } else {
    const left = daysLeft(current.endsAt);
    if (left <= 14)
      alerts.push({ tone: "amber", title: `Subscription ends in ${left} day${left === 1 ? "" : "s"}`, detail: `${current.plan.name} — valid until ${formatDate(current.endsAt, tz)}.` });
  }
  if (storage.level === "full")
    alerts.push({ tone: "red", title: "Storage is full", detail: "New students, imports and photos are blocked. Attendance still works." });
  else if (storage.level === "warning")
    alerts.push({ tone: "amber", title: `Storage is ${storage.percent}% full`, detail: `${formatBytes(storage.remaining)} left.` });

  const unread = messages.filter((m) => !m.readAt).length;
  const contact = [settings.supportEmail, settings.supportPhone].filter(Boolean);

  return (
    <>
      <PageHeader
        title="Notifications"
        description={unread ? `${unread} unread message${unread === 1 ? "" : "s"}` : "You're all caught up."}
        actions={unread > 0 ? <ActionButton action={markAllNotificationsRead} fields={{}} label="Mark all as read" pendingLabel="Marking…" /> : undefined}
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title="Messages from the platform" icon="inbox" />
            {messages.length === 0 ? (
              <EmptyState>No messages yet.</EmptyState>
            ) : (
              <ul className="divide-y divide-slate-100">
                {messages.map((m) => (
                  <li key={m.id} className={`px-5 py-4 ${m.readAt ? "" : "bg-blue-50/60"}`} data-unread={m.readAt ? undefined : "true"}>
                    <div className="flex flex-wrap items-center gap-2">
                      {!m.readAt && <span aria-label="Unread" className="h-2 w-2 rounded-full bg-blue-500" />}
                      <h3 className="font-semibold text-slate-900">{m.title}</h3>
                      {m.tone === "IMPORTANT" && <Badge tone="red">Important</Badge>}
                      <span className="ml-auto text-xs text-slate-500">{formatDateTime(m.createdAt, tz)}</span>
                    </div>
                    <p className="mt-1.5 whitespace-pre-line text-sm text-slate-700">{m.body}</p>
                    {!m.readAt && (
                      <div className="mt-2">
                        <ActionButton action={markNotificationRead} fields={{ notificationId: m.id }} label="Mark as read" pendingLabel="Saving…" link />
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader title="Account alerts" icon="warning" />
            {alerts.length === 0 ? (
              <EmptyState>Everything looks good.</EmptyState>
            ) : (
              <ul className="divide-y divide-slate-100">
                {alerts.map((a) => (
                  <li key={a.title} className="space-y-1 px-5 py-3">
                    <Badge tone={a.tone}>{a.title}</Badge>
                    <p className="text-sm text-slate-600">{a.detail}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card>
            <CardHeader title="Need help?" icon="info" />
            <div className="space-y-1 p-5 text-sm text-slate-600">
              {contact.length ? (
                contact.map((c) => (
                  <p key={c} className="font-medium text-slate-900">
                    {c}
                  </p>
                ))
              ) : (
                <p>Contact your platform administrator.</p>
              )}
              {settings.upgradeMessage && <p className="pt-2">{settings.upgradeMessage}</p>}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
