"use client";

import { useState } from "react";
import { slugify } from "@/lib/slug";
import { Card, CardHeader, Field, ariaFor, inputClass } from "@/components/ui";

type Values = Record<string, string | boolean | undefined>;

/** The "School details" card shared by the create and edit forms. */
export function SchoolDetailsFields({
  values,
  errors,
  timeZones,
  autoSlug,
  children,
}: {
  values: Values;
  errors: (key: string) => string | undefined;
  timeZones: { value: string; label: string }[];
  /** Create form: the web name follows the school name until edited. */
  autoSlug: boolean;
  children?: React.ReactNode;
}) {
  const [name, setName] = useState(String(values.name ?? ""));
  const [slug, setSlug] = useState(String(values.slug ?? ""));
  const [slugTouched, setSlugTouched] = useState(!autoSlug || Boolean(values.slug));

  return (
    <Card>
      <CardHeader title="School details" icon="school" />
      <div className="grid gap-4 p-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label="School name" htmlFor="name" required error={errors("name")}>
            <input
              id="name"
              name="name"
              required
              maxLength={200}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!slugTouched) setSlug(slugify(e.target.value));
              }}
              className={inputClass}
              {...ariaFor(errors("name"), "name")}
            />
          </Field>
        </div>
        <Field label="Web name" htmlFor="slug" required hint="Short unique name: lowercase letters, numbers, hyphens." error={errors("slug")}>
          <input
            id="slug"
            name="slug"
            required
            maxLength={80}
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value.toLowerCase());
            }}
            className={inputClass}
            {...ariaFor(errors("slug"), "slug")}
          />
        </Field>
        <Field label="Time zone" htmlFor="timezone" required hint="Decides which calendar day a scan belongs to." error={errors("timezone")}>
          <select
            id="timezone"
            name="timezone"
            required
            defaultValue={String(values.timezone ?? "")}
            className={inputClass}
            {...ariaFor(errors("timezone"), "timezone")}
          >
            <option value="" disabled>
              Select time zone…
            </option>
            {timeZones.map((z) => (
              <option key={z.value} value={z.value}>
                {z.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Contact email" htmlFor="contactEmail" error={errors("contactEmail")}>
          <input id="contactEmail" name="contactEmail" type="email" maxLength={254} defaultValue={String(values.contactEmail ?? "")} className={inputClass} {...ariaFor(errors("contactEmail"), "contactEmail")} />
        </Field>
        <Field label="Contact phone" htmlFor="contactPhone" error={errors("contactPhone")}>
          <input id="contactPhone" name="contactPhone" type="tel" maxLength={40} defaultValue={String(values.contactPhone ?? "")} className={inputClass} {...ariaFor(errors("contactPhone"), "contactPhone")} />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Address" htmlFor="address" error={errors("address")}>
            <textarea id="address" name="address" rows={2} maxLength={500} defaultValue={String(values.address ?? "")} className={inputClass} {...ariaFor(errors("address"), "address")} />
          </Field>
        </div>
        {children}
      </div>
    </Card>
  );
}
