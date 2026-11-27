import type { SubscriptionStatus } from "@/generated/prisma/client";
import { effectiveStatus, daysLeft } from "@/lib/billing";
import { formatBytes } from "@/lib/format";
import { Badge } from "@/components/ui";
import { Meter } from "@/components/motion/motion-ui";
import type { StorageStatus } from "@/lib/storage";

/** Subscription status, treating overdue ones as expired. */
export function SubscriptionBadge({ sub }: { sub: { status: SubscriptionStatus; endsAt: Date } }) {
  const s = effectiveStatus(sub);
  if (s === "ACTIVE") {
    const left = daysLeft(sub.endsAt);
    return left <= 14 ? <Badge tone="amber" dot>Active · {left} day{left === 1 ? "" : "s"} left</Badge> : <Badge tone="green" dot>Active</Badge>;
  }
  if (s === "TRIAL") return <Badge tone="blue" dot>Trial · {daysLeft(sub.endsAt)} days left</Badge>;
  if (s === "EXPIRED") return <Badge tone="red" dot>Expired</Badge>;
  return <Badge>Cancelled</Badge>;
}

/** Storage usage bar: green, amber from 80 %, red when full. */
export function StorageMeter({ status, compact }: { status: StorageStatus; compact?: boolean }) {
  const pct = status.percent ?? 0;
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium text-slate-500">
          <span className="text-lg font-extrabold tracking-tight text-slate-900">{formatBytes(status.total)}</span> of{" "}
          {status.quota.limit === null ? "—" : formatBytes(status.quota.limit)}
        </span>
        {status.percent !== null && <span className="text-sm font-extrabold tabular-nums text-slate-700">{status.percent}%</span>}
      </div>
      <Meter percent={pct} tone={status.level === "full" ? "full" : status.level === "warning" ? "warning" : "ok"} label="Storage used" />
      {!compact && (
        <p className="text-xs text-slate-500">
          Students {formatBytes(status.students)} · Attendance {formatBytes(status.attendance)} · Photos {formatBytes(status.photos)}
          {status.quota.source === "custom" && " · custom quota"}
        </p>
      )}
    </div>
  );
}
