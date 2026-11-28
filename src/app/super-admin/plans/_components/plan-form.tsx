"use client";

import { useActionState } from "react";
import { savePlan } from "../../billing/actions";
import type { FormState } from "@/lib/form";
import { CURRENCIES } from "@/lib/billing";
import { Button, ButtonLink, Field, FormMessage, ariaFor, inputClass } from "@/components/ui";

export function PlanForm({ planId, initial }: { planId?: number; initial: Record<string, string> }) {
  const [state, action, pending] = useActionState<FormState, FormData>(savePlan, undefined);
  const v = { ...initial, ...(state?.values ?? {}) } as Record<string, string>;
  const err = (k: string) => state?.fieldErrors?.[k]?.[0];

  return (
    <form action={action} className="max-w-2xl space-y-6" noValidate>
      {planId && <input type="hidden" name="planId" value={planId} />}
      <FormMessage state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label="Plan name" htmlFor="name" required error={err("name")} hint='e.g. "Basic – 500 MB"'>
            <input id="name" name="name" maxLength={100} defaultValue={v.name} className={inputClass} {...ariaFor(err("name"), "name")} />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Description" htmlFor="description" error={err("description")}>
            <textarea id="description" name="description" rows={2} maxLength={1000} defaultValue={v.description} className={inputClass} />
          </Field>
        </div>
        <Field label="Storage limit (MB)" htmlFor="storageLimitMb" required error={err("storageLimitMb")} hint="1024 MB = 1 GB">
          <input id="storageLimitMb" name="storageLimitMb" inputMode="numeric" defaultValue={v.storageLimitMb} className={inputClass} {...ariaFor(err("storageLimitMb"), "storageLimitMb")} />
        </Field>
        <Field label="Billing period" htmlFor="billingPeriod" required error={err("billingPeriod")}>
          <select id="billingPeriod" name="billingPeriod" defaultValue={v.billingPeriod || "MONTHLY"} className={inputClass}>
            <option value="MONTHLY">Monthly</option>
            <option value="QUARTERLY">Quarterly (3 months)</option>
            <option value="YEARLY">Yearly</option>
          </select>
        </Field>
        <Field label="Price per period" htmlFor="price" required error={err("price")} hint="0 for a free plan">
          <input id="price" name="price" inputMode="decimal" defaultValue={v.price} className={inputClass} {...ariaFor(err("price"), "price")} />
        </Field>
        <Field label="Currency" htmlFor="currency" required error={err("currency")}>
          <input id="currency" name="currency" list="currency-list" maxLength={3} defaultValue={v.currency || "PKR"} className={`${inputClass} uppercase`} {...ariaFor(err("currency"), "currency")} />
          <datalist id="currency-list">
            {CURRENCIES.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </Field>
      </div>
      {planId && (
        <p className="text-xs text-zinc-500">
          Changes apply to new subscriptions only. Schools already on this plan keep the price and storage limit they signed up with.
        </p>
      )}
      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : planId ? "Save plan" : "Create plan"}
        </Button>
        <ButtonLink href="/super-admin/plans" variant="secondary">
          Cancel
        </ButtonLink>
      </div>
    </form>
  );
}
