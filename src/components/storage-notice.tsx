import { formatBytes } from "@/lib/format";
import type { StorageStatus } from "@/lib/storage";
import { getPlatformSettings } from "@/lib/settings";
import { Alert } from "@/components/ui";

/** Warning banner when storage is nearly full, full, or there is no plan. Shows nothing when fine. */
export async function StorageNotice({ status }: { status: StorageStatus }) {
  if (status.level === "ok") return null;
  const settings = await getPlatformSettings();
  const contact = [settings.supportEmail, settings.supportPhone].filter(Boolean).join(" · ");
  const help = (
    <>
      {settings.upgradeMessage && <span className="mt-1 block">{settings.upgradeMessage}</span>}
      {contact && <span className="mt-1 block font-medium">Contact: {contact}</span>}
    </>
  );

  if (status.level === "none") {
    return (
      <Alert tone="warning">
        Your school has no active subscription, so new students, imports and photos can’t be added. Attendance still works.
        Please contact the platform administrator.
        {help}
      </Alert>
    );
  }
  if (status.level === "full") {
    return (
      <Alert tone="error">
        Storage is full ({formatBytes(status.total)} of {formatBytes(status.quota.limit)}). New students, imports and photos are
        blocked until space is freed or the plan is upgraded. Attendance still works.
        {help}
      </Alert>
    );
  }
  return (
    <Alert tone="warning">
      Storage is {status.percent}% full ({formatBytes(status.remaining)} left). Ask the platform administrator about a larger plan soon.
      {help}
    </Alert>
  );
}
