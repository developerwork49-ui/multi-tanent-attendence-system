"use client";

import { Button, ButtonLink } from "@/components/ui";
import { Reveal } from "@/components/motion/motion-ui";
import { icons } from "@/components/icons";

/** Shown when a page fails unexpectedly. Never displays technical details. */
export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  const digest = (error as { digest?: string } | null)?.digest;
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-24 text-center">
      <Reveal className="flex flex-col items-center gap-4">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100 text-red-500 ring-1 ring-red-300 shadow-[0_0_40px_-8px_rgb(239_68_68/0.6)]">
          <icons.warning width={30} height={30} strokeWidth={2} />
        </span>
        <h1 className="text-headline text-3xl font-black tracking-tight">Something went wrong</h1>
        <p className="max-w-md text-sm text-slate-500">
          Please try again. If it keeps happening, contact the platform administrator
          {digest ? ` and mention code ${digest}` : ""}.
        </p>
        <div className="mt-3 flex gap-2.5">
          <Button type="button" onClick={() => retry()}>
            Try again
          </Button>
          <ButtonLink href="/" variant="secondary">
            Dashboard
          </ButtonLink>
        </div>
      </Reveal>
    </main>
  );
}
