"use client";

import { Button, ButtonLink } from "@/components/ui";

/** Shown when a page fails unexpectedly. Never displays technical details. */
export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  const digest = (error as { digest?: string } | null)?.digest;
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-24 text-center">
      <p className="text-sm font-medium text-red-600">Error</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">Something went wrong</h1>
      <p className="mt-2 max-w-md text-sm text-zinc-500">
        Please try again. If it keeps happening, contact the platform administrator
        {digest ? ` and mention code ${digest}` : ""}.
      </p>
      <div className="mt-6 flex gap-2">
        <Button type="button" onClick={() => retry()}>
          Try again
        </Button>
        <ButtonLink href="/" variant="secondary">
          Dashboard
        </ButtonLink>
      </div>
    </main>
  );
}
