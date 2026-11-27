"use server";

import { refresh } from "next/cache";
import { requireSchoolAdmin } from "@/lib/auth/dal";
import { schoolDb } from "@/lib/db";
import { toId, type FormState } from "@/lib/form";

/*
 * Read receipts. The school comes from the session; Row-Level Security
 * only accepts receipts for this school and for messages it may see.
 */

export async function markNotificationRead(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireSchoolAdmin();
  const id = toId(formData.get("notificationId"));
  if (!id) return { error: "Invalid request." };
  const ok = await schoolDb(user, async (tx) => {
    if (!(await tx.notification.findUnique({ where: { id }, select: { id: true } }))) return false;
    await tx.notificationRead.createMany({
      data: [{ notificationId: id, userId: user.id, schoolId: user.school.id }],
      skipDuplicates: true,
    });
    return true;
  });
  if (!ok) return { error: "Message not found." };
  refresh();
  return { ok: true };
}

export async function markAllNotificationsRead(): Promise<FormState> {
  const user = await requireSchoolAdmin();
  const n = await schoolDb(user, async (tx) => {
    const unread = await tx.notification.findMany({
      where: { reads: { none: { userId: user.id } } },
      select: { id: true },
    });
    if (unread.length === 0) return 0;
    const r = await tx.notificationRead.createMany({
      data: unread.map((u) => ({ notificationId: u.id, userId: user.id, schoolId: user.school.id })),
      skipDuplicates: true,
    });
    return r.count;
  });
  refresh();
  return { ok: true, message: n === 0 ? "Nothing new." : `${n} message${n === 1 ? "" : "s"} marked as read.` };
}
