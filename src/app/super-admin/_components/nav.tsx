import type { NavItem } from "@/components/side-nav";

/** Super Admin menu. */
export const SUPER_ADMIN_NAV: NavItem[] = [
  { href: "/super-admin", label: "Dashboard", icon: "dashboard", exact: true },
  { href: "/super-admin/schools", label: "Schools", icon: "school" },
  { href: "/super-admin/plans", label: "Plans", icon: "plans" },
  { href: "/super-admin/subscriptions", label: "Subscriptions", icon: "subscriptions" },
  { href: "/super-admin/payments", label: "Payments", icon: "payments" },
  { href: "/super-admin/storage", label: "Storage", icon: "storage" },
  { href: "/super-admin/notifications", label: "Notifications", icon: "bell" },
  { href: "/super-admin/settings", label: "Settings", icon: "settings" },
];
