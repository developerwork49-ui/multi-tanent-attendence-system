import type { Metadata } from "next";
import { Suspense } from "react";
import { requireSuperAdmin } from "@/lib/auth/dal";
import { getPlatformSettings } from "@/lib/settings";
import { TIME_ZONES, utcOffsetLabel } from "@/lib/timezones";
import { PageSkeleton } from "@/components/page-skeleton";
import { PageHeader } from "@/components/ui";
import { SettingsForm } from "./settings-form";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Platform settings" description="Branding, support contact and defaults used across the platform." />
      <Suspense fallback={<PageSkeleton />}>
        <Content />
      </Suspense>
    </>
  );
}

async function Content() {
  await requireSuperAdmin();
  const s = await getPlatformSettings();
  const zones = TIME_ZONES.map((z) => ({ value: z, label: `${z.replaceAll("_", " ")} (${utcOffsetLabel(z)})` }));
  return (
    <SettingsForm
      timeZones={zones}
      initial={{
        platformName: s.platformName,
        supportEmail: s.supportEmail ?? "",
        supportPhone: s.supportPhone ?? "",
        upgradeMessage: s.upgradeMessage ?? "",
        defaultTimezone: s.defaultTimezone,
      }}
    />
  );
}
