import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requireSuperAdmin } from "@/lib/auth/dal";
import { platformDb } from "@/lib/db";
import { toId } from "@/lib/form";
import { formatBytes } from "@/lib/format";
import { TIME_ZONES, utcOffsetLabel } from "@/lib/timezones";
import { MB } from "@/lib/validation/school";
import { PageSkeleton } from "@/components/page-skeleton";
import { PageHeader } from "@/components/ui";
import { EditSchoolForm } from "./edit-school-form";

export const metadata: Metadata = { title: "Edit school" };

export default function EditSchoolPage(props: PageProps<"/super-admin/schools/[id]/edit">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Content {...props} />
    </Suspense>
  );
}

async function Content({ params }: PageProps<"/super-admin/schools/[id]/edit">) {
  const user = await requireSuperAdmin();
  const schoolId = toId((await params).id);
  if (!schoolId) notFound();

  const school = await platformDb(user, (tx) =>
    tx.school.findUnique({
      where: { id: schoolId },
      include: { subscriptions: { where: { status: { in: ["TRIAL", "ACTIVE"] } }, select: { storageLimitBytes: true } } },
    }),
  );
  if (!school) notFound();

  const zones = TIME_ZONES.map((z) => ({ value: z, label: `${z.replaceAll("_", " ")} (${utcOffsetLabel(z)})` }));
  const plan = school.subscriptions[0];
  const initial = {
    name: school.name,
    slug: school.slug,
    timezone: school.timezone,
    contactEmail: school.contactEmail ?? "",
    contactPhone: school.contactPhone ?? "",
    address: school.address ?? "",
    quotaOverrideMb: school.storageQuotaOverrideBytes ? String(Number(school.storageQuotaOverrideBytes) / MB) : "",
  };

  return (
    <>
      <PageHeader
        title={`Edit ${school.name}`}
        description={
          <>
            <Link href="/super-admin/schools" className="font-semibold text-blue-700 transition-colors hover:text-blue-800">Schools</Link> /{" "}
            <Link href={`/super-admin/schools/${school.id}`} className="font-semibold text-blue-700 transition-colors hover:text-blue-800">{school.name}</Link> / Edit
          </>
        }
      />
      <EditSchoolForm
        schoolId={school.id}
        initial={initial}
        timeZones={zones}
        planLimitLabel={plan ? formatBytes(plan.storageLimitBytes) : "no active subscription"}
      />
    </>
  );
}
