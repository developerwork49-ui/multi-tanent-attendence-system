import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requireSchoolAdmin } from "@/lib/auth/dal";
import { schoolDb } from "@/lib/db";
import { toId } from "@/lib/form";
import { qrSvg } from "@/lib/qr";
import { PageSkeleton } from "@/components/page-skeleton";
import { PrintButton } from "@/components/print-button";
import { StudentCard } from "@/components/student-card";
import { Alert, ButtonLink, Crumbs, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Student card" };

export default function CardPage(props: PageProps<"/school/students/[id]/card">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Content {...props} />
    </Suspense>
  );
}

async function Content({ params }: PageProps<"/school/students/[id]/card">) {
  const user = await requireSchoolAdmin();
  const id = toId((await params).id);
  if (!id) notFound();
  const s = await schoolDb(user, (tx) => tx.student.findUnique({ where: { id }, include: { classGroup: { select: { name: true } } } }));
  if (!s) notFound();
  const card = { ...s, className: s.classGroup?.name ?? null, qrSvg: await qrSvg(s.qrToken) };

  return (
    <>
      <div className="print:hidden">
        <PageHeader
          title="Student card"
          description={<Crumbs items={[["Students", "/school/students"], [s.fullName, `/school/students/${s.id}`], ["Card"]]} />}
          actions={
            <>
              <ButtonLink href={`/school/students/${s.id}`} variant="secondary">Back</ButtonLink>
              <PrintButton label="Print card" />
            </>
          }
        />
        {s.status === "INACTIVE" && (
          <div className="mb-4">
            <Alert tone="warning">This student is inactive — the scanner will refuse this card.</Alert>
          </div>
        )}
      </div>
      <div className="flex justify-center py-6 print:block print:py-0">
        <div className="origin-top sm:scale-125 print:scale-100">
          <StudentCard s={card} schoolName={user.school.name} />
        </div>
      </div>
      <p className="mt-10 text-center text-xs text-zinc-500 print:hidden">
        Tip: print at 100% scale (“Actual size”) so the card is exactly ID-card size.
      </p>
    </>
  );
}
