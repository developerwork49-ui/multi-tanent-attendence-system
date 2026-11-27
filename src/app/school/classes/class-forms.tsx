"use client";

import { useActionState, useState } from "react";
import { saveClass } from "./actions";
import type { FormState } from "@/lib/form";
import { Button, FormMessage, inputClass } from "@/components/ui";

export function AddClassForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(saveClass, undefined);
  const err = state?.fieldErrors?.name?.[0];
  // Clear the inputs after each successful add by remounting them.
  const [round, setRound] = useState(0);
  const [handled, setHandled] = useState(state);
  if (state !== handled) {
    setHandled(state);
    if (state?.ok) setRound((r) => r + 1);
  }
  return (
    <form action={action} className="space-y-3">
      <FormMessage state={state} />
      <div key={round} className="flex flex-wrap items-end gap-3">
        <label className="min-w-48 flex-1 text-sm font-medium text-slate-700">
          New class name
          <input name="name" maxLength={100} placeholder='e.g. "Grade 5 - A"' className={inputClass} aria-invalid={!!err} />
        </label>
        <label className="w-28 text-sm font-medium text-slate-700">
          Order
          <input name="sortOrder" inputMode="numeric" placeholder="0" className={inputClass} />
        </label>
        <Button type="submit" disabled={pending}>
          {pending ? "Adding…" : "Add class"}
        </Button>
      </div>
      <p className="text-xs text-slate-500">Classes are listed by order number, then name.</p>
    </form>
  );
}

export function EditClassRow({ id, name, sortOrder }: { id: number; name: string; sortOrder: number }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveClass, undefined);
  const [open, setOpen] = useState(false);
  const [handled, setHandled] = useState(state);
  if (state !== handled) {
    setHandled(state);
    if (state?.ok) setOpen(false);
  }
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-sm font-semibold text-blue-700 transition-colors hover:text-blue-800">
        Rename
      </button>
    );
  }
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="classId" value={id} />
      <input name="name" defaultValue={name} maxLength={100} aria-label="Class name" className={`${inputClass} mt-0 w-44`} />
      <input name="sortOrder" defaultValue={sortOrder} inputMode="numeric" aria-label="Order" className={`${inputClass} mt-0 w-20`} />
      <Button type="submit" disabled={pending}>Save</Button>
      <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
      {state?.error && <span className="w-full text-xs text-red-600">{state.error}</span>}
    </form>
  );
}
