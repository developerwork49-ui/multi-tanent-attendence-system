"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { assignPlan, recordPayment } from "../../billing/actions";
import type { FormState } from "@/lib/form";
import { PAYMENT_METHOD_LABEL } from "@/lib/billing";
import { Button, Field, FormMessage, ariaFor, inputClass } from "@/components/ui";

type PlanOption = { id: number; label: string };

/** Closes a toggled form after a successful save (React "adjust state on change" pattern). */
function useCloseOnSuccess(state: FormState, close: () => void) {
  const [handled, setHandled] = useState(state);
  if (state !== handled) {
    setHandled(state);
    if (state?.ok) close();
  }
}

export function AssignPlanForm({
  schoolId,
  plans,
  today,
  hasCurrent,
}: {
  schoolId: number;
  plans: PlanOption[];
  today: string;
  hasCurrent: boolean;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(assignPlan, undefined);
  const [open, setOpen] = useState(false);
  useCloseOnSuccess(state, () => setOpen(false));
  const v = (state?.values ?? {}) as Record<string, string>;
  const err = (k: string) => state?.fieldErrors?.[k]?.[0];

  if (!open) {
    return (
      <div className="space-y-3">
        {state?.ok && <FormMessage state={state} />}
        {plans.length === 0 ? (
          <p className="text-sm text-slate-500">
            No plans available. <Link href="/super-admin/plans/new" className="font-semibold text-blue-700 transition-colors hover:text-blue-800">Create a plan</Link> first.
          </p>
        ) : (
          <Button type="button" variant={hasCurrent ? "secondary" : "primary"} onClick={() => setOpen(true)}>
            {hasCurrent ? "Change plan" : "Assign a plan"}
          </Button>
        )}
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="schoolId" value={schoolId} />
      {state && !state.ok && <FormMessage state={state} />}
      {hasCurrent && (
        <p className="text-xs text-amber-800">The current subscription will end and this one replaces it.</p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Plan" htmlFor="planId" required error={err("planId")}>
          <select id="planId" name="planId" defaultValue={v.planId ?? ""} className={inputClass} {...ariaFor(err("planId"), "planId")}>
            <option value="">Choose…</option>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Type" htmlFor="status" required error={err("status")}>
          <select id="status" name="status" defaultValue={v.status ?? "ACTIVE"} className={inputClass}>
            <option value="ACTIVE">Paid (active)</option>
            <option value="TRIAL">Free trial</option>
          </select>
        </Field>
        <Field label="Starts on" htmlFor="startsOn" required error={err("startsOn")}>
          <input id="startsOn" name="startsOn" type="date" defaultValue={v.startsOn ?? today} className={inputClass} {...ariaFor(err("startsOn"), "startsOn")} />
        </Field>
        <Field label="Ends on" htmlFor="endsOn" hint="Leave empty for one billing period." error={err("endsOn")}>
          <input id="endsOn" name="endsOn" type="date" defaultValue={v.endsOn ?? ""} className={inputClass} {...ariaFor(err("endsOn"), "endsOn")} />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Notes" htmlFor="sub-notes" error={err("notes")}>
            <input id="sub-notes" name="notes" maxLength={1000} defaultValue={v.notes ?? ""} className={inputClass} />
          </Field>
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save subscription"}
        </Button>
        <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export function RecordPaymentForm({
  schoolId,
  currency,
  amount,
  today,
  hasCurrent,
}: {
  schoolId: number;
  currency: string;
  amount: string;
  today: string;
  hasCurrent: boolean;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(recordPayment, undefined);
  const [open, setOpen] = useState(false);
  useCloseOnSuccess(state, () => setOpen(false));
  const v = (state?.values ?? {}) as Record<string, string>;
  const err = (k: string) => state?.fieldErrors?.[k]?.[0];

  if (!open) {
    return (
      <div className="space-y-3">
        {state?.ok && <FormMessage state={state} />}
        <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
          + Record payment
        </Button>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="schoolId" value={schoolId} />
      {state && !state.ok && <FormMessage state={state} />}
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Amount" htmlFor="amount" required error={err("amount")}>
          <input id="amount" name="amount" inputMode="decimal" defaultValue={v.amount ?? amount} className={inputClass} {...ariaFor(err("amount"), "amount")} />
        </Field>
        <Field label="Currency" htmlFor="pay-currency" required error={err("currency")}>
          <input id="pay-currency" name="currency" maxLength={3} defaultValue={v.currency ?? currency} className={`${inputClass} uppercase`} />
        </Field>
        <Field label="Paid on" htmlFor="paidOn" required error={err("paidOn")}>
          <input id="paidOn" name="paidOn" type="date" max={today} defaultValue={v.paidOn ?? today} className={inputClass} {...ariaFor(err("paidOn"), "paidOn")} />
        </Field>
        <Field label="Method" htmlFor="method" required error={err("method")}>
          <select id="method" name="method" defaultValue={v.method ?? "BANK_TRANSFER"} className={inputClass}>
            {Object.entries(PAYMENT_METHOD_LABEL).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <div className="sm:col-span-2">
          <Field label="Reference" htmlFor="reference" hint="Receipt, cheque or transaction number" error={err("reference")}>
            <input id="reference" name="reference" maxLength={200} defaultValue={v.reference ?? ""} className={inputClass} />
          </Field>
        </div>
        <div className="sm:col-span-3">
          <Field label="Notes" htmlFor="pay-notes" error={err("notes")}>
            <input id="pay-notes" name="notes" maxLength={1000} defaultValue={v.notes ?? ""} className={inputClass} />
          </Field>
        </div>
      </div>
      {hasCurrent && (
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" name="extend" value="1" defaultChecked className="h-4 w-4 rounded border-slate-300" />
          Also extend the current subscription by one billing period
        </label>
      )}
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save payment"}
        </Button>
        <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
