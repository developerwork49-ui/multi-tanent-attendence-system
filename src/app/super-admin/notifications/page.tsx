import type { Metadata } from "next";
import { Suspense } from "react";
import { requireSuperAdmin } from "@/lib/auth/dal";
import { platformDb } from "@/lib/db";
import { PLATFORM_TIME_ZONE } from "@/lib/platform";
import { ActionButton } from "@/components/action-button";
import { PageSkeleton } from "@/components/page-skeleton";
import { Badge, Card, CardHeader, EmptyState, PageHeader, formatDateTime } from "@/components/ui";
import { deleteNotification } from "./actions";
import { ComposeForm } from "./compose-form";

export const metadata: Metadata = { title: "Notifications" };

export default function SuperAdminNotificationsPage() {
  return (
    <>
      <PageHeader title="Notifications" description="Send a message to one school or to every school. School Admins see it in their panel." />
      <Suspense fallback={<PageSkeleton />}>
        <Content />
      </Suspense>
    </>
  );
}

async function Content() {
  const user = await requireSuperAdmin();
  const { schools, sent, adminsPerSchool, totalAdmins } = await platformDb(user, async (tx) => {
    const [schools, sent, admins] = await Promise.all([
      tx.school.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
      tx.notification.findMany({
        orderBy: { createdAt: "desc" },
        take: 100,
        select: {
          id: true,
          title: true,
          body: true,
          tone: true,
          createdAt: true,
          school: { select: { id: true, name: true } },
          _count: { select: { reads: true } },
        },
      }),
      tx.user.groupBy({ by: ["schoolId"], where: { role: "SCHOOL_ADMIN", isActive: true }, _count: { _all: true } }),
    ]);
    const adminsPerSchool = new Map(admins.map((a) => [a.schoolId, a._count._all]));
    const totalAdmins = admins.reduce((sum, a) => sum + a._count._all, 0);
    return { schools, sent, adminsPerSchool, totalAdmins };
  });

  return (
    <div className="grid gap-6 xl:grid-cols-5">
      <Card className="xl:col-span-2 self-start">
        <CardHeader title="New message" icon="bell" />
        <ComposeForm schools={schools} />
      </Card>
      <Card className="xl:col-span-3">
        <CardHeader title={`Sent (${sent.length})`} />
        {sent.length === 0 ? (
          <EmptyState>No messages sent yet.</EmptyState>
        ) : (
          <ul className="divide-y divide-slate-100">
            {sent.map((n) => {
              const audience = n.school ? (adminsPerSchool.get(n.school.id) ?? 0) : totalAdmins;
              return (
                <li key={n.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-slate-900">{n.title}</h3>
                    {n.tone === "IMPORTANT" && <Badge tone="red">Important</Badge>}
                    <Badge tone={n.school ? "blue" : "green"}>{n.school ? n.school.name : "All schools"}</Badge>
                    <span className="ml-auto text-xs text-slate-500">{formatDateTime(n.createdAt, PLATFORM_TIME_ZONE)}</span>
                  </div>
                  <p className="mt-1.5 line-clamp-3 whitespace-pre-line text-sm text-slate-700">{n.body}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-slate-500">
                    <span>
                      Read by {n._count.reads} of {audience} admin{audience === 1 ? "" : "s"}
                    </span>
                    <ActionButton action={deleteNotification} fields={{ notificationId: n.id }} label="Delete" confirm="Delete this message for everyone?" variant="danger" link />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
