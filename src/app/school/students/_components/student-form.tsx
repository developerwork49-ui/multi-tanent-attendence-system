"use client";

import { useActionState } from "react";
import Link from "next/link";
import { createStudent, updateStudent } from "../actions";
import type { FormState } from "@/lib/form";
import { Button, ButtonLink, Field, FormMessage, ariaFor, inputClass } from "@/components/ui";

type Props = {
  studentId?: number;
  initial: { studentCode: string; fullName: string; classGroupId: string };
  classes: { id: number; name: string }[];
};

export function StudentForm({ studentId, initial, classes }: Props) {
  const [state, action, pending] = useActionState<FormState, FormData>(studentId ? updateStudent : createStudent, undefined);
  const v = { ...initial, ...((state?.values as Record<string, string>) ?? {}) };
  const err = (k: string) => state?.fieldErrors?.[k]?.[0];

  return (
    <form action={action} className="space-y-5" noValidate>
      {studentId && <input type="hidden" name="studentId" value={studentId} />}
      <FormMessage state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" htmlFor="fullName" required error={err("fullName")}>
          <input id="fullName" name="fullName" maxLength={200} autoComplete="off" defaultValue={v.fullName} className={inputClass} {...ariaFor(err("fullName"), "fullName")} />
        </Field>
        <Field label="Student ID / admission no." htmlFor="studentCode" required error={err("studentCode")} hint="Must be unique in your school. Printed on the card.">
          <input id="studentCode" name="studentCode" maxLength={50} autoComplete="off" defaultValue={v.studentCode} className={inputClass} {...ariaFor(err("studentCode"), "studentCode")} />
        </Field>
        <Field label="Class" htmlFor="classGroupId" error={err("classGroupId")}>
          <select id="classGroupId" name="classGroupId" defaultValue={v.classGroupId} className={inputClass}>
            <option value="">No class</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {classes.length === 0 && (
            <p className="mt-1 text-xs text-zinc-500">
              No classes yet — <Link href="/school/classes" className="font-medium text-zinc-950 underline decoration-zinc-300 underline-offset-4 hover:decoration-zinc-950">add classes</Link>.
            </p>
          )}
        </Field>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : studentId ? "Save changes" : "Add student"}
        </Button>
        {!studentId && (
          <Button type="submit" name="addAnother" value="1" variant="secondary" disabled={pending}>
            Add and add another
          </Button>
        )}
        {!studentId && (
          <ButtonLink href="/school/students" variant="secondary">
            Cancel
          </ButtonLink>
        )}
      </div>
    </form>
  );
}
