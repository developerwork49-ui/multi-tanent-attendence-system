"use client";

import { useActionState } from "react";
import { login, type LoginState } from "@/lib/auth/actions";
import { Alert, Button, inputClass } from "@/components/ui";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, undefined);

  return (
    <form action={action} className="mt-8 space-y-5">
      <div>
        <label htmlFor="email" className="block text-[13px] font-semibold text-slate-700">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          maxLength={254}
          defaultValue={state?.email ?? ""}
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="password" className="block text-[13px] font-semibold text-slate-700">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          maxLength={200}
          className={inputClass}
        />
      </div>

      {state?.error && (
        <Alert tone="error">{state.error}</Alert>
      )}

      <Button type="submit" disabled={pending} className="w-full py-3 text-[15px]">
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
