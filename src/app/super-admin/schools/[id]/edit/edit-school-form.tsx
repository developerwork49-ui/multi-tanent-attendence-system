"use client";

import { useActionState } from "react";
import { updateSchool } from "../../actions";
import type { FormState } from "@/lib/form";
import { SchoolDetailsFields } from "../../_components/school-details-fields";
import { Button, ButtonLink, Field, FormMessage, ariaFor, inputClass } from "@/components/ui";

type Props = {
  schoolId: number;
  initial: Record<string, string>;
  timeZones: { value: string; label: string }[];
  planLimitLabel: string;
};

export function EditSchoolForm({ schoolId, initial, timeZones, planLimitLabel }: Props) {
  const [state, action, pending] = useActionState<FormState, FormData>(updateSchool, undefined);
  const v = { ...initial, ...(state?.values ?? {}) };
  const err = (k: string) => state?.fieldErrors?.[k]?.[0];

  return (
    <form action={action} className="max-w-3xl space-y-6" noValidate>
      <input type="hidden" name="schoolId" value={schoolId} />
      <FormMessage state={state} />
      <SchoolDetailsFields values={v} errors={err} timeZones={timeZones} autoSlug={false}>
        <div className="sm:col-span-2">
          <Field
            label="Custom storage quota (MB)"
            htmlFor="quotaOverrideMb"
            hint={`Leave empty to use the subscription plan's limit (${planLimitLabel}).`}
            error={err("quotaOverrideMb")}
          >
            <input id="quotaOverrideMb" name="quotaOverrideMb" inputMode="decimal" defaultValue={String(v.quotaOverrideMb ?? "")} className={`${inputClass} max-w-48`} {...ariaFor(err("quotaOverrideMb"), "quotaOverrideMb")} />
          </Field>
        </div>
      </SchoolDetailsFields>
      <p className="text-xs text-zinc-500">
        Changing the time zone only affects attendance recorded from now on; past attendance keeps its date.
      </p>
      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
        <ButtonLink href={`/super-admin/schools/${schoolId}`} variant="secondary">
          Cancel
        </ButtonLink>
      </div>
    </form>
  );
}
