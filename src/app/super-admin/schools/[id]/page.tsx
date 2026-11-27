import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requireSuperAdmin } from "@/lib/auth/dal";
import { platformDb } from "@/lib/db";
import { PLATFORM_TIME_ZONE } from "@/lib/platform";
import { utcOffsetLabel } from "@/lib/timezones";
import { PageSkeleton } from "@/components/page-skeleton";
import { Alert, Card, CardHeader, PageHeader, StatusBadge, formatDate, formatDateTime } from "@/components/ui";
import { StatusControl } from "./status-control";
import { AddAdminForm, AdminRowActions } from "./admin-controls";
import { ButtonLink } from "@/components/ui";
import { formatBytes, formatMoney } from "@/lib/format";
import { storageStatus } from "@/lib/storage";
import { PAYMENT_METHOD_LABEL, PERIOD_LABEL, isCurrent, minorToInput } from "@/lib/billing";
import { dbToDateOnly, todayInZone } from "@/lib/dates";
import { SubscriptionBadge, StorageMeter } from "@/components/billing-ui";
import { ActionButton } from "@/components/action-button";
import { AssignPlanForm, RecordPaymentForm } from "./billing-forms";
import { cancelSubscription, extendSubscription } from "../../billing/actions";

export const metadata: Metadata = { title: "School" };

export default function SchoolDetailPage(props: PageProps<"/super-admin/schools/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <SchoolDetail {...props} />
    </Suspense>
  );
}

async function SchoolDetail({ params, searchParams }: PageProps<"/super-admin/schools/[id]">) {
  const user = await requireSuperAdmin();
  const { id } = await params;
  const sp = await searchParams;
  const created = sp.created === "1";
  const saved = sp.saved === "1";

  const schoolId = /^\d{1,9}$/.test(id) ? Number(id) : NaN;
  if (!Number.isSafeInteger(schoolId)) notFound();

  const data = await platformDb(user, async (tx) => {
    const school = await tx.school.findUnique({
      where: { id: schoolId },
      include: {
        users: {
          orderBy: { createdAt: "asc" },
          select: { id: true, fullName: true, email: true, isActive: true, lastLoginAt: true, createdAt: true },
        },
        _count: { select: { students: true, classGroups: true } },
        subscriptions: {
          orderBy: [{ startsAt: "desc" }, { id: "desc" }],
          take: 6,
          include: { plan: { select: { name: true, billingPeriod: true } } },
        },
        payments: { orderBy: [{ paidOn: "desc" }, { id: "desc" }], take: 10 },
      },
    });
    if (!school) return null;
    const [plans, storage] = await Promise.all([
      tx.plan.findMany({ where: { isActive: true }, orderBy: { storageLimitBytes: "asc" } }),
      storageStatus(tx, school.id),
    ]);
    return { school, plans, storage };
  });
  if (!data) notFound();
  const { school, plans, storage } = data;
  const current = school.subscriptions.find((s) => s.status === "ACTIVE" || s.status === "TRIAL");
  const today = todayInZone(school.timezone);

  const details: [string, string][] = [
    ["Web name", school.slug],
    ["Time zone", `${school.timezone} (${utcOffsetLabel(school.timezone)})`],
    ["Contact email", school.contactEmail ?? "—"],
    ["Contact phone", school.contactPhone ?? "—"],
    ["Address", school.address ?? "—"],
    ["Custom storage quota", school.storageQuotaOverrideBytes ? formatBytes(school.storageQuotaOverrideBytes) : "None (uses plan limit)"],
    ["Added", formatDateTime(school.createdAt, PLATFORM_TIME_ZONE)],
  ];

  return (
    <>
      <PageHeader
        title={school.name}
        description={
          <>
            <Link href="/super-admin/schools" className="font-semibold text-blue-700 transition-colors hover:text-blue-800">
              Schools
            </Link>{" "}
            / {school.name}
          </>
        }
        actions={
          <>
            <StatusBadge status={school.status} />
            <ButtonLink href={`/super-admin/schools/${school.id}/edit`} variant="secondary">
              Edit details
            </ButtonLink>
          </>
        }
      />
      {saved && (
        <div className="mb-6">
          <Alert tone="success">Changes saved.</Alert>
        </div>
      )}

      {created && (
        <div className="mb-6">
          <Alert tone="success">
            School created{school.users.length > 0 ? " together with its first School Admin login" : ""}.
          </Alert>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title="Details" icon="info" />
            <dl className="divide-y divide-slate-100">
              {details.map(([label, value]) => (
                <div key={label} className="grid grid-cols-3 gap-4 px-5 py-3 text-sm">
                  <dt className="text-slate-500">{label}</dt>
                  <dd className="col-span-2 break-words text-slate-900">{value}</dd>
                </div>
              ))}
            </dl>
          </Card>

          <Card>
            <CardHeader title={`School Admins (${school.users.length})`} />
            {school.users.length === 0 ? (
              <p className="px-5 py-6 text-sm text-slate-500">No admin logins yet. Add one below.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th scope="col" className="px-5 py-2 font-medium">Name</th>
                      <th scope="col" className="px-3 py-2 font-medium">Email</th>
                      <th scope="col" className="px-3 py-2 font-medium">Status</th>
                      <th scope="col" className="px-3 py-2 font-medium">Last sign-in</th>
                      <th scope="col" className="px-5 py-2 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {school.users.map((u) => (
                      <tr key={u.id}>
                        <td className="px-5 py-3 font-medium text-slate-900">{u.fullName}</td>
                        <td className="px-3 py-3 text-slate-600">{u.email}</td>
                        <td className="px-3 py-3">
                          {u.isActive ? (
                            <span className="text-emerald-700">Active</span>
                          ) : (
                            <span className="text-slate-500">Disabled</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-slate-600">
                          {u.lastLoginAt ? formatDateTime(u.lastLoginAt, PLATFORM_TIME_ZONE) : "Never"}
                        </td>
                        <td className="px-5 py-3">
                          <AdminRowActions userId={u.id} email={u.email} isActive={u.isActive} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="border-t border-slate-100 p-5">
              <AddAdminForm schoolId={school.id} />
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="At a glance" icon="chart" />
            <dl className="grid grid-cols-2 gap-4 p-5">
              <div>
                <dt className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Students</dt>
                <dd className="mt-1 text-3xl font-black tracking-tight tabular-nums text-slate-900">{school._count.students.toLocaleString("en-US")}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Classes</dt>
                <dd className="mt-1 text-3xl font-black tracking-tight tabular-nums text-slate-900">{school._count.classGroups}</dd>
              </div>
              <div className="col-span-2">
                <dt className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Storage used</dt>
                <dd>
                  {storage.quota.limit === null ? (
                    <span className="text-sm text-slate-700">{formatBytes(storage.total)} used · no plan or custom quota</span>
                  ) : (
                    <StorageMeter status={storage} />
                  )}
                </dd>
              </div>
            </dl>
          </Card>

          <Card>
            <CardHeader title="Subscription" icon="subscriptions" />
            <div className="space-y-4 p-5">
              {current ? (
                <dl className="space-y-1 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <dt className="sr-only">Plan</dt>
                    <dd className="font-medium text-slate-900">{current.plan.name}</dd>
                    <SubscriptionBadge sub={current} />
                  </div>
                  <dd className="text-slate-600">
                    {formatMoney(current.priceMinor, current.currency)} / {PERIOD_LABEL[current.plan.billingPeriod].toLowerCase()} ·{" "}
                    {formatBytes(current.storageLimitBytes)}
                  </dd>
                  <dd className="text-slate-600">
                    {formatDate(current.startsAt, school.timezone)} → {formatDate(current.endsAt, school.timezone)}
                  </dd>
                </dl>
              ) : (
                <p className="text-sm text-slate-600">
                  No current subscription.{" "}
                  {school.storageQuotaOverrideBytes ? "The custom quota applies." : "The school cannot add students until it has a plan or a custom quota."}
                </p>
              )}
              <AssignPlanForm
                schoolId={school.id}
                today={today}
                hasCurrent={!!current}
                plans={plans.map((p) => ({
                  id: p.id,
                  label: `${p.name} — ${formatBytes(p.storageLimitBytes)}, ${formatMoney(p.priceMinor, p.currency)} / ${PERIOD_LABEL[p.billingPeriod].toLowerCase()}`,
                }))}
              />
              {current && (
                <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                  <ActionButton action={extendSubscription} fields={{ schoolId: school.id }} label="Extend one period" confirm="Extend without recording a payment?" />
                  <ActionButton action={cancelSubscription} fields={{ schoolId: school.id }} label="End subscription" variant="danger" confirm="End it now?" />
                </div>
              )}
              {school.subscriptions.filter((s) => s !== current).length > 0 && (
                <details className="border-t border-slate-100 pt-3 text-sm">
                  <summary className="cursor-pointer text-slate-600">Earlier subscriptions</summary>
                  <ul className="mt-2 space-y-1.5">
                    {school.subscriptions
                      .filter((s) => s !== current)
                      .map((s) => (
                        <li key={s.id} className="flex flex-wrap items-center gap-2 text-slate-600">
                          {s.plan.name} · {formatDate(s.startsAt, school.timezone)} → {formatDate(s.endsAt, school.timezone)}
                          <SubscriptionBadge sub={s} />
                        </li>
                      ))}
                  </ul>
                </details>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Payments" icon="payments" actions={<Link href={`/super-admin/payments?school=${school.id}`} className="text-sm font-semibold text-blue-700 transition-colors hover:text-blue-800">All</Link>} />
            <div className="space-y-4 p-5">
              {school.payments.length === 0 ? (
                <p className="text-sm text-slate-500">No payments recorded yet.</p>
              ) : (
                <ul className="divide-y divide-slate-100 text-sm">
                  {school.payments.map((p) => (
                    <li key={p.id} className="flex items-baseline justify-between gap-3 py-2">
                      <div>
                        <div className="font-medium tabular-nums text-slate-900">{formatMoney(p.amountMinor, p.currency)}</div>
                        <div className="text-xs text-slate-500">
                          {PAYMENT_METHOD_LABEL[p.method]}
                          {p.reference && ` · ${p.reference}`}
                        </div>
                      </div>
                      <span className="whitespace-nowrap text-xs text-slate-500">{dbToDateOnly(p.paidOn)}</span>
                    </li>
                  ))}
                </ul>
              )}
              <RecordPaymentForm
                schoolId={school.id}
                today={today}
                hasCurrent={!!current && isCurrent(current)}
                currency={current?.currency ?? "PKR"}
                amount={current ? minorToInput(current.priceMinor) : ""}
              />
            </div>
          </Card>

          <Card>
            <CardHeader title="Account status" />
            <div className="space-y-3 p-5">
              <p className="text-sm text-slate-600">
                {school.status === "ACTIVE"
                  ? "This school's admins can sign in and use the system."
                  : "This school is inactive. Its admins cannot sign in. All data is kept."}
              </p>
              <StatusControl schoolId={school.id} status={school.status} adminCount={school.users.length} />
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
