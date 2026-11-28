import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { logout } from "@/lib/auth/actions";
import { getPlatformSettings } from "@/lib/settings";
import { initials } from "@/lib/students";
import { LogoMark, icons } from "@/components/icons";

export type ShellUser = { name: string; subtitle: string; accountHref: string };

/**
 * The app frame shared by the admin panels: a light sidebar on large
 * screens (brand, menu, signed-in user) and a compact sticky top bar with
 * a scrollable menu on phones. Hidden when printing.
 *
 *   nav  - the menu (already wrapped in Suspense by the caller)
 *   user - resolves the signed-in user (streams in)
 */
export function AppShell({ nav, user, panelLabel, children }: { nav: ReactNode; user: ReactNode; panelLabel: string; children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col bg-white lg:flex-row">
      <aside className="sticky top-0 z-30 flex flex-col border-b border-zinc-200 bg-zinc-50 lg:fixed lg:inset-y-0 lg:left-0 lg:w-60 lg:border-b-0 lg:border-r print:hidden">
        <div className="flex items-center gap-2.5 px-4 py-3 lg:px-4 lg:pb-5 lg:pt-4">
          <Link href="/" className="shrink-0" aria-label="Home">
            <LogoMark size={28} />
          </Link>
          <div className="min-w-0 flex-1 leading-tight">
            <Suspense fallback={<BrandName name="Attendance" />}>
              <PlatformName />
            </Suspense>
            <p className="truncate text-xs text-zinc-500">{panelLabel}</p>
          </div>
          {/* Phones: compact account + sign-out in the top bar */}
          <div className="lg:hidden">{user}</div>
        </div>

        {nav}

        <div className="mt-auto hidden border-t border-zinc-200 p-3 lg:block">{user}</div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col lg:pl-60 print:pl-0">
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8 print:max-w-none print:p-0">{children}</main>
      </div>
    </div>
  );
}

function BrandName({ name }: { name: string }) {
  return <p className="truncate text-sm font-semibold text-zinc-950">{name}</p>;
}

async function PlatformName() {
  const { platformName } = await getPlatformSettings();
  return <BrandName name={platformName} />;
}

/** Signed-in user: initials + name linking to "My account", and a sign-out button. */
export function UserMenu({ user }: { user: ShellUser }) {
  return (
    <div className="flex items-center gap-1">
      <Link
        href={user.accountHref}
        title="My account"
        className="flex min-w-0 items-center gap-2.5 rounded-md transition-colors lg:flex-1 lg:p-1.5 lg:hover:bg-zinc-200/60"
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-[11px] font-medium text-white">
          {initials(user.name)}
        </span>
        <span className="hidden min-w-0 leading-tight lg:block">
          <span className="block truncate text-sm font-medium text-zinc-950">{user.name}</span>
          <span className="block truncate text-xs text-zinc-500">{user.subtitle}</span>
        </span>
      </Link>
      <form action={logout}>
        <button
          type="submit"
          title="Sign out"
          className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-200/60 hover:text-zinc-950"
        >
          <icons.logout width={16} height={16} />
          <span className="sr-only">Sign out</span>
        </button>
      </form>
    </div>
  );
}

/** Same-size placeholder while the user loads. */
export function UserMenuSkeleton() {
  return (
    <div className="flex items-center gap-2.5 lg:p-1.5">
      <span className="h-7 w-7 animate-pulse rounded-full bg-zinc-200" />
      <span className="hidden h-7 flex-1 animate-pulse rounded bg-zinc-200 lg:block" />
    </div>
  );
}
