import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireSuperAdmin } from "@/lib/auth/dal";
import { platformDb } from "@/lib/db";
import { formatBytes, formatMoney } from "@/lib/format";
import { PERIOD_LABEL } from "@/lib/billing";
import { PageSkeleton } from "@/components/page-skeleton";
import { ActionButton } from "@/components/action-button";
import { Alert, Badge, ButtonLink, Card, EmptyState, PageHeader, td, th, theadRow } from "@/components/ui";
import { setPlanActive } from "../billing/actions";

export const metadata: Metadata = { title: "Plans" };

export default function PlansPage({ searchParams }: PageProps<"/super-admin/plans">) {
  return (
    <>
      <PageHeader
        title="Plans"
        description="Subscription plans you offer to schools. Each plan sets a storage limit and a price."
        actions={<ButtonLink href="/super-admin/plans/new">+ New plan</ButtonLink>}
      />
      <Suspense fallback={<PageSkeleton />}>
        <PlansList searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function PlansList({ searchParams }: { searchParams: PageProps<"/super-admin/plans">["searchParams"] }) {
  const user = await requireSuperAdmin();
  const saved = (await searchParams).saved === "1";
  const plans = await platformDb(user, (tx) =>
    tx.plan.findMany({
      orderBy: [{ isActive: "desc" }, { storageLimitBytes: "asc" }, { name: "asc" }],
      include: { _count: { select: { subscriptions: { where: { status: { in: ["ACTIVE", "TRIAL"] } } } } } },
    }),
  );

  return (
    <div className="space-y-4">
      {saved && <Alert tone="success">Plan saved.</Alert>}
      <Card>
        {plans.length === 0 ? (
          <EmptyState>
            No plans yet.{" "}
            <Link href="/super-admin/plans/new" className="font-medium text-zinc-950 underline decoration-zinc-300 underline-offset-4 hover:decoration-zinc-950">
              Create the first plan
            </Link>{" "}
            so you can put schools on a subscription.
          </EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={theadRow}>
                  <th scope="col" className={th}>Plan</th>
                  <th scope="col" className={th}>Storage</th>
                  <th scope="col" className={th}>Price</th>
                  <th scope="col" className={`${th} text-right`}>Current schools</th>
                  <th scope="col" className={th}>Status</th>
                  <th scope="col" className={th}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {plans.map((p) => (
                  <tr key={p.id}>
                    <td className={td}>
                      <Link href={`/super-admin/plans/${p.id}`} className="font-medium text-zinc-900 transition-colors hover:underline underline-offset-4">
                        {p.name}
                      </Link>
                      {p.description && <div className="max-w-xs truncate text-xs text-zinc-500">{p.description}</div>}
                    </td>
                    <td className={`${td} whitespace-nowrap`}>{formatBytes(p.storageLimitBytes)}</td>
                    <td className={`${td} whitespace-nowrap`}>
                      {formatMoney(p.priceMinor, p.currency)} <span className="text-zinc-500">/ {PERIOD_LABEL[p.billingPeriod].toLowerCase()}</span>
                    </td>
                    <td className={`${td} text-right tabular-nums`}>{p._count.subscriptions}</td>
                    <td className={td}>{p.isActive ? <Badge tone="green">Available</Badge> : <Badge>Retired</Badge>}</td>
                    <td className={td}>
                      <div className="flex flex-wrap items-center gap-3">
                        <Link href={`/super-admin/plans/${p.id}`} className="text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-950">
                          Edit
                        </Link>
                        <ActionButton
                          action={setPlanActive}
                          fields={{ planId: p.id, active: String(!p.isActive) }}
                          label={p.isActive ? "Retire" : "Make available"}
                          link
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <p className="text-xs text-zinc-500">
        Retired plans can no longer be chosen for new subscriptions. Schools already on them are not affected.
      </p>
    </div>
  );
}
