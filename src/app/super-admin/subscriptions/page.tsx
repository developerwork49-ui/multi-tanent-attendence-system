import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireSuperAdmin } from "@/lib/auth/dal";
import { platformDb } from "@/lib/db";
import { formatBytes, formatMoney } from "@/lib/format";
import { one, pageParam, withQuery } from "@/lib/params";
import { PLATFORM_TIME_ZONE } from "@/lib/platform";
import type { Prisma } from "@/generated/prisma/client";
import { PageSkeleton } from "@/components/page-skeleton";
import { SubscriptionBadge } from "@/components/billing-ui";
import { Alert, Button, Card, EmptyState, filterBar, formatDate, inputClass, PageHeader, Pagination, td, th, theadRow, inputBase } from "@/components/ui";

export const metadata: Metadata = { title: "Subscriptions" };

const PAGE_SIZE = 25;
const FILTERS = {
  current: "Current (active + trial)",
  expiring: "Ending within 14 days",
  expired: "Expired",
  all: "All",
} as const;
type Filter = keyof typeof FILTERS;

export default function SubscriptionsPage({ searchParams }: PageProps<"/super-admin/subscriptions">) {
  return (
    <>
      <PageHeader title="Subscriptions" description="Which school is on which plan, and until when." />
      <Suspense fallback={<PageSkeleton />}>
        <List searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function List({ searchParams }: { searchParams: PageProps<"/super-admin/subscriptions">["searchParams"] }) {
  const user = await requireSuperAdmin();
  const sp = await searchParams;
  const f = one(sp.show);
  const show: Filter = f in FILTERS ? (f as Filter) : "current";
  const page = pageParam(sp.page);
  const now = new Date();
  const soon = new Date(now.getTime() + 14 * 86_400_000);

  const open: Prisma.SubscriptionWhereInput = { status: { in: ["ACTIVE", "TRIAL"] } };
  const where: Prisma.SubscriptionWhereInput =
    show === "current"
      ? { ...open, endsAt: { gt: now } }
      : show === "expiring"
        ? { ...open, endsAt: { gt: now, lte: soon } }
        : show === "expired"
          ? { OR: [{ status: "EXPIRED" }, { ...open, endsAt: { lte: now } }] }
          : {};

  const [total, subs, unsubscribed] = await platformDb(user, (tx) =>
    Promise.all([
      tx.subscription.count({ where }),
      tx.subscription.findMany({
        where,
        orderBy: show === "all" ? [{ startsAt: "desc" }] : [{ endsAt: "asc" }],
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        include: { school: { select: { id: true, name: true } }, plan: { select: { name: true } } },
      }),
      tx.school.count({
        where: { status: "ACTIVE", subscriptions: { none: { ...open, endsAt: { gt: now } } }, storageQuotaOverrideBytes: null },
      }),
    ]),
  );

  return (
    <div className="space-y-4">
      {unsubscribed > 0 && (
        <Alert tone="warning" title={`${unsubscribed} school${unsubscribed === 1 ? "" : "s"} without a subscription`}>
          {unsubscribed === 1 ? "It has" : "They have"} no current plan or custom quota and cannot add students.{" "}
          <Link href="/super-admin/schools" className="font-medium text-zinc-950 underline decoration-zinc-300 underline-offset-4 hover:decoration-zinc-950">
            Open schools →
          </Link>
        </Alert>
      )}
      <Card>
        <form className={filterBar}>
          <label htmlFor="show" className="sr-only">Show</label>
          <select id="show" name="show" defaultValue={show} className={`${inputBase} w-auto`}>
            {Object.entries(FILTERS).map(([k, label]) => (
              <option key={k} value={k}>{label}</option>
            ))}
          </select>
          <Button type="submit" variant="secondary">Show</Button>
        </form>
        {subs.length === 0 ? (
          <EmptyState>No subscriptions match.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={theadRow}>
                  <th scope="col" className={th}>School</th>
                  <th scope="col" className={th}>Plan</th>
                  <th scope="col" className={th}>Status</th>
                  <th scope="col" className={th}>Period</th>
                  <th scope="col" className={th}>Price</th>
                  <th scope="col" className={th}>Storage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {subs.map((s) => (
                  <tr key={s.id}>
                    <td className={td}>
                      <Link href={`/super-admin/schools/${s.school.id}`} className="font-medium text-zinc-900 transition-colors hover:underline underline-offset-4">
                        {s.school.name}
                      </Link>
                    </td>
                    <td className={td}>{s.plan.name}</td>
                    <td className={td}><SubscriptionBadge sub={s} /></td>
                    <td className={`${td} whitespace-nowrap text-zinc-600`}>
                      {formatDate(s.startsAt, PLATFORM_TIME_ZONE)} → {formatDate(s.endsAt, PLATFORM_TIME_ZONE)}
                    </td>
                    <td className={`${td} whitespace-nowrap`}>{formatMoney(s.priceMinor, s.currency)}</td>
                    <td className={`${td} whitespace-nowrap`}>{formatBytes(s.storageLimitBytes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={page} pageSize={PAGE_SIZE} total={total} noun="subscriptions" href={(p) => withQuery("/super-admin/subscriptions", { show, page: p })} />
      </Card>
    </div>
  );
}
