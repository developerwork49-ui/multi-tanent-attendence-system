"use client";

import Link from "next/link";
import { createContext, useContext, useState, type ComponentProps, type ReactNode } from "react";
import { motion, type HTMLMotionProps, type Transition } from "framer-motion";
import { icons, type IconName } from "@/components/icons";
import { buttonClass, type ButtonVariant } from "@/components/button-styles";

export { buttonClass, type ButtonVariant };

/*
 * Animated building blocks (Framer Motion). Everything here is a Client
 * Component; Server Components can render them like any other component.
 */

export const EASE_OUT: Transition["ease"] = [0.22, 1, 0.36, 1];
const SPRING: Transition = { type: "spring", stiffness: 420, damping: 26, mass: 0.7 };

// ---------------------------------------------------------------------
//  Page transition (used by template.tsx files)
// ---------------------------------------------------------------------

/** True while an outer page transition is still playing. */
const TransitionBusy = createContext(false);

/**
 * Fades and slides a page in when it is first shown or navigated to.
 * Nested templates that mount together with an outer one stay still, so a
 * page never animates twice. The decision is made once, at mount.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const outerBusy = useContext(TransitionBusy);
  const [animateIn] = useState(() => !outerBusy);
  const [busy, setBusy] = useState(animateIn);

  if (!animateIn) {
    return (
      <TransitionBusy.Provider value={outerBusy}>
        <div data-page="">{children}</div>
      </TransitionBusy.Provider>
    );
  }
  return (
    <TransitionBusy.Provider value={busy}>
      <motion.div
        data-page=""
        initial={{ opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: EASE_OUT }}
        onAnimationComplete={() => setBusy(false)}
      >
        {children}
      </motion.div>
    </TransitionBusy.Provider>
  );
}

/** One-off entrance for a block (fade + slide up), with an optional delay. */
export function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: EASE_OUT }}
    >
      {children}
    </motion.div>
  );
}

// ---------------------------------------------------------------------
//  Buttons
// ---------------------------------------------------------------------

const hover = { scale: 1.05 };
const tap = { scale: 0.96 };

export function Button({
  variant = "primary",
  className = "",
  disabled,
  ...props
}: ComponentProps<"button"> & { variant?: ButtonVariant }) {
  return (
    <motion.button
      whileHover={disabled ? undefined : hover}
      whileTap={disabled ? undefined : tap}
      transition={SPRING}
      disabled={disabled}
      className={buttonClass(variant, className)}
      {...(props as HTMLMotionProps<"button">)}
    />
  );
}

const MotionLink = motion.create(Link);

export function ButtonLink({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variant?: ButtonVariant }) {
  return (
    <MotionLink
      whileHover={hover}
      whileTap={tap}
      transition={SPRING}
      className={buttonClass(variant, className)}
      {...(props as ComponentProps<typeof MotionLink>)}
    />
  );
}

// ---------------------------------------------------------------------
//  Stat cards
// ---------------------------------------------------------------------

export type StatTone = "gold" | "mint" | "red" | "amber" | "slate";

const chipTone: Record<StatTone, string> = {
  gold: "bg-metal-gold text-canvas shadow-gold",
  mint: "bg-gradient-to-br from-emerald-400 to-emerald-600 text-canvas shadow-mint-glow",
  red: "bg-gradient-to-br from-red-400 to-red-600 text-canvas shadow-[0_0_24px_-6px_rgb(239_68_68/0.6)]",
  amber: "bg-gradient-to-br from-amber-400 to-amber-600 text-canvas shadow-[0_0_24px_-6px_rgb(249_115_22/0.6)]",
  slate: "bg-glass-strong text-slate-700 ring-1 ring-line",
};
const glowTone: Record<StatTone, string> = {
  gold: "bg-[rgb(229_192_123/0.22)]",
  mint: "bg-[rgb(52_211_153/0.2)]",
  red: "bg-[rgb(248_113_113/0.2)]",
  amber: "bg-[rgb(251_146_60/0.2)]",
  slate: "bg-[rgb(255_255_255/0.06)]",
};

const statItem = {
  hidden: { opacity: 0, y: 18, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: EASE_OUT } },
};

/** A row of stat cards that cascade in one after another. */
export function StatGrid({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <motion.dl
      className={`grid gap-4 ${className}`}
      initial="hidden"
      animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.12 } } }}
    >
      {children}
    </motion.dl>
  );
}

/** One big number on a glass card, with a glowing icon chip and a reflection. */
export function Stat({
  label,
  value,
  hint,
  icon,
  tone = "gold",
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: IconName;
  tone?: StatTone;
}) {
  const Icon = icon ? icons[icon] : null;
  return (
    <motion.div
      variants={statItem}
      whileHover={{ y: -5 }}
      transition={SPRING}
      className="glass group relative overflow-hidden rounded-3xl p-5 transition-shadow duration-300 hover:shadow-card-hover"
    >
      {/* glow */}
      <span aria-hidden className={`pointer-events-none absolute -right-12 -top-14 h-40 w-40 rounded-full blur-3xl transition-opacity duration-500 ${glowTone[tone]} opacity-70 group-hover:opacity-100`} />
      {/* glass reflection */}
      <span aria-hidden className="pointer-events-none absolute inset-0 bg-[linear-gradient(140deg,rgb(255_255_255/0.09)_0%,rgb(255_255_255/0.02)_32%,transparent_55%)]" />
      <span aria-hidden className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[rgb(229_192_123/0.7)] to-transparent" />
      <div className="relative flex items-start justify-between gap-3">
        <dt className="pt-1 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">{label}</dt>
        {Icon && (
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${chipTone[tone]}`}>
            <Icon width={19} height={19} strokeWidth={2.1} />
          </span>
        )}
      </div>
      <dd className="text-headline relative mt-3 text-4xl font-black leading-none tracking-tight tabular-nums sm:text-[2.75rem]">{value}</dd>
      {hint && <dd className="relative mt-2.5 text-xs font-medium text-slate-500">{hint}</dd>}
    </motion.div>
  );
}

// ---------------------------------------------------------------------
//  Alerts (toast-style banners)
// ---------------------------------------------------------------------

export type AlertTone = "info" | "success" | "error" | "warning";

const alertTone: Record<AlertTone, { icon: IconName; chip: string; bar: string; wash: string; text: string }> = {
  info: { icon: "info", chip: "bg-blue-100 text-blue-500 ring-blue-300", bar: "from-gold-bright to-gold-deep", wash: "from-blue-50", text: "text-slate-700" },
  success: { icon: "checkCircle", chip: "bg-emerald-100 text-emerald-500 ring-emerald-300", bar: "from-emerald-400 to-emerald-600", wash: "from-emerald-50", text: "text-slate-700" },
  error: { icon: "error", chip: "bg-red-100 text-red-500 ring-red-300", bar: "from-red-400 to-red-600", wash: "from-red-50", text: "text-slate-700" },
  warning: { icon: "warning", chip: "bg-amber-100 text-amber-500 ring-amber-300", bar: "from-amber-400 to-amber-600", wash: "from-amber-50", text: "text-slate-700" },
};

export function Alert({ tone = "info", title, children }: { tone?: AlertTone; title?: ReactNode; children?: ReactNode }) {
  const t = alertTone[tone];
  const Icon = icons[t.icon];
  return (
    <motion.div
      role={tone === "error" ? "alert" : "status"}
      initial={{ opacity: 0, y: -8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: EASE_OUT }}
      className="glass relative flex items-start gap-3.5 overflow-hidden rounded-2xl py-3.5 pl-5 pr-4 text-sm"
    >
      <span aria-hidden className={`pointer-events-none absolute inset-y-0 left-0 w-1 bg-gradient-to-b ${t.bar}`} />
      <span aria-hidden className={`pointer-events-none absolute inset-0 bg-gradient-to-r ${t.wash} to-transparent to-60%`} />
      <span className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ring-1 ${t.chip}`}>
        <Icon width={17} height={17} strokeWidth={2.2} />
      </span>
      <div className={`relative min-w-0 flex-1 self-center leading-relaxed ${t.text}`}>
        {title && <p className="font-bold text-slate-900">{title}</p>}
        {children}
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------
//  Charts and meters
// ---------------------------------------------------------------------

export type Bar = { key: string; label: string; value: number; highlight?: boolean; muted?: boolean };

/** Vertical bar chart with gradient bars that grow in. */
export function BarChart({ bars, max, ariaLabel }: { bars: Bar[]; max: number; ariaLabel: string }) {
  const top = Math.max(1, max);
  return (
    <div className="relative flex h-full min-h-56 flex-col" role="img" aria-label={ariaLabel}>
      {/* guide lines */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-7 top-6 flex flex-col justify-between">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className="border-t border-dashed border-[rgb(255_255_255/0.06)]" />
        ))}
      </div>
      <div className="relative flex flex-1 items-end gap-2 sm:gap-3">
        {bars.map((b, i) => {
          const pct = Math.max(3, (b.value / top) * 88);
          const fill = b.highlight
            ? "bg-metal-gold shadow-gold-glow"
            : b.muted
              ? "bg-gradient-to-t from-[rgb(255_255_255/0.03)] to-[rgb(255_255_255/0.12)]"
              : "bg-gradient-to-t from-[rgb(212_175_55/0.12)] via-[rgb(229_192_123/0.45)] to-[rgb(246_226_173/0.85)]";
          return (
            <div key={b.key} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
              <div className="relative flex w-full max-w-14 flex-1 items-end">
                <motion.span
                  className={`absolute left-1/2 mb-1.5 -translate-x-1/2 text-xs font-extrabold tabular-nums ${b.highlight ? "text-blue-700" : "text-slate-600"}`}
                  initial={{ bottom: "0%", opacity: 0 }}
                  animate={{ bottom: `${pct}%`, opacity: 1 }}
                  transition={{ delay: 0.15 + i * 0.06, duration: 0.8, ease: EASE_OUT }}
                >
                  {b.value}
                </motion.span>
                <motion.div
                  className={`w-full rounded-t-xl rounded-b-md ${fill}`}
                  initial={{ height: 0 }}
                  animate={{ height: `${pct}%` }}
                  transition={{ delay: 0.15 + i * 0.06, duration: 0.8, ease: EASE_OUT }}
                />
              </div>
              <span className={`text-xs ${b.highlight ? "font-bold text-blue-700" : "font-medium text-slate-500"}`}>{b.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Horizontal progress bar that fills in (e.g. storage used). */
export function Meter({ percent, tone, label }: { percent: number; tone: "ok" | "warning" | "full"; label: string }) {
  const pct = Math.max(0, Math.min(100, percent));
  const fill =
    tone === "full"
      ? "from-red-400 to-red-600 shadow-[0_0_16px_-2px_rgb(239_68_68/0.7)]"
      : tone === "warning"
        ? "from-amber-400 to-amber-600 shadow-[0_0_16px_-2px_rgb(249_115_22/0.7)]"
        : "from-emerald-400 via-emerald-500 to-[#e5c07b] shadow-[0_0_16px_-2px_rgb(52_211_153/0.6)]";
  return (
    <div
      className="h-2.5 w-full overflow-hidden rounded-full bg-[rgb(255_255_255/0.06)] ring-1 ring-inset ring-[rgb(255_255_255/0.05)]"
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
    >
      <motion.div
        className={`h-full rounded-full bg-gradient-to-r ${fill}`}
        initial={{ width: 0 }}
        animate={{ width: `${Math.max(pct, pct > 0 ? 1.5 : 0)}%` }}
        transition={{ duration: 1, delay: 0.2, ease: EASE_OUT }}
      />
    </div>
  );
}
