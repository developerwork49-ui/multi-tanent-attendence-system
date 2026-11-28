"use client";

import Link from "next/link";
import { Alert, checkClass } from "@/components/ui";
import { useState, useTransition, type ReactNode } from "react";
import { setAttendance } from "./actions";
import type { Mark, RegisterDay, RegisterRow } from "@/lib/register";

type Props = {
  days: RegisterDay[];
  rows: RegisterRow[];
  dayTotals: Record<string, number>;
  schoolDays: number;
};

const NEXT: Record<string, Mark | null> = { "": "P", P: "A", A: null };
const STATUS = { P: "PRESENT", A: "ABSENT" } as const;

export function RegisterGrid({ days, rows, dayTotals, schoolDays }: Props) {
  const [edit, setEdit] = useState(false);
  // Changes made on this page, shown immediately while they are saved.
  const [changes, setChanges] = useState<Record<string, Mark | null>>({});
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const markOf = (row: RegisterRow, date: string): Mark | null => {
    const k = `${row.id}:${date}`;
    return k in changes ? changes[k] : (row.marks[date] ?? null);
  };

  function cycle(row: RegisterRow, date: string) {
    const k = `${row.id}:${date}`;
    const before = markOf(row, date);
    const next = NEXT[before ?? ""];
    setError(null);
    setChanges((c) => ({ ...c, [k]: next }));
    startTransition(async () => {
      let res;
      try {
        res = await setAttendance(row.id, date, next ? STATUS[next] : null);
      } catch {
        res = { ok: false as const, error: "Not saved — check your connection." };
      }
      if (!res.ok) {
        setChanges((c) => ({ ...c, [k]: before }));
        setError(res.error);
      }
    });
  }

  // Day totals including unsaved/optimistic changes on this page.
  const totals = { ...dayTotals };
  for (const [k, v] of Object.entries(changes)) {
    const [id, date] = [Number(k.split(":")[0]), k.split(":")[1]];
    const row = rows.find((r) => r.id === id);
    const original = row?.marks[date] ?? null;
    if (original === "P" && v !== "P") totals[date] = (totals[date] ?? 0) - 1;
    if (original !== "P" && v === "P") totals[date] = (totals[date] ?? 0) + 1;
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-5 py-3 print:hidden">
        <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-600">
          <span className="flex items-center gap-1.5"><Legend><Cell mark="P" /></Legend> Present</span>
          <span className="flex items-center gap-1.5"><Legend tint="bg-red-50"><Cell mark="A" /></Legend> Absent</span>
          <span className="flex items-center gap-1.5"><Legend><Cell mark={null} /></Legend> No record</span>
          <span>% = present ÷ {schoolDays} school day{schoolDays === 1 ? "" : "s"} recorded this month</span>
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-zinc-700">
          <input type="checkbox" checked={edit} onChange={(e) => setEdit(e.target.checked)} className={checkClass} />
          Edit mode (click a cell: blank → P → A → blank)
        </label>
      </div>
      {error && (
        <div className="px-4 pt-3">
          <Alert tone="error">{error}</Alert>
        </div>
      )}

      <div className="max-h-[70vh] overflow-auto print:max-h-none print:overflow-visible">
        <table className="border-separate border-spacing-0 text-xs">
          <thead>
            <tr>
              <th scope="col" className="sticky left-0 top-0 z-30 min-w-48 border-b border-r border-zinc-200 bg-zinc-50 px-3 py-2.5 text-left text-xs font-medium text-zinc-500 sm:min-w-56">
                Student
              </th>
              {days.map((d) => (
                <th
                  key={d.date}
                  scope="col"
                  className={`sticky top-0 z-20 min-w-8 border-b border-r border-zinc-200 px-0 py-1 text-center font-medium tabular-nums ${
                    d.isToday ? "bg-zinc-900 text-white print:bg-zinc-200 print:text-zinc-950" : d.weekend ? "bg-sticky-weekend text-zinc-400" : "bg-zinc-50 text-zinc-600"
                  }`}
                >
                  <div className={`text-[10px] font-normal ${d.isToday ? "text-zinc-300" : ""}`}>{d.weekday}</div>
                  <div>{d.day}</div>
                </th>
              ))}
              <th scope="col" className="sticky top-0 z-20 border-b border-l border-zinc-200 bg-zinc-50 px-2 py-2 text-right font-medium text-zinc-600">P</th>
              <th scope="col" className="sticky top-0 z-20 border-b border-zinc-200 bg-zinc-50 px-2 py-2 text-right font-medium text-zinc-600">A</th>
              <th scope="col" className="sticky top-0 z-20 border-b border-zinc-200 bg-zinc-50 px-2 py-2 text-right font-medium text-zinc-600">%</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              let present = 0;
              let absent = 0;
              for (const d of days) {
                const m = markOf(row, d.date);
                if (m === "P") present++;
                if (m === "A") absent++;
              }
              return (
                <tr key={row.id} className="group">
                  <th scope="row" className="sticky left-0 z-10 border-b border-r border-zinc-200 bg-white px-3 py-1 text-left font-normal group-hover:bg-zinc-50">
                    <Link href={`/school/students/${row.id}`} className="block max-w-56 truncate text-[13px] font-medium text-zinc-950 underline-offset-4 hover:underline">
                      {row.fullName}
                    </Link>
                    <span className="text-[11px] tabular-nums text-zinc-500">
                      {row.studentCode}
                      {row.className && ` · ${row.className}`}
                      {!row.active && " · inactive"}
                    </span>
                  </th>
                  {days.map((d) => {
                    const m = markOf(row, d.date);
                    const bg = m === "A" ? "bg-red-50" : d.isToday ? "bg-zinc-50" : d.weekend ? "bg-sticky-weekend" : "group-hover:bg-zinc-50";
                    return (
                      <td key={d.date} className={`h-9 border-b border-r border-zinc-100 p-0 text-center ${bg}`}>
                        {edit && !d.isFuture ? (
                          <button
                            type="button"
                            onClick={() => cycle(row, d.date)}
                            className="flex h-full w-full items-center justify-center hover:bg-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-900"
                            aria-label={`${row.fullName}, ${d.date}: ${m === "P" ? "present" : m === "A" ? "absent" : "no record"}. Click to change.`}
                          >
                            <Cell mark={m} editable />
                          </button>
                        ) : (
                          <Cell mark={m} />
                        )}
                      </td>
                    );
                  })}
                  <td className="border-b border-l border-zinc-200 px-2.5 text-right font-medium tabular-nums text-zinc-950">{present}</td>
                  <td className="border-b border-zinc-100 px-2.5 text-right tabular-nums text-zinc-600">{absent}</td>
                  <td className="border-b border-zinc-100 px-2.5 text-right tabular-nums text-zinc-600">
                    {schoolDays ? Math.round((present / schoolDays) * 100) : 0}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row" className="sticky bottom-0 left-0 z-20 border-r border-t border-zinc-200 bg-zinc-50 px-3 py-2 text-left font-medium text-zinc-600">
                Present per day
              </th>
              {days.map((d) => (
                <td key={d.date} className="sticky bottom-0 z-10 border-r border-t border-zinc-200 bg-zinc-50 py-2 text-center font-medium tabular-nums text-zinc-950">
                  {d.isFuture ? "" : (totals[d.date] ?? 0) || ""}
                </td>
              ))}
              <td colSpan={3} className="sticky bottom-0 z-10 border-t border-zinc-200 bg-zinc-50" />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function Cell({ mark, editable }: { mark: Mark | null; editable?: boolean }) {
  if (mark === "P") return <span className="text-[13px] font-semibold text-emerald-700">P</span>;
  if (mark === "A") return <span className="text-[13px] font-semibold text-red-600">A</span>;
  return <span className={editable ? "inline-block h-3.5 w-3.5 rounded-sm border border-dashed border-zinc-300" : "text-zinc-300"}>{editable ? "" : "·"}</span>;
}

function Legend({ children, tint = "bg-white" }: { children: ReactNode; tint?: string }) {
  return <span className={`inline-flex h-6 w-6 items-center justify-center border border-zinc-200 ${tint}`}>{children}</span>;
}
