"use client";

import { startTransition, useActionState, useRef, useState } from "react";
import { importStudents } from "./actions";
import type { FormState } from "@/lib/form";
import type { ImportReport, RowOutcome } from "@/lib/import-types";
import { formatBytes } from "@/lib/format";
import { Alert, Badge, Button, ButtonLink, Card, CardHeader, td, th } from "@/components/ui";

const OUTCOME: Record<RowOutcome, { label: string; tone: "green" | "blue" | "slate" | "red" }> = {
  create: { label: "New", tone: "green" },
  update: { label: "Update", tone: "blue" },
  skip: { label: "Skip", tone: "slate" },
  error: { label: "Error", tone: "red" },
};

function fingerprintOf(f: File | undefined) {
  return f ? `${f.name}|${f.size}|${f.lastModified}` : "";
}

export function ImportForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(importStudents, undefined);
  const [file, setFile] = useState<File | undefined>();
  const [optionsKey, setOptionsKey] = useState("skip|on");
  const formRef = useRef<HTMLFormElement>(null);
  const report = state?.ok ? (state.data as ImportReport) : undefined;
  // A preview only counts for the exact file and options it was made with.
  const [checkedKey, setCheckedKey] = useState("");
  const currentKey = `${fingerprintOf(file)}#${optionsKey}`;
  const [handled, setHandled] = useState(state);
  if (state !== handled) {
    setHandled(state);
    setCheckedKey(report?.stage === "preview" ? currentKey : "");
  }
  const previewValid = report?.stage === "preview" && checkedKey === currentKey;

  function submit(intent: "preview" | "commit") {
    const form = formRef.current;
    if (!form || !file) return;
    // Submitting manually (instead of <form action>) keeps the chosen file selected afterwards.
    const fd = new FormData(form);
    fd.set("intent", intent);
    fd.set("lastModified", String(file.lastModified));
    startTransition(() => action(fd));
  }

  function readOptions() {
    const form = formRef.current;
    if (!form) return;
    const fd = new FormData(form);
    setOptionsKey(`${fd.get("mode")}|${fd.get("createClasses") ?? "off"}`);
  }

  if (report?.stage === "done") {
    return (
      <Card className="space-y-4 p-5">
        <Alert tone="success">
          Import finished: {report.create} student{report.create === 1 ? "" : "s"} added
          {report.update ? `, ${report.update} updated` : ""}
          {report.skip ? `, ${report.skip} skipped` : ""}
          {report.errors ? `, ${report.errors} row${report.errors === 1 ? "" : "s"} with errors not imported` : ""}.
          {report.newClasses.length > 0 && ` New classes: ${report.newClasses.join(", ")}.`}
        </Alert>
        <div className="flex flex-wrap gap-2">
          <ButtonLink href="/school/students">View students</ButtonLink>
          <ButtonLink href="/school/cards" variant="secondary">Print QR cards</ButtonLink>
          <Button type="button" variant="secondary" onClick={() => window.location.reload()}>
            Import another file
          </Button>
        </div>
        {report.errors > 0 && <ReportTable report={report} only="error" />}
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <form ref={formRef} onSubmit={(e) => { e.preventDefault(); submit("preview"); }} onChange={readOptions} className="space-y-5">
          <div>
            <label htmlFor="file" className="block text-[13px] font-semibold text-slate-700">Excel or CSV file</label>
            <input
              id="file"
              name="file"
              type="file"
              accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
              onChange={(e) => setFile(e.target.files?.[0])}
              className="mt-2 block w-full cursor-pointer rounded-2xl border-2 border-dashed border-slate-200 bg-[rgb(255_255_255/0.02)] p-3 text-sm text-slate-600 transition-colors hover:border-blue-300 file:mr-4 file:cursor-pointer file:rounded-xl file:border-0 file:bg-metal-gold file:px-4 file:py-2 file:text-sm file:font-bold file:text-canvas"
            />
            <p className="mt-1 text-xs text-slate-500">Max 2 MB and 5,000 students per file.</p>
          </div>
          <fieldset>
            <legend className="text-[13px] font-semibold text-slate-700">If a Student ID already exists</legend>
            <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-700">
              <label className="flex items-center gap-2"><input type="radio" name="mode" value="skip" defaultChecked className="accent-[#e5c07b]" /> Skip that row (keep current data)</label>
              <label className="flex items-center gap-2"><input type="radio" name="mode" value="update" className="accent-[#e5c07b]" /> Update name and class from the file</label>
            </div>
          </fieldset>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" name="createClasses" defaultChecked className="h-4 w-4 rounded border-slate-300 accent-[#e5c07b]" />
            Create missing classes automatically
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit" variant={previewValid ? "secondary" : "primary"} disabled={!file || pending}>
              {pending ? "Checking…" : previewValid ? "Check again" : "Check file"}
            </Button>
            {previewValid && report && (
              <Button
                type="button"
                variant="success"
                disabled={pending || report.create + report.update === 0 || !report.storage.enough}
                onClick={() => submit("commit")}
              >
                {pending ? "Importing…" : `Import ${report.create + report.update} student${report.create + report.update === 1 ? "" : "s"}`}
              </Button>
            )}
          </div>
          {state?.error && <Alert tone="error">{state.error}</Alert>}
        </form>
      </Card>

      {report && previewValid && (
        <Card>
          <CardHeader title={`Check result — ${report.fileName}`} />
          <div className="space-y-3 p-5">
            <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-5">
              {[
                ["Rows", report.total],
                ["New", report.create],
                ["Update", report.update],
                ["Skip", report.skip],
                ["Errors", report.errors],
              ].map(([l, v]) => (
                <div key={l} className="rounded-2xl bg-[rgb(255_255_255/0.035)] px-4 py-3 ring-1 ring-line">
                  <dt className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">{l}</dt>
                  <dd className={`mt-1 text-2xl font-black tabular-nums ${l === "Errors" && Number(v) > 0 ? "text-red-500" : l === "New" ? "text-emerald-600" : "text-slate-900"}`}>{v}</dd>
                </div>
              ))}
            </dl>
            {report.newClasses.length > 0 && <p className="text-sm text-slate-600">New classes to create: {report.newClasses.join(", ")}</p>}
            {report.errors > 0 && (
              <Alert tone="warning">
                {report.errors} row{report.errors === 1 ? " has" : "s have"} errors and will NOT be imported. Fix them in your file and check again, or import the rest now.
              </Alert>
            )}
            {report.storage.noPlan && report.create > 0 ? (
              <Alert tone="error">Your school has no active subscription, so new students can’t be added.</Alert>
            ) : (
              !report.storage.enough && (
                <Alert tone="error">
                  Not enough storage: needs about {formatBytes(report.storage.neededBytes)}, {formatBytes(report.storage.remainingBytes)} left. Import fewer students or ask for more storage.
                </Alert>
              )
            )}
          </div>
          <ReportTable report={report} />
        </Card>
      )}
    </div>
  );
}

function ReportTable({ report, only }: { report: ImportReport; only?: RowOutcome }) {
  const rows = only ? report.rows.filter((r) => r.outcome === only) : report.rows;
  return (
    <div className="max-h-[32rem] overflow-auto border-t border-slate-100">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-slate-50">
          <tr>
            <th scope="col" className={th}>Row</th>
            <th scope="col" className={th}>Result</th>
            <th scope="col" className={th}>Student ID</th>
            <th scope="col" className={th}>Name</th>
            <th scope="col" className={th}>Class</th>
            <th scope="col" className={th}>Notes</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((r) => (
            <tr key={r.line} className={r.outcome === "error" ? "bg-red-50/50" : undefined}>
              <td className={`${td} tabular-nums text-slate-500`}>{r.line}</td>
              <td className={td}><Badge tone={OUTCOME[r.outcome].tone}>{OUTCOME[r.outcome].label}</Badge></td>
              <td className={`${td} font-mono text-xs`}>{r.studentCode || "—"}</td>
              <td className={td}>{r.fullName || "—"}</td>
              <td className={`${td} text-slate-600`}>{r.className ?? "—"}</td>
              <td className={`${td} text-xs text-slate-600`}>{r.messages.join(" ")}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {report.total > report.rows.length && !only && (
        <p className="px-5 py-3 text-xs text-slate-500">Showing the first {report.rows.length} rows (problems first).</p>
      )}
      {only && rows.length === 0 && <p className="px-5 py-3 text-sm text-slate-500">None.</p>}
    </div>
  );
}
