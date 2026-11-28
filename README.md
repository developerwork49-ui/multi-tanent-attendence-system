# Student Attendance SaaS

A multi-school attendance system. A **Super Admin** runs the platform: schools, School Admin logins, plans, subscriptions, payments and storage. Each **School Admin** manages only their own school: students, classes, Excel import, printable QR ID cards, QR attendance scanning and the monthly register.

Every school's data is walled off twice: in the application code, and by **PostgreSQL Row-Level Security**. The database itself refuses to show or change another school's rows.

## Tech

Next.js 16 (App Router, Server Actions) · React 19 · Prisma 7 · PostgreSQL · Tailwind CSS 4 · Zod.
Small helpers: `qrcode` (QR images), `jsqr` (camera decoding fallback), `read-excel-file` / `write-excel-file` (import + template).

## Design

Clean, professional white and black interface (Inter font, hairline borders, no animation library). Colour is used only for meaning: green = present/active, red = absent/error, amber = warning.

- Shared building blocks live in `src/components/ui.tsx` (PageHeader, Card, Stat/StatGrid, Badge, Alert, Button, Field, table styles, Pagination, BarChart, Meter). Build new screens from these instead of styling by hand.
- Theme notes are at the top of `src/app/globals.css`.

## Local setup

1. PostgreSQL running locally with the `attendance_dev` and `attendance_shadow` databases (see `.env.example`).
2. `cp .env.example .env` and fill in the connection strings.
3. `npm install`
4. `npm run db:deploy` to apply all migrations (including Row-Level Security).
5. `npm run create-super-admin` to create the first Super Admin login (asks for the details).
6. `npm run dev` and open http://localhost:3000 (development mode: each page is compiled the first time you open it, so first visits are slow).
7. For normal speed use the production build: `npm run preview` (= `next build && next start`), then open http://localhost:3000.

Forgot a password? `npm run reset-password` (asks for the email and a new hidden password; signs that account out everywhere).

## Checks

| Command | What it checks |
| --- | --- |
| `npm run typecheck` | TypeScript |
| `npm run lint` | ESLint |
| `npm run db:test` | Database safety rules and Row-Level Security (runs in a transaction that is rolled back) |
| `npm run build && npm run test:e2e` | End-to-end tests against a production build on port 3123. Test data is marked and removed afterwards. |

## Main areas

| Path | Who | What |
| --- | --- | --- |
| `/super-admin` | Super Admin | Dashboard, "needs attention" list, recent activity |
| `/super-admin/schools` | Super Admin | Create/edit schools, School Admins, subscription, payments |
| `/super-admin/plans`, `/subscriptions`, `/payments`, `/storage` | Super Admin | Billing and storage overview |
| `/super-admin/notifications` | Super Admin | Send messages to one school or all schools; see who read them |
| `/super-admin/settings` | Super Admin | Platform name, support contact, upgrade message, default time zone |
| `/school` | School Admin | Dashboard: present today, 7-day chart, storage, subscription |
| `/school/scan` | School Admin | QR attendance: camera, or a USB/Bluetooth handheld scanner |
| `/school/attendance` | School Admin | Monthly register, manual edits, CSV export |
| `/school/students`, `/classes`, `/import`, `/cards` | School Admin | Students, classes, Excel/CSV import, printable cards |
| `/school/notifications` | School Admin | Messages from the platform (unread badge in the menu), account alerts, support contact |

## Important rules

- **QR codes** contain only a random token (`ATT1:<token>`), never personal data. Issuing a new code makes the old card stop working.
- **One attendance per student per day**, using the school's own time zone. The database key enforces this, so simultaneous scans can't double-count.
- **Storage quota** = the school's custom quota, otherwise its current plan's limit. When it is full, or there is no active plan, new students, imports and photos are blocked. **Taking attendance is never blocked.**
- **Students are never deleted once they have attendance history.** Deactivate them instead.
- Imports are all-or-nothing and are re-checked on import, even after a preview.
- Photos are resized in the browser and stored in the database (`student_photos`), so no extra file storage service is needed.

## Not done yet

- Deployment: Vercel, plus a separate non-owner database role for the running app (see the project notes).
- Email notifications (needs an email service account; messages are currently shown inside the app only).
