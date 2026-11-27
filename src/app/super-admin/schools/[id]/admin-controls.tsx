"use client";

import { useActionState, useState } from "react";
import { addSchoolAdmin, resetAdminPassword, setAdminActive } from "../actions";
import type { FormState } from "@/lib/form";
import { Button, Field, FormMessage, ariaFor, inputClass } from "@/components/ui";

export function AddAdminForm({ schoolId }: { schoolId: number }) {
  const [state, action, pending] = useActionState<FormState, FormData>(addSchoolAdmin, undefined);
  const [open, setOpen] = useState(false);
  const err = (k: string) => state?.fieldErrors?.[k]?.[0];
  const v = state?.ok ? {} : (state?.values ?? {});

  // Close the form after a successful save (React's "adjust state when a
  // value changes" pattern: compare with the last result we handled).
  const [handled, setHandled] = useState(state);
  if (state !== handled) {
    setHandled(state);
    if (state?.ok) setOpen(false);
  }

  if (!open) {
    return (
      <div className="space-y-3">
        {state?.ok && <FormMessage state={state} />}
        <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
          + Add admin
        </Button>
      </div>
    );
  }
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="schoolId" value={schoolId} />
      {state && !state.ok && <FormMessage state={state} />}
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Full name" htmlFor="new-admin-name" required error={err("fullName")}>
          <input id="new-admin-name" name="fullName" maxLength={200} defaultValue={String(v.fullName ?? "")} className={inputClass} {...ariaFor(err("fullName"), "new-admin-name")} />
        </Field>
        <Field label="Email" htmlFor="new-admin-email" required error={err("email")}>
          <input id="new-admin-email" name="email" type="email" maxLength={254} autoComplete="off" defaultValue={String(v.email ?? "")} className={inputClass} {...ariaFor(err("email"), "new-admin-email")} />
        </Field>
        <Field label="Initial password" htmlFor="new-admin-password" required hint="At least 10 characters." error={err("password")}>
          <input id="new-admin-password" name="password" type="password" autoComplete="new-password" minLength={10} maxLength={200} className={inputClass} {...ariaFor(err("password"), "new-admin-password")} />
        </Field>
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Adding…" : "Add admin"}
        </Button>
        <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export function AdminRowActions({ userId, email, isActive }: { userId: number; email: string; isActive: boolean }) {
  const [mode, setMode] = useState<"idle" | "reset" | "toggle">("idle");
  const [resetState, resetAction, resetPending] = useActionState<FormState, FormData>(resetAdminPassword, undefined);
  const [toggleState, toggleAction, togglePending] = useActionState<FormState, FormData>(setAdminActive, undefined);

  if (mode === "reset") {
    return (
      <form action={resetAction} className="flex flex-wrap items-end gap-2" onSubmit={() => setTimeout(() => setMode("idle"), 0)}>
        <input type="hidden" name="userId" value={userId} />
        <label className="text-xs text-slate-600">
          New password for {email}
          <input name="password" type="password" required minLength={10} maxLength={200} autoComplete="new-password" className={`${inputClass} w-56`} />
        </label>
        <Button type="submit" disabled={resetPending}>Save</Button>
        <Button type="button" variant="secondary" onClick={() => setMode("idle")}>Cancel</Button>
      </form>
    );
  }
  if (mode === "toggle") {
    return (
      <form action={toggleAction} className="flex flex-wrap items-center gap-2" onSubmit={() => setTimeout(() => setMode("idle"), 0)}>
        <input type="hidden" name="userId" value={userId} />
        <input type="hidden" name="active" value={isActive ? "false" : "true"} />
        <span className="text-xs text-slate-700">{isActive ? "Disable this admin? They are signed out immediately." : "Enable this admin again?"}</span>
        <Button type="submit" variant={isActive ? "danger" : "success"} disabled={togglePending}>
          {isActive ? "Yes, disable" : "Yes, enable"}
        </Button>
        <Button type="button" variant="secondary" onClick={() => setMode("idle")}>Cancel</Button>
      </form>
    );
  }
  const state = resetState ?? toggleState;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" className="text-sm font-semibold text-blue-700 transition-colors hover:text-blue-800" onClick={() => setMode("reset")}>
        Reset password
      </button>
      <span className="text-slate-300">·</span>
      <button type="button" className="text-sm font-semibold text-blue-700 transition-colors hover:text-blue-800" onClick={() => setMode("toggle")}>
        {isActive ? "Disable" : "Enable"}
      </button>
      {state?.error && <span className="text-xs text-red-600">{state.error}</span>}
      {state?.message && <span className="text-xs text-emerald-700">{state.message}</span>}
    </div>
  );
}
