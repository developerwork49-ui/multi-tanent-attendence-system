"use server";

import { refresh } from "next/cache";
import { requireSuperAdmin } from "@/lib/auth/dal";
import { platformDb } from "@/lib/db";
import { insertAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/auth/session";
import { invalid, readFields, toId, type FormState } from "@/lib/form";
import { notificationSchema } from "@/lib/validation/settings";

const FIELDS = ["audience", "title", "body", "tone"] as const;

export async function sendNotification(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireSuperAdmin();
  const values = readFields(formData, FIELDS);
  const parsed = notificationSchema.safeParse(values);
  if (!parsed.success) return invalid(parsed.error, values);
  const { audience, title, body, tone } = parsed.data;
  const schoolId = audience === "all" ? null : toId(audience);
  if (audience !== "all" && !schoolId) return { error: "Choose who receives it.", values };
  const ip = await getClientIp();

  const result = await platformDb(user, async (tx) => {
    let schoolName: string | null = null;
    if (schoolId) {
      const school = await tx.school.findUnique({ where: { id: schoolId }, select: { name: true } });
      if (!school) return null;
      schoolName = school.name;
    }
    const n = await tx.notification.create({
      data: { schoolId, title, body, tone, createdById: user.id },
      select: { id: true },
    });
    await insertAudit(tx, {
      action: "notification.send",
      actorUserId: user.id,
      schoolId,
      entityType: "notification",
      entityId: n.id,
      details: { title, audience: schoolName ?? "all schools" },
      ipAddress: ip,
    });
    return schoolName ?? "all schools";
  });
  if (!result) return { error: "That school no longer exists.", values };
  refresh();
  return { ok: true, message: `Sent to ${result}.` };
}

export async function deleteNotification(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireSuperAdmin();
  const id = toId(formData.get("notificationId"));
  if (!id) return { error: "Invalid request." };
  const ip = await getClientIp();
  const ok = await platformDb(user, async (tx) => {
    const n = await tx.notification.findUnique({ where: { id }, select: { title: true, schoolId: true } });
    if (!n) return false;
    await tx.notification.delete({ where: { id } });
    await insertAudit(tx, {
      action: "notification.delete",
      actorUserId: user.id,
      schoolId: n.schoolId,
      entityType: "notification",
      entityId: id,
      details: { title: n.title },
      ipAddress: ip,
    });
    return true;
  });
  if (!ok) return { error: "Message not found." };
  refresh();
  return { ok: true };
}
