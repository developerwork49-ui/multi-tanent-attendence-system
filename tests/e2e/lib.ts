/**
 * End-to-end test helpers.
 *
 * Tests run against a real production build (`npm run test:e2e` starts it)
 * and a real database. All test data uses the markers below and is removed
 * by cleanup(); real data is never touched.
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { PrismaClient } from "../../src/generated/prisma/client";
import { createDbAdapter } from "../../src/lib/db-adapter";
import { withSystemScope, type Tx } from "../../src/lib/db-scope";
import { hashPassword } from "../../src/lib/auth/password";

export const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3123";
export const EMAIL_DOMAIN = "e2e.example.test";
export const SLUG_PREFIX = "e2e-";
export const PLAN_PREFIX = "E2E ";

export const db = new PrismaClient({ adapter: createDbAdapter(process.env.DATABASE_URL!) });
export const sys = <T>(fn: (tx: Tx) => Promise<T>) => withSystemScope(db, fn, { timeout: 60_000 });

export const uid = () => randomBytes(4).toString("hex");
export const testEmail = (name: string) => `${name}-${uid()}@${EMAIL_DOMAIN}`;
export const testPassword = () => `Pw-${randomBytes(12).toString("base64url")}`;

/** Visible text of an HTML page (tags stripped, whitespace collapsed). */
export function text(html: string): string {
  return html
    .replace(/<!-- -->/g, "")
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/\s+/g, " ");
}

/**
 * Strings inside the streamed React payload (self.__next_f.push(...)).
 * After a no-JS form post, Next.js puts the action's result (e.g. an
 * error message) there instead of in the plain HTML.
 */
const SKIP_PROPS = new Set(["className", "style", "href", "src", "rel", "as", "type", "name", "content", "precedence", "crossOrigin", "nonce", "dangerouslySetInnerHTML"]);

export function rscText(html: string): string {
  const out: string[] = [];
  const walk = (v: unknown) => {
    // Keep human-readable strings only (skip React's internal references like "$L1f").
    if (typeof v === "string") {
      if (!v.startsWith("$") && !v.startsWith("/_next/") && /\s|^[\w.,!?'’:@-]+$/.test(v)) out.push(v);
    }
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") {
      for (const [k, x] of Object.entries(v)) if (!SKIP_PROPS.has(k)) walk(x);
    }
  };
  for (const m of html.matchAll(/self\.__next_f\.push\((\[[\s\S]*?\])\)<\/script>/g)) {
    try {
      const chunk = JSON.parse(m[1]);
      // [1, "<flight text>"]: parse each "id:json" row so only real values remain.
      if (chunk[0] === 1 && typeof chunk[1] === "string") {
        for (const line of chunk[1].split("\n")) {
          const row = /^[0-9a-f]+:(.*)$/.exec(line);
          if (!row) continue;
          try {
            walk(JSON.parse(row[1]));
          } catch {
            /* not JSON (module refs etc.) */
          }
        }
        continue;
      }
      walk(chunk);
    } catch {
      /* ignore partial chunks */
    }
  }
  return out.join(" ").replace(/\s+/g, " ");
}

/** True when the page tells the browser to go somewhere else (server redirect while streaming). */
export function redirectsTo(res: { html: string; location: string | null }, path: string): boolean {
  if (res.location && new URL(res.location, BASE).pathname === path) return true;
  return res.html.includes(`NEXT_REDIRECT;replace;${path};`) || res.html.includes(`NEXT_REDIRECT;push;${path};`);
}

/** Server Action id lookup from the build manifest (ids change every build). */
let manifest: Record<string, { exportedName?: string; filename?: string }> | undefined;
export function actionId(name: string, fileHint?: string): string {
  manifest ??= JSON.parse(readFileSync(".next/server/server-reference-manifest.json", "utf8")).node;
  const hits = Object.entries(manifest!).filter(
    ([, v]) => v.exportedName === name && (!fileHint || v.filename?.includes(fileHint)),
  );
  if (hits.length !== 1) throw new Error(`Action ${name} (${fileHint ?? ""}) found ${hits.length} times`);
  return hits[0][0];
}

/** Marks an argument as FormData for action calls. */
export class Form {
  constructor(public fields: Record<string, string | Blob>) {}
}

export type Res = { status: number; html: string; text: string; location: string | null; headers: Headers };

export class Client {
  cookie?: string;

  private async send(path: string, init: RequestInit = {}): Promise<Res> {
    const headers = new Headers(init.headers);
    if (this.cookie) headers.set("cookie", `sid=${this.cookie}`);
    headers.set("origin", BASE);
    const r = await fetch(BASE + path, { ...init, headers, redirect: "manual" });
    for (const c of r.headers.getSetCookie()) {
      const m = /^sid=([^;]*)/.exec(c);
      if (m) this.cookie = m[1] || undefined;
    }
    const html = await r.text();
    return { status: r.status, html, text: `${text(html)} ${rscText(html)}`, location: r.headers.get("location"), headers: r.headers };
  }

  get(path: string) {
    return this.send(path);
  }

  /** Submits a form the way a browser without JavaScript does (uses the page's hidden fields). */
  async submitForm(pagePath: string, fields: Record<string, string>, formIndex?: number): Promise<Res> {
    const page = await this.get(pagePath);
    const forms = page.html.split("<form").slice(1);
    // Default: the page's main form (one with form state), not e.g. the header's "Sign out" button.
    const form = (formIndex === undefined ? forms.find((f) => f.includes("$ACTION_REF_")) : forms[formIndex]) ?? "";
    const fd = new FormData();
    for (const m of form.matchAll(/<input type="hidden" name="(\$ACTION[^"]*)"(?: value="([^"]*)")?\/>/g)) {
      fd.append(decode(m[1]), decode(m[2] ?? ""));
    }
    for (const [k, v] of Object.entries(fields)) fd.append(k, v);
    return this.send(pagePath, { method: "POST", body: fd });
  }

  async login(email: string, password: string): Promise<Res> {
    return this.submitForm("/login", { email, password });
  }

  /**
   * Calls a Server Action exactly like the browser's JavaScript does
   * (React encodeReply format). Returns the decoded return value.
   */
  async action<T = unknown>(path: string, name: string, args: unknown[], fileHint?: string) {
    const fd = new FormData();
    let part = 0;
    const encoded = args.map((a) => {
      if (a instanceof Form) {
        part += 1;
        for (const [k, v] of Object.entries(a.fields)) fd.append(`_${part}_${k}`, v);
        return `$K${part.toString(16)}`;
      }
      if (a === undefined) return "$undefined";
      return escapeDollars(a);
    });
    fd.append("0", JSON.stringify(encoded));
    const res = await this.send(path, {
      method: "POST",
      body: fd,
      headers: { "next-action": actionId(name, fileHint), accept: "text/x-component" },
    });
    return { ...res, result: parseActionResult(res.html) as T, redirect: res.headers.get("x-action-redirect") };
  }
}

function escapeDollars(v: unknown): unknown {
  if (typeof v === "string") return v.startsWith("$") ? "$" + v : v;
  if (Array.isArray(v)) return v.map(escapeDollars);
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, escapeDollars(x)]));
  return v;
}

function decode(s: string) {
  return s.replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&#x27;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}

/** Pulls the action's return value out of the RSC response (row "1:"). */
function parseActionResult(body: string): unknown {
  for (const line of body.split("\n")) {
    const m = /^1:(.*)$/.exec(line);
    if (m) {
      try {
        return JSON.parse(m[1]);
      } catch {
        return m[1];
      }
    }
  }
  return undefined;
}

// ---------------------------------------------------------------------
//  Test data factories (all marked for cleanup)
// ---------------------------------------------------------------------

export async function makeSuperAdmin() {
  const email = testEmail("sa");
  const password = testPassword();
  const passwordHash = await hashPassword(password);
  const u = await sys((tx) => tx.user.create({ data: { role: "SUPER_ADMIN", email, fullName: "E2E Super Admin", passwordHash } }));
  return { id: u.id, email, password };
}

export async function makeSchool(opts: { status?: "ACTIVE" | "INACTIVE"; timezone?: string; quotaMb?: number | null; plan?: boolean } = {}) {
  const slug = `${SLUG_PREFIX}${uid()}`;
  const email = testEmail("admin");
  const password = testPassword();
  const passwordHash = await hashPassword(password);
  const school = await sys(async (tx) => {
    const s = await tx.school.create({
      data: {
        name: `E2E School ${slug}`,
        slug,
        timezone: opts.timezone ?? "Asia/Karachi",
        status: opts.status ?? "ACTIVE",
        storageQuotaOverrideBytes: opts.quotaMb ? BigInt(Math.round(opts.quotaMb * 1024 * 1024)) : null,
      },
    });
    await tx.user.create({ data: { role: "SCHOOL_ADMIN", schoolId: s.id, email, fullName: "E2E Admin", passwordHash } });
    if (opts.plan !== false) {
      const plan = await tx.plan.create({
        data: {
          name: `${PLAN_PREFIX}${uid()}`,
          storageLimitBytes: BigInt(100 * 1024 * 1024),
          priceMinor: 100000,
          currency: "PKR",
          billingPeriod: "MONTHLY",
        },
      });
      await tx.subscription.create({
        data: {
          schoolId: s.id,
          planId: plan.id,
          status: "ACTIVE",
          storageLimitBytes: plan.storageLimitBytes,
          priceMinor: plan.priceMinor,
          currency: plan.currency,
          startsAt: new Date(Date.now() - 86400000),
          endsAt: new Date(Date.now() + 30 * 86400000),
        },
      });
    }
    return s;
  });
  return { id: school.id, slug, name: school.name, admin: { email, password } };
}

/** Removes ALL e2e test data (and only that). */
export async function cleanup() {
  await db.$transaction(
    async (tx) => {
      await tx.$executeRawUnsafe(`SELECT set_config('app.role', 'system', true)`);
      const schools = `(SELECT id FROM schools WHERE slug LIKE '${SLUG_PREFIX}%')`;
      const users = `(SELECT id FROM users WHERE email LIKE '%@${EMAIL_DOMAIN}')`;
      await tx.$executeRawUnsafe(`ALTER TABLE audit_logs NO FORCE ROW LEVEL SECURITY`);
      await tx.$executeRawUnsafe(
        `DELETE FROM audit_logs WHERE school_id IN ${schools} OR actor_user_id IN ${users}
           OR (entity_type = 'user' AND entity_id IN (SELECT id::text FROM users WHERE email LIKE '%@${EMAIL_DOMAIN}'))
           OR (entity_type = 'plan' AND entity_id IN (SELECT id::text FROM plans WHERE name LIKE '${PLAN_PREFIX}%'))
           OR details->>'email' LIKE '%@${EMAIL_DOMAIN}'
           OR (entity_type = 'notification' AND entity_id IN (SELECT id::text FROM notifications WHERE created_by_id IN ${users}))`,
      );
      await tx.$executeRawUnsafe(`ALTER TABLE audit_logs FORCE ROW LEVEL SECURITY`);
      await tx.$executeRawUnsafe(`DELETE FROM notifications WHERE school_id IN ${schools} OR created_by_id IN ${users}`);
      for (const t of ["notification_reads", "attendance", "student_photos", "students", "class_groups", "payments", "subscriptions"]) {
        const exists = await tx.$queryRawUnsafe<{ e: boolean }[]>(`SELECT to_regclass('${t}') IS NOT NULL AS e`);
        if (exists[0].e) await tx.$executeRawUnsafe(`DELETE FROM ${t} WHERE school_id IN ${schools}`);
      }
      await tx.$executeRawUnsafe(`DELETE FROM subscriptions WHERE plan_id IN (SELECT id FROM plans WHERE name LIKE '${PLAN_PREFIX}%')`);
      await tx.$executeRawUnsafe(`DELETE FROM users WHERE email LIKE '%@${EMAIL_DOMAIN}'`);
      await tx.$executeRawUnsafe(`DELETE FROM schools WHERE slug LIKE '${SLUG_PREFIX}%'`);
      await tx.$executeRawUnsafe(`DELETE FROM plans WHERE name LIKE '${PLAN_PREFIX}%'`);
    },
    { timeout: 120_000 },
  );
}
