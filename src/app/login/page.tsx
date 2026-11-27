import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser, homePathFor } from "@/lib/auth/dal";
import { getPlatformSettings } from "@/lib/settings";
import { LogoMark, icons, type IconName } from "@/components/icons";
import { PageTransition, Reveal } from "@/components/motion/motion-ui";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

const FEATURES: [IconName, string, string][] = [
  ["scan", "QR attendance in seconds", "Any camera or handheld scanner."],
  ["school", "Every school kept separate", "Each school sees only its own data."],
  ["register", "Registers that add up", "Monthly totals and one-click export."],
];

export default function LoginPage() {
  return (
    <main className="relative flex flex-1 items-stretch overflow-hidden">
      <Suspense fallback={null}>
        <RedirectIfSignedIn />
      </Suspense>

      {/* Brand side (large screens) */}
      <section className="relative hidden flex-1 flex-col justify-between overflow-hidden border-r border-line p-14 lg:flex">
        <div aria-hidden className="pointer-events-none absolute -left-40 -top-40 h-[560px] w-[560px] rounded-full bg-[rgb(229_192_123/0.13)] blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-56 right-[-10%] h-[480px] w-[480px] rounded-full bg-[rgb(16_185_129/0.12)] blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgb(255_255_255/0.025)_1px,transparent_1px),linear-gradient(90deg,rgb(255_255_255/0.025)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_at_30%_40%,black,transparent_75%)]" />

        <Reveal className="relative flex items-center gap-3">
          <LogoMark size={44} />
          <Suspense fallback={<span className="text-xl font-extrabold tracking-tight text-slate-900">Attendance</span>}>
            <PlatformName className="text-xl font-extrabold tracking-tight text-slate-900" />
          </Suspense>
        </Reveal>

        <div className="relative max-w-lg">
          <Reveal delay={0.1}>
            <p className="mb-5 text-xs font-bold uppercase tracking-[0.28em] text-blue-500">School attendance platform</p>
            <h2 className="text-6xl font-black leading-[0.98] tracking-tight text-slate-900">
              Every student.
              <br />
              <span className="text-metal-gold">Accounted for.</span>
            </h2>
          </Reveal>
          <div className="mt-12 space-y-4">
            {FEATURES.map(([icon, title, text], i) => {
              const Icon = icons[icon];
              return (
                <Reveal key={title} delay={0.25 + i * 0.1}>
                  <div className="glass flex items-center gap-4 rounded-2xl p-4">
                    <span className="bg-metal-gold flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-canvas shadow-gold">
                      <Icon width={20} height={20} strokeWidth={2.2} />
                    </span>
                    <span>
                      <span className="block font-bold text-slate-900">{title}</span>
                      <span className="block text-sm text-slate-500">{text}</span>
                    </span>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>

        <p className="relative flex items-center gap-2 text-xs font-medium text-slate-500">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_var(--color-emerald-500)]" />
          Secure sign-in · Data isolated per school
        </p>
      </section>

      {/* Form side */}
      <section className="flex flex-1 items-center justify-center px-4 py-12 lg:max-w-xl">
        <PageTransition>
          <div className="w-full max-w-sm">
            <div className="mb-8 flex items-center gap-3 lg:hidden">
              <LogoMark size={40} />
              <Suspense fallback={<span className="text-lg font-extrabold text-slate-900">Attendance</span>}>
                <PlatformName className="text-lg font-extrabold tracking-tight text-slate-900" />
              </Suspense>
            </div>
            <div className="glass relative overflow-hidden rounded-[2rem] p-8 sm:p-9">
              <span aria-hidden className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-[rgb(229_192_123/0.8)] to-transparent" />
              <span aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-[rgb(229_192_123/0.12)] blur-3xl" />
              <h1 className="text-headline relative text-3xl font-black tracking-tight">Welcome back</h1>
              <p className="relative mt-2 text-sm text-slate-500">Sign in to your admin panel.</p>
              <LoginForm />
            </div>
          </div>
        </PageTransition>
      </section>
    </main>
  );
}

async function PlatformName({ className }: { className: string }) {
  const { platformName } = await getPlatformSettings();
  return <span className={className}>{platformName}</span>;
}

/** Already signed in? Go straight to the right panel. */
async function RedirectIfSignedIn(): Promise<null> {
  const user = await getCurrentUser();
  if (user) redirect(homePathFor(user.role));
  return null;
}
