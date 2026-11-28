import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireSuperAdmin } from "@/lib/auth/dal";
import { platformDb } from "@/lib/db";
import { formatBytes } from "@/lib/format";
import { isCurrent } from "@/lib/billing";
import { describe } from "@/lib/storage";
import { PLATFORM_TIME_ZONE } from "@/lib/platform";
import { PageSkeleton } from "@/components/page-skeleton";
import { ActionButton } from "@/components/action-button";
import { StorageMeter } from "@/components/billing-ui";
import { Badge, Card, EmptyState, formatDateTime, PageHeader, Stat, td, th, theadRow, StatGrid } from "@/components/ui";
import { recalculateAllStorage } from "./actions";

export const metadata: Metadata = { title: "Storage" };

export default function StoragePage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Content />
    </Suspense>
  );
}

async function Content() {
  const user = await requireSuperAdmin();
  const schools = await platformDb(user, (tx) =>
    tx.school.findMany({
      orderBy: { storageUsedBytes: "desc" },
      select: {
        id: true,
        name: true,
        status: true,
        storageUsedBytes: true,
        storageCalculatedAt: true,
        storageQuotaOverrideBytes: true,
        subscriptions: {
          where: { status: { in: ["ACTIVE", "TRIAL"] } },
          select: { status: true, startsAt: true, endsAt: true, storageLimitBytes: true },
        },
      },
      take: 500,
    }),
  );

  const rows = schools.map((s) => {
    const sub = s.subscriptions.find((x) => isCurrent(x));
    const limit = s.storageQuotaOverrideBytes ?? sub?.storageLimitBytes ?? null;
    const total = Number(s.storageUsedBytes);
    const status = describe(
      { total, students: 0, attendance: 0, photos: 0, other: 0 },
      { limit: limit === null ? null : Number(limit), source: s.storageQuotaOverrideBytes ? "custom" : limit ? "plan" : "none" },
    );
    return { ...s, status };
  });
  const used = rows.reduce((a, r) => a + r.status.total, 0);
  const warn = rows.filter((r) => r.status.level === "warning").length;
  const full = rows.filter((r) => r.status.level === "full").length;
  const oldest = rows.reduce<Date | null>((a, r) => (!r.storageCalculatedAt ? a : !a || r.storageCalculatedAt < a ? r.storageCalculatedAt : a), null);

  return (
    <>
      <PageHeader
        title="Storage"
        eyebrow="Platform"
        description="Space used by each school against its quota."
        actions={<ActionButton action={recalculateAllStorage} fields={{}} label="Measure all now" pendingLabel="Measuring…" variant="primary" />}
      />
      <StatGrid className="mb-6" cols="grid-cols-2 lg:grid-cols-4">
        <Stat label="Total used" value={formatBytes(used)} />
        <Stat label="Near limit (80%+)" value={warn} tone={warn ? "warning" : "neutral"} />
        <Stat label="Schools full" value={full} tone={full ? "bad" : "neutral"} />
        <Stat label="Last measured" value={<span className="text-base font-medium">{oldest ? formatDateTime(oldest, PLATFORM_TIME_ZONE) : "—"}</span>} />
      </StatGrid>
      <Card>
        {rows.length === 0 ? (
          <EmptyState>No schools yet.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={theadRow}>
                  <th scope="col" className={th}>School</th>
                  <th scope="col" className={`${th} w-72`}>Usage</th>
                  <th scope="col" className={th}>Quota from</th>
                  <th scope="col" className={th}>Measured</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className={td}>
                      <Link href={`/super-admin/schools/${r.id}`} className="font-medium text-zinc-900 transition-colors hover:underline underline-offset-4">{r.name}</Link>
                      {r.status.level === "full" && <span className="ml-2"><Badge tone="red">Full</Badge></span>}
                      {r.status.level === "warning" && <span className="ml-2"><Badge tone="amber">Near limit</Badge></span>}
                    </td>
                    <td className={td}>
                      {r.status.quota.limit === null ? (
                        <span className="text-zinc-600">{formatBytes(r.status.total)} · <span className="text-amber-700">no quota</span></span>
                      ) : (
                        <StorageMeter status={r.status} compact />
                      )}
                    </td>
                    <td className={`${td} text-zinc-600`}>
                      {r.status.quota.source === "custom" ? "Custom quota" : r.status.quota.source === "plan" ? "Plan" : "—"}
                    </td>
                    <td className={`${td} whitespace-nowrap text-zinc-600`}>
                      {r.storageCalculatedAt ? formatDateTime(r.storageCalculatedAt, PLATFORM_TIME_ZONE) : "Never"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
