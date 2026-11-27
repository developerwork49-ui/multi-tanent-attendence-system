"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { icons, type IconName } from "@/components/icons";

export type NavItem = { href: string; label: string; icon: IconName; exact?: boolean };

/**
 * The panel menu: a vertical list in the sidebar on large screens, a
 * scrollable row of pills on phones and tablets. The glowing gold pill
 * glides to the current page.
 */
export function SideNav({ items, badges, label }: { items: NavItem[]; badges?: Record<string, number>; label: string }) {
  return <NavList items={items} badges={badges} label={label} pathname={usePathname()} />;
}

/** Same menu without the current-page highlight (shown while the URL is read). */
export function SideNavFallback({ items, label }: { items: NavItem[]; label: string }) {
  return <NavList items={items} label={label} pathname="" />;
}

function NavList({ items, badges, label, pathname }: { items: NavItem[]; badges?: Record<string, number>; label: string; pathname: string }) {
  const ref = useRef<HTMLElement>(null);
  // Phones: keep the current page's pill visible in the scrolling row.
  useEffect(() => {
    const nav = ref.current;
    const active = nav?.querySelector<HTMLElement>('[aria-current="page"]');
    if (nav && active && nav.scrollWidth > nav.clientWidth) {
      nav.scrollTo({ left: active.offsetLeft - nav.clientWidth / 2 + active.clientWidth / 2, behavior: "instant" });
    }
  }, [pathname]);

  return (
    <nav
      ref={ref}
      aria-label={label}
      className="relative flex gap-1 overflow-x-auto px-3 pb-3 [scrollbar-width:none] lg:flex-col lg:gap-1.5 lg:overflow-visible lg:px-4 lg:pb-0"
    >
      {items.map((item) => {
        const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + "/");
        const Icon = icons[item.icon];
        const badge = badges?.[item.href] ?? 0;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`group relative flex shrink-0 items-center gap-3 whitespace-nowrap rounded-2xl px-3.5 py-2.5 text-sm font-semibold transition-colors duration-200 ${
              active ? "text-blue-800" : "text-slate-500 hover:bg-[rgb(255_255_255/0.04)] hover:text-slate-900"
            }`}
          >
            {active && (
              <motion.span
                layoutId={`nav-pill-${label}`}
                aria-hidden
                className="absolute inset-0 rounded-2xl bg-gradient-to-r from-[rgb(229_192_123/0.2)] via-[rgb(229_192_123/0.09)] to-[rgb(229_192_123/0.03)] shadow-[inset_0_0_0_1px_rgb(229_192_123/0.35),0_0_24px_-6px_rgb(229_192_123/0.45)]"
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
              >
                <span className="absolute inset-y-2.5 -left-px hidden w-[3px] rounded-full bg-metal-gold shadow-[0_0_12px_rgb(229_192_123/0.9)] lg:block" />
              </motion.span>
            )}
            <Icon
              className={`relative transition-transform duration-200 group-hover:scale-110 ${active ? "text-blue-500 drop-shadow-[0_0_6px_rgb(229_192_123/0.8)]" : "text-slate-500 group-hover:text-blue-500"}`}
              strokeWidth={active ? 2.2 : 1.9}
            />
            <span className="relative">{item.label}</span>
            {badge > 0 && (
              <span
                className="relative ml-auto rounded-full bg-metal-gold px-1.5 py-0.5 text-[11px] font-extrabold leading-none text-canvas shadow-gold-glow"
                aria-label={`${badge} unread`}
              >
                {badge > 99 ? "99+" : badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
