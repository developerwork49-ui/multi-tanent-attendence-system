import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { icons, type IconName } from "@/components/icons";
import { buttonClass, type ButtonVariant } from "@/components/button-styles";

/*
 * Shared building blocks: every screen uses these, so the whole product
 * follows one clean white-and-black design system. Plain components with
 * no animation library; they work in Server and Client Components alike.
 */

export { buttonClass, type ButtonVariant };

// ---------------------------------------------------------------------
//  Page structure
// ---------------------------------------------------------------------

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  /** Small muted line above the title (e.g. breadcrumbs or a date). */
  eyebrow?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="min-w-0">
        {eyebrow && <p className="mb-1 text-[13px] text-zinc-500">{eyebrow}</p>}
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">{title}</h1>
        {description && <p className="mt-1 text-sm text-zinc-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** White panel with a hairline border. */
export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-lg border border-zinc-200 bg-white ${className}`}>{children}</div>;
}

export function CardHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-zinc-200 px-5 py-3">
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-zinc-950">{title}</h2>
        {description && <p className="mt-0.5 text-xs text-zinc-500">{description}</p>}
      </div>
      {actions}
    </div>
  );
}

/** "View all →" style link for card headers. */
export function MoreLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="shrink-0 text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-950">
      {children} <span aria-hidden>→</span>
    </Link>
  );
}

/** Breadcrumb trail: [["Schools", "/super-admin/schools"], ["Green Valley"]] */
export function Crumbs({ items }: { items: [string, string?][] }) {
  return (
    <>
      {items.map(([label, href], i) => (
        <span key={i}>
          {i > 0 && <span className="px-1.5 text-zinc-300">/</span>}
          {href ? (
            <Link href={href} className="text-zinc-500 transition-colors hover:text-zinc-950">
              {label}
            </Link>
          ) : (
            <span className="text-zinc-700">{label}</span>
          )}
        </span>
      ))}
    </>
  );
}

// ---------------------------------------------------------------------
//  Buttons and links
// ---------------------------------------------------------------------

export function Button({ variant = "primary", className = "", ...props }: ComponentProps<"button"> & { variant?: ButtonVariant }) {
  return <button className={buttonClass(variant, className)} {...props} />;
}

export function ButtonLink({ variant = "primary", className = "", ...props }: ComponentProps<typeof Link> & { variant?: ButtonVariant }) {
  return <Link className={buttonClass(variant, className)} {...props} />;
}

/** Inline text link inside sentences. */
export const linkClass = "font-medium text-zinc-950 underline decoration-zinc-300 underline-offset-4 transition-colors hover:decoration-zinc-950";
/** Bold-ish row title link (e.g. a school or student name in a table). */
export const rowLink = "font-medium text-zinc-950 underline-offset-4 hover:underline";
/** Row / card actions such as "Edit", "Card", "View all". */
export const actionLink = "text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-950";
/** Small "Clear filters" style text link. */
export const subtleLink = "py-2 text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-950";

// ---------------------------------------------------------------------
//  Stats
// ---------------------------------------------------------------------

export type StatTone = "neutral" | "good" | "warning" | "bad";

/**
 * A row of figures in one bordered strip, separated by hairlines.
 * `cols` sets the grid columns (e.g. "grid-cols-2 lg:grid-cols-4");
 * each cell draws its own left/top line, and the outer frame hides the
 * lines on the first column and first row, so any number of figures fits.
 */
export function StatGrid({ children, cols, className = "" }: { children: ReactNode; cols: string; className?: string }) {
  return (
    <div className={`overflow-hidden rounded-lg border border-zinc-200 bg-white ${className}`}>
      <dl className={`-ml-px -mt-px grid ${cols}`}>{children}</dl>
    </div>
  );
}

const statDot: Record<StatTone, string> = {
  neutral: "",
  good: "bg-emerald-500",
  warning: "bg-amber-500",
  bad: "bg-red-500",
};

/** One figure: small label, large number, optional hint. */
export function Stat({ label, value, hint, tone = "neutral" }: { label: string; value: ReactNode; hint?: ReactNode; tone?: StatTone }) {
  return (
    <div className="flex flex-col border-l border-t border-zinc-200 px-5 py-4">
      <dt className="flex items-center gap-2 text-[13px] text-zinc-500">
        {tone !== "neutral" && <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${statDot[tone]}`} />}
        {label}
      </dt>
      <dd className="mt-1.5 text-2xl font-semibold tracking-tight text-zinc-950 tabular-nums">{value}</dd>
      {hint && <dd className="mt-1 text-xs text-zinc-500">{hint}</dd>}
    </div>
  );
}

// ---------------------------------------------------------------------
//  Status
// ---------------------------------------------------------------------

export type Tone = "green" | "amber" | "red" | "slate" | "blue";

const badgeTone: Record<Tone, { box: string; dot: string }> = {
  green: { box: "bg-emerald-50 text-emerald-700 ring-emerald-600/20", dot: "bg-emerald-500" },
  amber: { box: "bg-amber-50 text-amber-800 ring-amber-600/25", dot: "bg-amber-500" },
  red: { box: "bg-red-50 text-red-700 ring-red-600/20", dot: "bg-red-500" },
  slate: { box: "bg-zinc-50 text-zinc-600 ring-zinc-500/20", dot: "bg-zinc-400" },
  blue: { box: "bg-blue-50 text-blue-700 ring-blue-700/15", dot: "bg-blue-500" },
};

/** Small status label, e.g. subscription status. */
export function Badge({ tone = "slate", dot, children }: { tone?: Tone; dot?: boolean; children: ReactNode }) {
  const t = badgeTone[tone];
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${t.box}`}>
      {dot && <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${t.dot}`} />}
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: "ACTIVE" | "INACTIVE" }) {
  return status === "ACTIVE" ? <Badge tone="green" dot>Active</Badge> : <Badge dot>Inactive</Badge>;
}

export type AlertTone = "info" | "success" | "error" | "warning";

const alertTone: Record<AlertTone, { icon: IconName; box: string; icon_: string }> = {
  info: { icon: "info", box: "border-zinc-200 bg-zinc-50", icon_: "text-zinc-500" },
  success: { icon: "checkCircle", box: "border-emerald-200 bg-emerald-50", icon_: "text-emerald-600" },
  error: { icon: "error", box: "border-red-200 bg-red-50", icon_: "text-red-600" },
  warning: { icon: "warning", box: "border-amber-200 bg-amber-50", icon_: "text-amber-600" },
};

/** Message banner. The small icon tells the kind of message at a glance. */
export function Alert({ tone = "info", title, children }: { tone?: AlertTone; title?: ReactNode; children?: ReactNode }) {
  const t = alertTone[tone];
  const Icon = icons[t.icon];
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${t.box}`}>
      <Icon width={16} height={16} strokeWidth={2} className={`mt-0.5 shrink-0 ${t.icon_}`} />
      <div className="min-w-0 flex-1 leading-relaxed text-zinc-800">
        {title && <p className="font-medium text-zinc-950">{title}</p>}
        {children}
      </div>
    </div>
  );
}

/** Shows a form action's general error or success message. */
export function FormMessage({ state }: { state: { error?: string; message?: string } | undefined }) {
  if (state?.error) return <Alert tone="error">{state.error}</Alert>;
  if (state?.message) return <Alert tone="success">{state.message}</Alert>;
  return null;
}

// ---------------------------------------------------------------------
//  Forms
// ---------------------------------------------------------------------

/** Input look without width or margin (for inline filters and toolbars). */
export const inputBase =
  "rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 shadow-xs placeholder:text-zinc-400 transition-colors hover:border-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 disabled:bg-zinc-50 disabled:text-zinc-500 aria-[invalid=true]:border-red-500 aria-[invalid=true]:ring-red-500/10";

/** Standard full-width input inside a <Field>. */
export const inputClass = `mt-1.5 block w-full ${inputBase}`;

/** Checkbox / radio look. */
export const checkClass = "h-4 w-4 rounded border-zinc-300 accent-zinc-900";

export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-zinc-900">
        {label}
        {required && <span className="text-zinc-400"> *</span>}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="mt-1.5 text-xs text-red-600">
          {error}
        </p>
      ) : (
        hint && <p className="mt-1.5 text-xs text-zinc-500">{hint}</p>
      )}
    </div>
  );
}

/** aria attributes linking an input to its error message. */
export function ariaFor(error: string | undefined, id: string) {
  return error ? ({ "aria-invalid": true, "aria-describedby": `${id}-error` } as const) : {};
}

// ---------------------------------------------------------------------
//  Tables and lists
// ---------------------------------------------------------------------

/** Table header cell / body cell styles used by every list. */
export const th = "px-3 py-2.5 text-left text-xs font-medium text-zinc-500 first:pl-5 last:pr-5";
export const td = "px-3 py-2.5 first:pl-5 last:pr-5";
/** Table header row and body row styles shared by every list. */
export const theadRow = "border-b border-zinc-200 bg-zinc-50";
export const tbodyRow = "transition-colors hover:bg-zinc-50";
/** Filter row at the top of a list card (plain GET form). */
export const filterBar = "flex flex-wrap items-end gap-3 border-b border-zinc-200 px-5 py-3";

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="px-6 py-12 text-center text-sm text-zinc-500">{children}</div>;
}

/** "Showing 1–20 of 135" + previous/next links. `href(page)` builds each page's URL. */
export function Pagination({
  page,
  pageSize,
  total,
  href,
  noun = "items",
}: {
  page: number;
  pageSize: number;
  total: number;
  href: (page: number) => string;
  noun?: string;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const linkCls = "inline-flex h-8 items-center rounded-md bg-white px-3 font-medium text-zinc-900 shadow-xs ring-1 ring-inset ring-zinc-300 transition-colors hover:bg-zinc-50";
  const offCls = "inline-flex h-8 items-center rounded-md px-3 text-zinc-400 ring-1 ring-inset ring-zinc-200";
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 px-5 py-3 text-sm text-zinc-500">
      <span className="tabular-nums">
        {total === 0
          ? `0 ${noun}`
          : `Showing ${((page - 1) * pageSize + 1).toLocaleString("en-US")}–${Math.min(page * pageSize, total).toLocaleString("en-US")} of ${total.toLocaleString("en-US")}`}
      </span>
      {pages > 1 && (
        <div className="flex items-center gap-2">
          {page > 1 ? <Link href={href(page - 1)} className={linkCls}>← Previous</Link> : <span className={offCls}>← Previous</span>}
          <span className="px-1 tabular-nums text-zinc-600">
            Page {page} of {pages}
          </span>
          {page < pages ? <Link href={href(page + 1)} className={linkCls}>Next →</Link> : <span className={offCls}>Next →</span>}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------
//  Simple charts and meters (static, no animation)
// ---------------------------------------------------------------------

export type Bar = { key: string; label: string; value: number; highlight?: boolean; muted?: boolean };

/** Vertical bar chart: plain grey bars, the highlighted one (e.g. today) in black. */
export function BarChart({ bars, max, ariaLabel }: { bars: Bar[]; max: number; ariaLabel: string }) {
  const top = Math.max(1, max);
  return (
    <div className="relative flex h-full min-h-52 flex-col" role="img" aria-label={ariaLabel}>
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-6 top-5 flex flex-col justify-between">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className="border-t border-zinc-100" />
        ))}
      </div>
      <div className="relative flex flex-1 items-end gap-2 sm:gap-3">
        {bars.map((b) => {
          const pct = Math.max(2, (b.value / top) * 88);
          const fill = b.highlight ? "bg-zinc-900" : b.muted ? "bg-zinc-100" : "bg-zinc-300";
          return (
            <div key={b.key} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
              <div className="relative flex w-full max-w-12 flex-1 flex-col items-center justify-end">
                <span className={`mb-1 text-xs tabular-nums ${b.highlight ? "font-semibold text-zinc-950" : "text-zinc-500"}`}>{b.value}</span>
                <div className={`w-full rounded-sm ${fill}`} style={{ height: `${pct}%` }} />
              </div>
              <span className={`text-xs ${b.highlight ? "font-medium text-zinc-950" : "text-zinc-500"}`}>{b.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Horizontal usage bar (e.g. storage used): black, amber from 80 %, red when full. */
export function Meter({ percent, tone, label }: { percent: number; tone: "ok" | "warning" | "full"; label: string }) {
  const pct = Math.max(0, Math.min(100, percent));
  const fill = tone === "full" ? "bg-red-600" : tone === "warning" ? "bg-amber-500" : "bg-zinc-900";
  return (
    <div
      className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100"
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
    >
      <div className={`h-full rounded-full ${fill}`} style={{ width: `${Math.max(pct, pct > 0 ? 1 : 0)}%` }} />
    </div>
  );
}

// ---------------------------------------------------------------------
//  Dates
// ---------------------------------------------------------------------

export function formatDate(d: Date, timeZone = "UTC"): string {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone }).format(d);
}

export function formatDateTime(d: Date, timeZone = "UTC"): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  }).format(d);
}
