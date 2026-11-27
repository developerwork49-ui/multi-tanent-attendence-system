import type { Metadata } from "next";
import { Suspense } from "react";
import { requireSuperAdmin } from "@/lib/auth/dal";
import { getPlatformSettings } from "@/lib/settings";
import { AppShell, UserMenu, UserMenuSkeleton } from "@/components/app-shell";
import { SideNav, SideNavFallback } from "@/components/side-nav";
import { SUPER_ADMIN_NAV } from "./_components/nav";

export async function generateMetadata(): Promise<Metadata> {
  const { platformName } = await getPlatformSettings();
  return { title: { default: platformName, template: `%s · ${platformName}` } };
}

export default function SuperAdminLayout({ children }: LayoutProps<"/super-admin">) {
  return (
    <AppShell
      panelLabel="Super Admin"
      nav={
        <Suspense fallback={<SideNavFallback items={SUPER_ADMIN_NAV} label="Super Admin" />}>
          <SideNav items={SUPER_ADMIN_NAV} label="Super Admin" />
        </Suspense>
      }
      user={
        <Suspense fallback={<UserMenuSkeleton />}>
          <User />
        </Suspense>
      }
    >
      {children}
    </AppShell>
  );
}

async function User() {
  const user = await requireSuperAdmin();
  return <UserMenu user={{ name: user.fullName, subtitle: "Platform owner", accountHref: "/super-admin/account" }} />;
}
