import type { Metadata } from "next";
import { Suspense } from "react";
import { requireSchoolAdmin } from "@/lib/auth/dal";
import { schoolDb } from "@/lib/db";
import { storageStatus } from "@/lib/storage";
import { PageSkeleton } from "@/components/page-skeleton";
import { StorageNotice } from "@/components/storage-notice";
import { PageHeader } from "@/components/ui";
import { ImportForm } from "./import-form";

export const metadata: Metadata = { title: "Import students" };

export default function ImportPage() {
  return (
    <>
      <PageHeader title="Import students" description="Add many students at once from an Excel or CSV file." />
      <Suspense fallback={<PageSkeleton />}>
        <Content />
      </Suspense>
    </>
  );
}

async function Content() {
  const user = await requireSchoolAdmin();
  const storage = await schoolDb(user, (tx) => storageStatus(tx, user.school.id));
  return (
    <div className="max-w-5xl space-y-6">
      <StorageNotice status={storage} />
      <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          [
            "Download the template",
            <>
              <a href="/school/import/template" className="font-medium text-zinc-950 underline decoration-zinc-300 underline-offset-4 hover:decoration-zinc-950" download>Excel (.xlsx)</a> or{" "}
              <a href="/school/import/template?format=csv" className="font-medium text-zinc-950 underline decoration-zinc-300 underline-offset-4 hover:decoration-zinc-950" download>CSV</a>
            </>,
          ],
          ["Fill it in", <>One student per row: <strong className="text-zinc-800">Student ID</strong>, <strong className="text-zinc-800">Full Name</strong>, Class.</>],
          ["Check the file", "Nothing is saved yet — you see what happens to every row."],
          ["Import", "All-or-nothing: if anything fails, nothing is saved."],
        ].map(([title, text], i) => (
          <li key={i} className="border border-zinc-200 bg-white relative overflow-hidden rounded-lg p-5">
            <span className="bg-zinc-900 flex h-8 w-8 items-center justify-center rounded-md text-sm font-semibold text-white">{i + 1}</span>
            <p className="mt-3 font-semibold tracking-tight text-zinc-900">{title}</p>
            <p className="mt-1 text-sm text-zinc-500">{text}</p>
          </li>
        ))}
      </ol>
      <ImportForm />
    </div>
  );
}
