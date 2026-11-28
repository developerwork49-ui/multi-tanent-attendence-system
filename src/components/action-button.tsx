"use client";

import { useActionState, useState } from "react";
import type { FormState } from "@/lib/form";
import { Button } from "@/components/ui";

type Props = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  /** Hidden fields sent with the action, e.g. { studentId: "12" }. */
  fields: Record<string, string | number>;
  label: string;
  pendingLabel?: string;
  /** If set, a second "Yes, …" click is required. */
  confirm?: string;
  variant?: "primary" | "secondary" | "danger" | "success";
  /** Render as a small text link instead of a button. */
  link?: boolean;
};

/** A one-click (or confirm-then-click) Server Action button with inline result. */
export function ActionButton({ action, fields, label, pendingLabel, confirm, variant = "secondary", link }: Props) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, undefined);
  const [asking, setAsking] = useState(false);
  const hidden = Object.entries(fields).map(([k, v]) => <input key={k} type="hidden" name={k} value={String(v)} />);
  const trigger = link
    ? variant === "danger"
      ? "text-sm font-medium text-red-600 transition-colors hover:text-red-700 disabled:opacity-60"
      : "text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-950 disabled:opacity-60"
    : undefined;

  return (
    <form
      action={formAction}
      className="inline-flex flex-wrap items-center gap-2"
      onSubmit={() => setTimeout(() => setAsking(false), 0)}
    >
      {hidden}
      {confirm && !asking ? (
        link ? (
          <button type="button" className={trigger} onClick={() => setAsking(true)}>
            {label}
          </button>
        ) : (
          <Button type="button" variant={variant === "danger" ? "dangerOutline" : variant} onClick={() => setAsking(true)}>
            {label}
          </Button>
        )
      ) : (
        <>
          {confirm && <span className="text-xs text-zinc-700">{confirm}</span>}
          {link && !confirm ? (
            <button type="submit" className={trigger} disabled={pending}>
              {pending ? (pendingLabel ?? "Working…") : label}
            </button>
          ) : (
            <Button type="submit" variant={confirm && variant === "secondary" ? "primary" : variant} disabled={pending}>
              {pending ? (pendingLabel ?? "Working…") : confirm ? "Yes, continue" : label}
            </Button>
          )}
          {confirm && (
            <Button type="button" variant="secondary" onClick={() => setAsking(false)}>
              Cancel
            </Button>
          )}
        </>
      )}
      {state?.error && <span className="text-xs text-red-600">{state.error}</span>}
      {state?.message && <span className="text-xs text-emerald-700">{state.message}</span>}
    </form>
  );
}
