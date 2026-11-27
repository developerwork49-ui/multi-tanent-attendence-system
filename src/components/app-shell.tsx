import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { logout } from "@/lib/auth/actions";
import { getPlatformSettings } from "@/lib/settings";
import { initials } from "@/lib/students";
import { LogoMark, icons } from "@/components/icons";

export type ShellUser = { name: string; subtitle: string; accountHref: string };

/**
 * The app frame shared by both panels: a sleek dark glass sidebar on large
 * screens (brand, menu, signed-in user) and a compact sticky top bar with
 * a scrollable menu on phones. Hidden when printing.
 *
 *   nav  - the menu (already wrapped in Suspense by the caller)
 *   user - resolves the signed-in user (streams in)
 */
export function AppShell({ nav, user, panelLabel, children }: { nav: ReactNode; user: ReactNode; panelLabel: string; children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col lg:flex-row">
      <aside className="sticky top-0 z-30 flex flex-col border-b border-line bg-[rgb(6_10_9/0.78)] backdrop-blur-2xl lg:fixed lg:inset-y-0 lg:left-0 lg:w-[17rem] lg:border-b-0 lg:border-r print:hidden">
        {/* gold edge light */}
        <span aria-hidden className="pointer-events-none absolute inset-y-0 right-0 hidden w-px bg-gradient-to-b from-transparent via-[rgb(229_192_123/0.35)] to-transparent lg:block" />
        <span aria-hidden className="pointer-events-none absolute -left-24 -top-24 hidden h-64 w-64 rounded-full bg-[rgb(229_192_123/0.08)] blur-3xl lg:block" />

        <div className="relative flex items-center gap-3 px-4 py-3 lg:px-6 lg:pb-8 lg:pt-8">
          <Link href="/" className="shrink-0 transition-transform duration-300 hover:rotate-[-4deg] hover:scale-105" aria-label="Home">
            <LogoMark size={38} />
          </Link>
          <div className="min-w-0 flex-1">
            <Suspense fallback={<BrandName name="Attendance" />}>
              <PlatformName />
            </Suspense>
            <p className="truncate text-[10px] font-bold uppercase tracking-[0.22em] text-blue-500">{panelLabel}</p>
          </div>
          {/* Phones: compact account + sign-out in the top bar */}
          <div className="lg:hidden">{user}</div>
        </div>

        <p className="relative hidden px-8 pb-3 text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400 lg:block">Menu</p>
        {nav}

        <div className="relative mt-auto hidden p-4 lg:block">
          <div className="rounded-2xl border border-line bg-glass p-2">{user}</div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col lg:pl-[17rem] print:pl-0">
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-10 print:max-w-none print:p-0">{children}</main>
      </div>
    </div>
  );
}

function BrandName({ name }: { name: string }) {
  return <p className="truncate text-base font-extrabold tracking-tight text-slate-900">{name}</p>;
}

async function PlatformName() {
  const { platformName } = await getPlatformSettings();
  return <BrandName name={platformName} />;
}

/** Signed-in user: avatar + name linking to "My account", and a sign-out button. */
export function UserMenu({ user }: { user: ShellUser }) {
  return (
    <div className="flex items-center gap-2">
      <Link
        href={user.accountHref}
        title="My account"
        className="group flex min-w-0 items-center gap-3 rounded-xl transition-colors lg:flex-1 lg:p-1 lg:hover:bg-[rgb(255_255_255/0.04)]"
      >
        <span className="bg-metal-gold flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-black text-canvas shadow-gold">
          {initials(user.name)}
        </span>
        <span className="hidden min-w-0 lg:block">
          <span className="block truncate text-sm font-bold text-slate-900">{user.name}</span>
          <span className="block truncate text-xs text-slate-500">{user.subtitle}</span>
        </span>
      </Link>
      <form action={logout}>
        <button
          type="submit"
          title="Sign out"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-line text-slate-500 transition-all duration-200 hover:scale-105 hover:border-red-300 hover:bg-red-50 hover:text-red-500"
        >
          <icons.logout />
          <span className="sr-only">Sign out</span>
        </button>
      </form>
    </div>
  );
}

/** Same-size placeholder while the user loads. */
export function UserMenuSkeleton() {
  return (
    <div className="flex items-center gap-3 lg:p-1">
      <span className="h-9 w-9 animate-pulse rounded-xl bg-slate-100" />
      <span className="hidden h-8 flex-1 animate-pulse rounded-lg bg-slate-100 lg:block" />
    </div>
  );
}
