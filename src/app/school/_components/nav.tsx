import type { NavItem } from "@/components/side-nav";

/** School Admin menu. */
export const SCHOOL_NAV: NavItem[] = [
  { href: "/school", label: "Dashboard", icon: "dashboard", exact: true },
  { href: "/school/scan", label: "Scan QR", icon: "scan" },
  { href: "/school/attendance", label: "Register", icon: "register" },
  { href: "/school/students", label: "Students", icon: "students" },
  { href: "/school/classes", label: "Classes", icon: "classes" },
  { href: "/school/import", label: "Import", icon: "import" },
  { href: "/school/cards", label: "Cards", icon: "cards" },
  { href: "/school/notifications", label: "Notifications", icon: "bell" },
];
