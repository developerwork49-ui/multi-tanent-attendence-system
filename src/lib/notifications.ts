import "server-only";
import { cache } from "react";
import type { SchoolAdminContext } from "@/lib/auth/dal";
import { schoolDb, type Tx } from "@/lib/db";

/** How far back a School Admin's inbox goes. */
export const INBOX_LIMIT = 50;

/**
 * Messages for the signed-in School Admin: the ones sent to their school
 * and the ones sent to all schools (Row-Level Security does the filtering),
 * newest first, each with "read by me" state.
 */
export async function inbox(tx: Tx, userId: number) {
  const rows = await tx.notification.findMany({
    orderBy: { createdAt: "desc" },
    take: INBOX_LIMIT,
    select: {
      id: true,
      schoolId: true,
      title: true,
      body: true,
      tone: true,
      createdAt: true,
      reads: { where: { userId }, select: { readAt: true } },
    },
  });
  return rows.map(({ reads, ...n }) => ({ ...n, readAt: reads[0]?.readAt ?? null }));
}

/** Unread message count for the sidebar badge (cached per request). */
export const unreadCount = cache(async (user: SchoolAdminContext): Promise<number> => {
  return schoolDb(user, (tx) =>
    tx.notification.count({ where: { reads: { none: { userId: user.id } } } }),
  );
});
