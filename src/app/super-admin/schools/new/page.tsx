import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireSuperAdmin } from "@/lib/auth/dal";
import { TIME_ZONES, utcOffsetLabel } from "@/lib/timezones";
import { getPlatformSettings } from "@/lib/settings";
import { PageSkeleton } from "@/components/page-skeleton";
import { PageHeader } from "@/components/ui";
import { CreateSchoolForm } from "./create-school-form";

export const metadata: Metadata = { title: "New school" };

export default function NewSchoolPage() {
  return (
    <>
      <PageHeader
        title="New school"
        description={
          <>
            <Link href="/super-admin/schools" className="font-semibold text-blue-700 transition-colors hover:text-blue-800">
              Schools
            </Link>{" "}
            / New
          </>
        }
      />
      <Suspense fallback={<PageSkeleton />}>
        <Content />
      </Suspense>
    </>
  );
}

async function Content() {
  await requireSuperAdmin();
  const zones = TIME_ZONES.map((z) => ({ value: z, label: `${z.replaceAll("_", " ")} (${utcOffsetLabel(z)})` }));
  const { defaultTimezone } = await getPlatformSettings();
  return <CreateSchoolForm timeZones={zones} defaultTimezone={defaultTimezone} />;
}
