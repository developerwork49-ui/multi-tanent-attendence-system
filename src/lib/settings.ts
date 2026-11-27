import "server-only";
import { cache } from "react";
import { io } from "next/cache";
import { systemDb } from "@/lib/db";

export type PlatformSettings = {
  platformName: string;
  supportEmail: string | null;
  supportPhone: string | null;
  upgradeMessage: string | null;
  defaultTimezone: string;
};

export const DEFAULT_SETTINGS: PlatformSettings = {
  platformName: "Attendance",
  supportEmail: null,
  supportPhone: null,
  upgradeMessage: null,
  defaultTimezone: "Asia/Karachi",
};

/**
 * The platform-wide settings (one row). They hold no school data and are
 * shown to everyone (even the sign-in page), so they are read with the
 * internal system scope. Cached for the length of one request.
 * Falls back to the defaults if the row cannot be read.
 */
export const getPlatformSettings = cache(async (): Promise<PlatformSettings> => {
  // Request-time data: let Next.js defer it (outside the try, so that
  // signal is never mistaken for a database error).
  await io();
  try {
    const row = await systemDb((tx) =>
      tx.platformSettings.findUnique({
        where: { id: 1 },
        select: { platformName: true, supportEmail: true, supportPhone: true, upgradeMessage: true, defaultTimezone: true },
      }),
    );
    return row ?? DEFAULT_SETTINGS;
  } catch (error) {
    console.error("Reading platform settings failed", error);
    return DEFAULT_SETTINGS;
  }
});
