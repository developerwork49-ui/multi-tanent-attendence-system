"use client";

import { useActionState } from "react";
import type { FormState } from "@/lib/form";
import { Button, Card, CardHeader, Field, FormMessage, ariaFor, inputClass } from "@/components/ui";
import { saveSettings } from "./actions";

type Props = {
  initial: Record<string, string>;
  timeZones: { value: string; label: string }[];
};

export function SettingsForm({ initial, timeZones }: Props) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveSettings, undefined);
  const v = { ...initial, ...(state?.values ?? {}) } as Record<string, string>;
  const err = (k: string) => state?.fieldErrors?.[k]?.[0];

  return (
    <form action={action} className="max-w-3xl space-y-6" noValidate>
      <FormMessage state={state} />
      <Card>
        <CardHeader title="Branding" />
        <div className="grid gap-4 p-5">
          <Field label="Platform name" htmlFor="platformName" required error={err("platformName")} hint="Shown in the sidebar, on the sign-in page and in the browser tab.">
            <input id="platformName" name="platformName" maxLength={80} defaultValue={v.platformName} className={inputClass} {...ariaFor(err("platformName"), "platformName")} />
          </Field>
        </div>
      </Card>

      <Card>
        <CardHeader title="Support contact" />
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Support email" htmlFor="supportEmail" error={err("supportEmail")} hint="School Admins see this when they need help.">
            <input id="supportEmail" name="supportEmail" type="email" maxLength={254} defaultValue={v.supportEmail} className={inputClass} {...ariaFor(err("supportEmail"), "supportEmail")} />
          </Field>
          <Field label="Support phone / WhatsApp" htmlFor="supportPhone" error={err("supportPhone")}>
            <input id="supportPhone" name="supportPhone" maxLength={40} defaultValue={v.supportPhone} className={inputClass} {...ariaFor(err("supportPhone"), "supportPhone")} />
          </Field>
          <div className="sm:col-span-2">
            <Field
              label="Upgrade message"
              htmlFor="upgradeMessage"
              error={err("upgradeMessage")}
              hint="Optional. Added to the warning schools see when storage is full or they have no plan, e.g. how to pay for an upgrade."
            >
              <textarea id="upgradeMessage" name="upgradeMessage" rows={3} maxLength={500} defaultValue={v.upgradeMessage} className={inputClass} />
            </Field>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Defaults for new schools" />
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Default time zone" htmlFor="defaultTimezone" required error={err("defaultTimezone")} hint="Pre-selected when you create a school.">
            <select id="defaultTimezone" name="defaultTimezone" defaultValue={v.defaultTimezone} className={inputClass} {...ariaFor(err("defaultTimezone"), "defaultTimezone")}>
              {timeZones.map((z) => (
                <option key={z.value} value={z.value}>
                  {z.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </Card>

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save settings"}
      </Button>
    </form>
  );
}
