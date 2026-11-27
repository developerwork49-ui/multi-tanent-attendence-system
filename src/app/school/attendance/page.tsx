import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireSchoolAdmin } from "@/lib/auth/dal";
import { schoolDb } from "@/lib/db";
import { pageParam, withQuery } from "@/lib/params";
import { monthLabel, shiftMonth, todayInZone, dateOnlyLabel } from "@/lib/dates";
import { loadRegister } from "@/lib/register";
import { registerFilters } from "@/lib/register-params";
import { PageSkeleton } from "@/components/page-skeleton";
import { ActionButton } from "@/components/action-button";
import { Button, Card, EmptyState, inputClass, PageHeader, Pagination, subtleLink, buttonClass } from "@/components/ui";
import { icons } from "@/components/icons";
import { RegisterGrid } from "./register-grid";
import { markRestAbsent } from "./actions";

export const metadata: Metadata = { title: "Attendance register" };

const PAGE_SIZE = 100;

export default function AttendancePage({ searchParams }: PageProps<"/school/attendance">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Content searchParams={searchParams} />
    </Suspense>
  );
}

async function Content({ searchParams }: { searchParams: PageProps<"/school/attendance">["searchParams"] }) {
  const user = await requireSchoolAdmin();
  const sp = await searchParams;
  const today = todayInZone(user.school.timezone);
  const f = registerFilters(sp, today);
  const page = pageParam(sp.page);

  const { reg, classes } = await schoolDb(
    user,
    async (tx) => ({
      reg: await loadRegister(tx, f, today, { skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
      classes: await tx.classGroup.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true } }),
    }),
    { timeout: 30_000 },
  );

  const query = { class: f.classParam, q: f.q, inactive: f.includeInactive ? "1" : "" };
  const href = (month: string) => withQuery("/school/attendance", { month, ...query });
  const thisMonth = today.slice(0, 7);
  const markDay = f.month === thisMonth ? today : null;

  return (
    <>
      <PageHeader
        eyebrow={monthLabel(f.month)}
        title="Attendance register"
        description={`${reg.total.toLocaleString("en-US")} student${reg.total === 1 ? "" : "s"}`}
        actions={
          <>
            <a href={withQuery("/school/attendance/export", { month: f.month, ...query })} className={buttonClass("secondary", "transition-transform hover:scale-105")} download>
              <icons.download width={16} height={16} /> Download CSV
            </a>
          </>
        }
      />
      <Card className="mb-4 print:hidden">
        <form className="flex flex-wrap items-end gap-3 p-4 sm:px-5">
          <div className="flex items-center gap-1">
            <Link href={href(shiftMonth(f.month, -1))} className={buttonClass("secondary", "px-3")} aria-label="Previous month">←</Link>
            <label htmlFor="month" className="sr-only">Month</label>
            <input id="month" name="month" type="month" defaultValue={f.month} max={thisMonth} className={`${inputClass} mt-0 w-40`} />
            <Link
              href={href(shiftMonth(f.month, 1))}
              aria-disabled={f.month >= thisMonth}
              className={buttonClass("secondary", `px-3 ${f.month >= thisMonth ? "pointer-events-none opacity-40" : ""}`)}
              aria-label="Next month"
            >
              →
            </Link>
          </div>
          <div>
            <label htmlFor="class" className="sr-only">Class</label>
            <select id="class" name="class" defaultValue={f.classParam} className={`${inputClass} mt-0 w-auto`}>
              <option value="">All classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
              <option value="none">No class</option>
            </select>
          </div>
          <div className="min-w-40 flex-1">
            <label htmlFor="q" className="sr-only">Search</label>
            <input id="q" name="q" type="search" defaultValue={f.q} placeholder="Search name or ID…" className={`${inputClass} mt-0`} />
          </div>
          <label className="flex items-center gap-2 py-2 text-sm text-slate-700">
            <input type="checkbox" name="inactive" value="1" defaultChecked={f.includeInactive} className="h-4 w-4 rounded border-slate-300 accent-[#e5c07b]" />
            Include inactive
          </label>
          <Button type="submit" variant="secondary">Show</Button>
          {(f.classParam || f.q || f.includeInactive || f.month !== thisMonth) && (
            <Link href="/school/attendance" className={subtleLink}>Reset</Link>
          )}
        </form>
        {markDay && reg.total > 0 && (
          <div className="flex flex-wrap items-center gap-3 border-t border-line px-5 py-3.5 text-sm text-slate-500">
            <span>End of the day? Students not scanned on {dateOnlyLabel(markDay)} can be marked absent{f.classId && f.classId !== "none" ? " (this class only)" : ""}:</span>
            <ActionButton
              action={markRestAbsent}
              fields={{ date: markDay, ...(typeof f.classId === "number" ? { classId: f.classId } : {}) }}
              label="Mark unscanned students absent"
              confirm="Mark everyone without a record today as absent?"
            />
          </div>
        )}
      </Card>

      <Card className="overflow-hidden">
        {reg.rows.length === 0 ? (
          <EmptyState>
            {f.q || f.classParam ? "No students match these filters." : <>No students yet. <Link href="/school/students/new" className="font-semibold text-blue-700 transition-colors hover:text-blue-800">Add students</Link> first.</>}
          </EmptyState>
        ) : (
          <RegisterGrid key={`${f.month}|${f.classParam}|${f.q}|${f.includeInactive}|${page}`} days={reg.days} rows={reg.rows} dayTotals={reg.dayTotals} schoolDays={reg.schoolDays} />
        )}
        {reg.total > PAGE_SIZE && (
          <Pagination page={page} pageSize={PAGE_SIZE} total={reg.total} noun="students" href={(p) => withQuery("/school/attendance", { month: f.month, ...query, page: p })} />
        )}
      </Card>
    </>
  );
}
