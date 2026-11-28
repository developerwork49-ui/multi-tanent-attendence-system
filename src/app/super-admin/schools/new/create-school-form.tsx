"use client";

import { useActionState, useState } from "react";
import { createSchool, type CreateSchoolState } from "../actions";
import { SchoolDetailsFields } from "../_components/school-details-fields";
import { Button, ButtonLink, Card, CardHeader, Field, FormMessage, ariaFor, inputClass } from "@/components/ui";

type Props = { timeZones: { value: string; label: string }[]; defaultTimezone?: string };

export function CreateSchoolForm({ timeZones, defaultTimezone }: Props) {
  const [state, action, pending] = useActionState<CreateSchoolState, FormData>(createSchool, undefined);
  const v = state?.values ?? (defaultTimezone ? { timezone: defaultTimezone } : {});
  const err = (k: string) => state?.fieldErrors?.[k]?.[0];
  const [createAdmin, setCreateAdmin] = useState(v.createAdmin === undefined ? true : Boolean(v.createAdmin));

  return (
    <form action={action} className="max-w-3xl space-y-6" noValidate>
      <FormMessage state={state} />
      <SchoolDetailsFields values={v} errors={err} timeZones={timeZones} autoSlug />

      <Card>
        <CardHeader title="First School Admin" />
        <div className="space-y-4 p-5">
          <label className="flex items-start gap-3 text-sm text-zinc-700">
            <input
              type="checkbox"
              name="createAdmin"
              checked={createAdmin}
              onChange={(e) => setCreateAdmin(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-zinc-300"
            />
            <span>
              Create a login for the school now
              <span className="block text-xs text-zinc-500">You can also add admins later. Share the password with the school securely.</span>
            </span>
          </label>

          {createAdmin && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Admin full name" htmlFor="adminName" required error={err("adminName")}>
                <input id="adminName" name="adminName" maxLength={200} defaultValue={String(v.adminName ?? "")} className={inputClass} {...ariaFor(err("adminName"), "adminName")} />
              </Field>
              <Field label="Admin email (used to sign in)" htmlFor="adminEmail" required error={err("adminEmail")}>
                <input id="adminEmail" name="adminEmail" type="email" maxLength={254} autoComplete="off" defaultValue={String(v.adminEmail ?? "")} className={inputClass} {...ariaFor(err("adminEmail"), "adminEmail")} />
              </Field>
              <Field label="Initial password" htmlFor="adminPassword" required hint="At least 10 characters." error={err("adminPassword")}>
                <input id="adminPassword" name="adminPassword" type="password" minLength={10} maxLength={200} autoComplete="new-password" className={inputClass} {...ariaFor(err("adminPassword"), "adminPassword")} />
              </Field>
            </div>
          )}
        </div>
      </Card>

      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create school"}
        </Button>
        <ButtonLink href="/super-admin/schools" variant="secondary">
          Cancel
        </ButtonLink>
      </div>
    </form>
  );
}
