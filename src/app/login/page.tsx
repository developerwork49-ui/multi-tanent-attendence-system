import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser, homePathFor } from "@/lib/auth/dal";
import { getPlatformSettings } from "@/lib/settings";
import { LogoMark } from "@/components/icons";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-4 py-16">
      <Suspense fallback={null}>
        <RedirectIfSignedIn />
      </Suspense>

      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <LogoMark size={36} />
          <Suspense fallback={<span className="text-sm font-medium text-zinc-500">Attendance</span>}>
            <PlatformName />
          </Suspense>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white p-8 shadow-xs">
          <h1 className="text-xl font-semibold tracking-tight text-zinc-950">Sign in</h1>
          <p className="mt-1 text-sm text-zinc-500">Use the email and password for your account.</p>
          <LoginForm />
        </div>

        <p className="mt-6 text-center text-xs text-zinc-500">Secure sign-in · Each school’s data is kept separate</p>
      </div>
    </main>
  );
}

async function PlatformName() {
  const { platformName } = await getPlatformSettings();
  return <span className="text-sm font-medium text-zinc-500">{platformName}</span>;
}

/** Already signed in? Go straight to the right panel. */
async function RedirectIfSignedIn(): Promise<null> {
  const user = await getCurrentUser();
  if (user) redirect(homePathFor(user.role));
  return null;
}
