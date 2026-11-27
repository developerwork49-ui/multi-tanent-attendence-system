import Link from "next/link";
import type { ReactNode } from "react";
import { icons, type IconName } from "@/components/icons";
import { Alert } from "@/components/motion/motion-ui";

/*
 * Shared building blocks so every screen follows one design system.
 * Animated pieces live in ./motion/motion-ui (Client Components) and are
 * re-exported here, so pages import everything from "@/components/ui".
 */

export { Alert, Button, ButtonLink, Stat, StatGrid } from "@/components/motion/motion-ui";
export { buttonClass, type ButtonVariant } from "@/components/button-styles";

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  /** Small gold label above the title. */
  eyebrow?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <div className="min-w-0">
        {eyebrow && <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-blue-500">{eyebrow}</p>}
        <h1 className="text-headline text-3xl font-black leading-[1.08] tracking-tight sm:text-[2.6rem]">{title}</h1>
        {description && <p className="mt-2 text-sm font-medium text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
    </div>
  );
}

/** Frosted glass panel. */
export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`glass relative rounded-3xl transition-[box-shadow,border-color] duration-300 hover:border-[rgb(255_255_255/0.13)] ${className}`}>
      {children}
    </div>
  );
}

export function CardHeader({ title, actions, icon }: { title: string; actions?: ReactNode; icon?: IconName }) {
  const Icon = icon ? icons[icon] : null;
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4 sm:px-6">
      <h2 className="flex items-center gap-2.5 text-[15px] font-extrabold tracking-tight text-slate-900">
        {Icon && (
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-500 ring-1 ring-blue-300/50">
            <Icon width={15} height={15} strokeWidth={2.2} />
          </span>
        )}
        {title}
      </h2>
      {actions}
    </div>
  );
}

/** Gold text link with an arrow, for "View all" style actions in card headers. */
export function MoreLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="group inline-flex items-center gap-1 text-sm font-semibold text-blue-700 transition-colors hover:text-blue-800">
      {children}
      <icons.arrowRight width={15} height={15} className="transition-transform duration-200 group-hover:translate-x-0.5" />
    </Link>
  );
}

export function StatusBadge({ status }: { status: "ACTIVE" | "INACTIVE" }) {
  return status === "ACTIVE" ? <Badge tone="green" dot>Active</Badge> : <Badge dot>Inactive</Badge>;
}

export const inputClass =
  "mt-1.5 block w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-900 shadow-[inset_0_1px_2px_rgb(0_0_0/0.35)] placeholder:font-normal placeholder:text-slate-400 transition-[border-color,box-shadow] duration-200 hover:border-slate-300 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/15 aria-[invalid=true]:border-red-400 aria-[invalid=true]:ring-red-500/15";

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
      <label htmlFor={htmlFor} className="block text-[13px] font-semibold text-slate-700">
        {label}
        {required && <span className="text-blue-500"> *</span>}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="mt-1.5 text-xs font-medium text-red-500">
          {error}
        </p>
      ) : (
        hint && <p className="mt-1.5 text-xs text-slate-500">{hint}</p>
      )}
    </div>
  );
}

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

/** Shows a form action's general error or success message. */
export function FormMessage({ state }: { state: { error?: string; message?: string } | undefined }) {
  if (state?.error) return <Alert tone="error">{state.error}</Alert>;
  if (state?.message) return <Alert tone="success">{state.message}</Alert>;
  return null;
}

/** aria attributes linking an input to its error message. */
export function ariaFor(error: string | undefined, id: string) {
  return error ? ({ "aria-invalid": true, "aria-describedby": `${id}-error` } as const) : {};
}

export type Tone = "green" | "amber" | "red" | "slate" | "blue";

/** Small glowing pill, e.g. subscription status. */
export function Badge({ tone = "slate", dot, children }: { tone?: Tone; dot?: boolean; children: ReactNode }) {
  const tones: Record<Tone, string> = {
    green: "bg-emerald-50 text-emerald-700 ring-emerald-300/60 [--dot:var(--color-emerald-500)]",
    amber: "bg-amber-50 text-amber-700 ring-amber-300/60 [--dot:var(--color-amber-500)]",
    red: "bg-red-50 text-red-700 ring-red-300/60 [--dot:var(--color-red-500)]",
    slate: "bg-slate-100 text-slate-600 ring-slate-200 [--dot:var(--color-slate-400)]",
    blue: "bg-blue-50 text-blue-700 ring-blue-300/60 [--dot:var(--color-blue-500)]",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${tones[tone]}`}>
      {dot && <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[var(--dot)] shadow-[0_0_8px_var(--dot)]" />}
      {children}
    </span>
  );
}

/** Table header cell / body cell styles used by every list. */
export const th = "px-3 py-3 text-left text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 first:pl-6 last:pr-6";
export const td = "px-3 py-3.5 first:pl-6 last:pr-6";

export function EmptyState({ children, icon = "inbox" }: { children: ReactNode; icon?: IconName }) {
  const Icon = icons[icon];
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-14 text-center text-sm text-slate-500">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-glass-strong text-blue-500 ring-1 ring-line">
        <Icon width={22} height={22} />
      </span>
      <div className="max-w-sm">{children}</div>
    </div>
  );
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
  const linkCls = "rounded-xl border border-line bg-glass px-3 py-1.5 font-semibold text-slate-800 transition hover:border-blue-300 hover:text-blue-700";
  const offCls = "rounded-xl border border-line px-3 py-1.5 text-slate-400";
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-6 py-3.5 text-sm text-slate-500">
      <span>
        {total === 0
          ? `0 ${noun}`
          : `Showing ${((page - 1) * pageSize + 1).toLocaleString("en-US")}–${Math.min(page * pageSize, total).toLocaleString("en-US")} of ${total.toLocaleString("en-US")}`}
      </span>
      {pages > 1 && (
        <div className="flex items-center gap-2">
          {page > 1 ? <Link href={href(page - 1)} className={linkCls}>← Previous</Link> : <span className={offCls}>← Previous</span>}
          <span className="px-1 font-medium text-slate-600">
            Page {page} of {pages}
          </span>
          {page < pages ? <Link href={href(page + 1)} className={linkCls}>Next →</Link> : <span className={offCls}>Next →</span>}
        </div>
      )}
    </div>
  );
}

/** Breadcrumb trail: [["Schools", "/super-admin/schools"], ["Green Valley"]] */
export function Crumbs({ items }: { items: [string, string?][] }) {
  return (
    <>
      {items.map(([label, href], i) => (
        <span key={i}>
          {i > 0 && <span className="px-1.5 text-slate-400">/</span>}
          {href ? (
            <Link href={href} className="text-blue-700 transition-colors hover:text-blue-800">
              {label}
            </Link>
          ) : (
            <span className="text-slate-600">{label}</span>
          )}
        </span>
      ))}
    </>
  );
}

/** Filter row at the top of a list card (plain GET form). */
export const filterBar = "flex flex-wrap items-end gap-3 border-b border-line p-4 sm:px-6";
/** Table header row and body row styles shared by every list. */
export const theadRow = "bg-[rgb(255_255_255/0.025)]";
export const tbodyRow = "transition-colors duration-150 hover:bg-[rgb(229_192_123/0.045)]";
/** Bold row title link (e.g. a school or student name in a table). */
export const rowLink = "font-bold text-slate-900 transition-colors hover:text-blue-700";
/** Small "Clear filters" style text link. */
export const subtleLink = "py-2 text-sm font-semibold text-slate-500 transition-colors hover:text-blue-700";
