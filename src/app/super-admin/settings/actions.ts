"use server";

import { refresh } from "next/cache";
import { requireSuperAdmin } from "@/lib/auth/dal";
import { platformDb } from "@/lib/db";
import { insertAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/auth/session";
import { invalid, readFields, type FormState } from "@/lib/form";
import { settingsSchema } from "@/lib/validation/settings";

const FIELDS = ["platformName", "supportEmail", "supportPhone", "upgradeMessage", "defaultTimezone"] as const;

export async function saveSettings(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireSuperAdmin();
  const values = readFields(formData, FIELDS);
  const parsed = settingsSchema.safeParse(values);
  if (!parsed.success) return invalid(parsed.error, values);
  const ip = await getClientIp();

  try {
    await platformDb(user, async (tx) => {
      await tx.platformSettings.upsert({ where: { id: 1 }, update: parsed.data, create: { id: 1, ...parsed.data } });
      await insertAudit(tx, {
        action: "settings.update",
        actorUserId: user.id,
        entityType: "platform_settings",
        entityId: 1,
        details: { platformName: parsed.data.platformName, defaultTimezone: parsed.data.defaultTimezone },
        ipAddress: ip,
      });
    });
  } catch (error) {
    console.error("saveSettings failed", error);
    return { error: "Something went wrong. Nothing was saved.", values };
  }
  refresh();
  return { ok: true, message: "Settings saved.", values };
}
