"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { icons, type IconName } from "@/components/icons";

export type NavItem = { href: string; label: string; icon: IconName; exact?: boolean };

/**
 * The panel menu: a vertical list in the sidebar on large screens, a
 * scrollable row on phones and tablets. The current page is shown as a
 * white, outlined item.
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
  // Phones: keep the current page visible in the scrolling row.
  useEffect(() => {
    const nav = ref.current;
    const active = nav?.querySelector<HTMLElement>('[aria-current="page"]');
    if (nav && active && nav.scrollWidth > nav.clientWidth) {
      nav.scrollTo({ left: active.offsetLeft - nav.clientWidth / 2 + active.clientWidth / 2, behavior: "instant" });
    }
  }, [pathname]);

  return (
    <nav ref={ref} aria-label={label} className="flex gap-0.5 overflow-x-auto px-3 pb-2.5 [scrollbar-width:none] lg:flex-col lg:overflow-visible lg:pb-0">
      {items.map((item) => {
        const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + "/");
        const Icon = icons[item.icon];
        const badge = badges?.[item.href] ?? 0;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-md px-2.5 py-1.5 text-sm transition-colors ${
              active ? "bg-white font-medium text-zinc-950 shadow-xs ring-1 ring-zinc-200" : "text-zinc-600 hover:bg-zinc-200/60 hover:text-zinc-950"
            }`}
          >
            <Icon width={16} height={16} className={active ? "text-zinc-900" : "text-zinc-400"} />
            <span>{item.label}</span>
            {badge > 0 && (
              <span className="ml-auto rounded bg-zinc-900 px-1.5 py-px text-[11px] font-medium tabular-nums text-white" aria-label={`${badge} unread`}>
                {badge > 99 ? "99+" : badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
