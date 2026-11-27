import type { SVGProps } from "react";

/* Small line icons (24×24, 1.75 stroke) drawn for this app. */

type P = SVGProps<SVGSVGElement>;

function Icon({ children, ...props }: P) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={18}
      height={18}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      {children}
    </svg>
  );
}

export const icons = {
  dashboard: (p: P) => (
    <Icon {...p}>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </Icon>
  ),
  school: (p: P) => (
    <Icon {...p}>
      <path d="M3 10 12 4l9 6" />
      <path d="M5 10v10h14V10" />
      <path d="M10 20v-5h4v5" />
      <path d="M3 20h18" />
    </Icon>
  ),
  plans: (p: P) => (
    <Icon {...p}>
      <path d="m12 3 9 5-9 5-9-5 9-5Z" />
      <path d="m3 13 9 5 9-5" />
    </Icon>
  ),
  subscriptions: (p: P) => (
    <Icon {...p}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
      <path d="m9 15 2 2 4-4" />
    </Icon>
  ),
  payments: (p: P) => (
    <Icon {...p}>
      <rect x="2.5" y="5" width="19" height="14" rx="2" />
      <path d="M2.5 10h19M6.5 15h4" />
    </Icon>
  ),
  storage: (p: P) => (
    <Icon {...p}>
      <ellipse cx="12" cy="5.5" rx="8" ry="2.5" />
      <path d="M4 5.5v13c0 1.4 3.6 2.5 8 2.5s8-1.1 8-2.5v-13" />
      <path d="M4 12c0 1.4 3.6 2.5 8 2.5s8-1.1 8-2.5" />
    </Icon>
  ),
  bell: (p: P) => (
    <Icon {...p}>
      <path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16Z" />
      <path d="M10 20.5a2 2 0 0 0 4 0" />
    </Icon>
  ),
  settings: (p: P) => (
    <Icon {...p}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
    </Icon>
  ),
  scan: (p: P) => (
    <Icon {...p}>
      <path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16" />
      <rect x="8" y="8" width="3" height="3" rx=".5" />
      <rect x="13" y="13" width="3" height="3" rx=".5" />
      <path d="M13 8h3v3M8 13v3h3" />
    </Icon>
  ),
  register: (p: P) => (
    <Icon {...p}>
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <path d="M3 9h18M9 9v12M15 9v12M3 15h18" />
    </Icon>
  ),
  students: (p: P) => (
    <Icon {...p}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5a6.5 6.5 0 0 1 3.5 5.5" />
    </Icon>
  ),
  classes: (p: P) => (
    <Icon {...p}>
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
    </Icon>
  ),
  import: (p: P) => (
    <Icon {...p}>
      <path d="M12 15V3M7 8l5-5 5 5" />
      <path d="M4 14v5a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5" />
    </Icon>
  ),
  cards: (p: P) => (
    <Icon {...p}>
      <rect x="2.5" y="5" width="19" height="14" rx="2" />
      <circle cx="8.5" cy="11" r="2" />
      <path d="M5.5 16a3 3 0 0 1 6 0M14 10h4M14 13.5h4" />
    </Icon>
  ),
  info: (p: P) => (
    <Icon {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </Icon>
  ),
  checkCircle: (p: P) => (
    <Icon {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12.5 2.5 2.5L16 9.5" />
    </Icon>
  ),
  warning: (p: P) => (
    <Icon {...p}>
      <path d="M10.3 4.2 2.6 17.5A2 2 0 0 0 4.3 20.5h15.4a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9.5v4M12 17h.01" />
    </Icon>
  ),
  error: (p: P) => (
    <Icon {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="m9 9 6 6M15 9l-6 6" />
    </Icon>
  ),
  userCheck: (p: P) => (
    <Icon {...p}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <path d="m16 11 2 2 4-4" />
    </Icon>
  ),
  clock: (p: P) => (
    <Icon {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </Icon>
  ),
  wallet: (p: P) => (
    <Icon {...p}>
      <path d="M4 7a2 2 0 0 1 2-2h11v4" />
      <path d="M4 7v11a2 2 0 0 0 2 2h13a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1H6a2 2 0 0 1-2-2Z" />
      <circle cx="16" cy="14.5" r="1.2" />
    </Icon>
  ),
  pulse: (p: P) => (
    <Icon {...p}>
      <path d="M3 12h4l2.5-6 5 12L17 12h4" />
    </Icon>
  ),
  chart: (p: P) => (
    <Icon {...p}>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </Icon>
  ),
  plus: (p: P) => (
    <Icon {...p}>
      <path d="M12 5v14M5 12h14" />
    </Icon>
  ),
  arrowRight: (p: P) => (
    <Icon {...p}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </Icon>
  ),
  search: (p: P) => (
    <Icon {...p}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </Icon>
  ),
  download: (p: P) => (
    <Icon {...p}>
      <path d="M12 4v11M7 10l5 5 5-5" />
      <path d="M4 19h16" />
    </Icon>
  ),
  printer: (p: P) => (
    <Icon {...p}>
      <path d="M7 8V3h10v5" />
      <rect x="3" y="8" width="18" height="9" rx="2" />
      <path d="M7 14h10v7H7z" />
    </Icon>
  ),
  inbox: (p: P) => (
    <Icon {...p}>
      <path d="M3 13h5l1.5 3h5L16 13h5" />
      <path d="M5.5 5h13L21 13v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-6l2.5-8Z" />
    </Icon>
  ),
  logout: (p: P) => (
    <Icon {...p}>
      <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" />
      <path d="M10 17l-5-5 5-5M5 12h11" />
    </Icon>
  ),
};

export type IconName = keyof typeof icons;

/** The app mark: a check in a metallic gold tile (also the favicon). Pure CSS fill, so any number can share a page. */
export function LogoMark({ size = 34 }: { size?: number }) {
  return (
    <span
      aria-hidden
      className="bg-metal-gold inline-flex shrink-0 items-center justify-center shadow-gold"
      style={{ width: size, height: size, borderRadius: size * 0.27 }}
    >
      <svg viewBox="0 0 64 64" width={size * 0.72} height={size * 0.72}>
        <path d="M14 33.5 27 45.5l23-26" fill="none" stroke="#070b0a" strokeWidth="7.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}
