"use client";

import { useActionState } from "react";
import type { FormState } from "@/lib/form";
import { Button, Field, FormMessage, ariaFor, inputClass } from "@/components/ui";
import { sendNotification } from "./actions";

export function ComposeForm({ schools }: { schools: { id: number; name: string }[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(sendNotification, undefined);
  // After a successful send the form starts empty again (new key).
  const v = (state?.ok ? {} : (state?.values ?? {})) as Record<string, string>;
  const err = (k: string) => state?.fieldErrors?.[k]?.[0];

  return (
    <form action={action} className="space-y-4 p-5" noValidate key={state?.ok ? state.message : "form"}>
      <FormMessage state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Send to" htmlFor="audience" required error={err("audience")}>
          <select id="audience" name="audience" defaultValue={v.audience || "all"} className={inputClass}>
            <option value="all">All schools</option>
            {schools.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Type" htmlFor="tone" required>
          <select id="tone" name="tone" defaultValue={v.tone || "INFO"} className={inputClass}>
            <option value="INFO">Information</option>
            <option value="IMPORTANT">Important</option>
          </select>
        </Field>
      </div>
      <Field label="Title" htmlFor="title" required error={err("title")}>
        <input id="title" name="title" maxLength={150} defaultValue={v.title} className={inputClass} {...ariaFor(err("title"), "title")} />
      </Field>
      <Field label="Message" htmlFor="body" required error={err("body")}>
        <textarea id="body" name="body" rows={4} maxLength={2000} defaultValue={v.body} className={inputClass} {...ariaFor(err("body"), "body")} />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? "Sending…" : "Send notification"}
      </Button>
    </form>
  );
}
