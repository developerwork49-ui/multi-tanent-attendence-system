import type { Metadata } from "next";
import { Suspense } from "react";
import { requireSchoolAdmin } from "@/lib/auth/dal";
import { unreadCount } from "@/lib/notifications";
import { getPlatformSettings } from "@/lib/settings";
import { AppShell, UserMenu, UserMenuSkeleton } from "@/components/app-shell";
import { SideNav, SideNavFallback } from "@/components/side-nav";
import { SCHOOL_NAV } from "./_components/nav";

export async function generateMetadata(): Promise<Metadata> {
  const { platformName } = await getPlatformSettings();
  return { title: { default: platformName, template: `%s · ${platformName}` } };
}

export default function SchoolLayout({ children }: LayoutProps<"/school">) {
  return (
    <AppShell
      panelLabel="School Admin"
      nav={
        <Suspense fallback={<SideNavFallback items={SCHOOL_NAV} label="School" />}>
          <Nav />
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

/** Menu with the unread-notifications badge. */
async function Nav() {
  const user = await requireSchoolAdmin();
  const unread = await unreadCount(user);
  return <SideNav items={SCHOOL_NAV} label="School" badges={{ "/school/notifications": unread }} />;
}

async function User() {
  const user = await requireSchoolAdmin();
  return <UserMenu user={{ name: user.fullName, subtitle: user.school.name, accountHref: "/school/account" }} />;
}
