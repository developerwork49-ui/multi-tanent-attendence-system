import { z } from "zod";
import { isValidTimeZone } from "@/lib/timezones";

const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Max ${max} characters.`)
    .transform((v) => (v === "" ? null : v));

export const settingsSchema = z.object({
  platformName: z.string().trim().min(1, "Please enter a name.").max(80, "Max 80 characters."),
  supportEmail: optional(254).refine((v) => v === null || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "Enter a valid email address."),
  supportPhone: optional(40),
  upgradeMessage: optional(500),
  defaultTimezone: z.string().refine(isValidTimeZone, "Choose a time zone from the list."),
});

export const notificationSchema = z.object({
  audience: z.string().regex(/^(all|\d{1,9})$/, "Choose who receives it."),
  title: z.string().trim().min(1, "Please enter a title.").max(150, "Max 150 characters."),
  body: z.string().trim().min(1, "Please write a message.").max(2000, "Max 2000 characters."),
  tone: z.enum(["INFO", "IMPORTANT"]),
});
