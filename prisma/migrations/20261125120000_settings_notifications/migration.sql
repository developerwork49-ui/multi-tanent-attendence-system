-- CreateEnum
CREATE TYPE "notification_tone" AS ENUM ('INFO', 'IMPORTANT');

-- CreateTable
CREATE TABLE "platform_settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "platform_name" VARCHAR(80) NOT NULL DEFAULT 'Attendance',
    "support_email" VARCHAR(254),
    "support_phone" VARCHAR(40),
    "upgrade_message" VARCHAR(500),
    "default_timezone" VARCHAR(64) NOT NULL DEFAULT 'Asia/Karachi',
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "platform_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" SERIAL NOT NULL,
    "school_id" INTEGER,
    "title" VARCHAR(150) NOT NULL,
    "body" VARCHAR(2000) NOT NULL,
    "tone" "notification_tone" NOT NULL DEFAULT 'INFO',
    "created_by_id" INTEGER,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_reads" (
    "notification_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "school_id" INTEGER NOT NULL,
    "read_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_reads_pkey" PRIMARY KEY ("notification_id","user_id")
);

-- CreateIndex
CREATE INDEX "notifications_school_id_created_at_idx" ON "notifications"("school_id", "created_at");

-- CreateIndex
CREATE INDEX "notifications_created_at_idx" ON "notifications"("created_at");

-- CreateIndex
CREATE INDEX "notification_reads_school_id_user_id_idx" ON "notification_reads"("school_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_school_id_id_key" ON "users"("school_id", "id");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_reads" ADD CONSTRAINT "notification_reads_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_reads" ADD CONSTRAINT "notification_reads_school_id_user_id_fkey" FOREIGN KEY ("school_id", "user_id") REFERENCES "users"("school_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_reads" ADD CONSTRAINT "notification_reads_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- ---------------------------------------------------------------------
--  Safety rules
-- ---------------------------------------------------------------------
-- Settings: exactly one row.
ALTER TABLE "platform_settings" ADD CONSTRAINT "platform_settings_single_row" CHECK ("id" = 1);
ALTER TABLE "platform_settings" ADD CONSTRAINT "platform_settings_values_check" CHECK (
  length(btrim("platform_name")) > 0 AND length("default_timezone") > 0
);
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_values_check" CHECK (
  length(btrim("title")) > 0 AND length(btrim("body")) > 0
);

-- The one settings row (inserted before Row-Level Security is switched on).
INSERT INTO "platform_settings" ("id", "updated_at") VALUES (1, CURRENT_TIMESTAMP);

-- ---------------------------------------------------------------------
--  Row-Level Security
-- ---------------------------------------------------------------------
ALTER TABLE "platform_settings"  ENABLE ROW LEVEL SECURITY; ALTER TABLE "platform_settings"  FORCE ROW LEVEL SECURITY;
ALTER TABLE "notifications"      ENABLE ROW LEVEL SECURITY; ALTER TABLE "notifications"      FORCE ROW LEVEL SECURITY;
ALTER TABLE "notification_reads" ENABLE ROW LEVEL SECURITY; ALTER TABLE "notification_reads" FORCE ROW LEVEL SECURITY;

-- Settings: platform edits; anyone (also the sign-in page via system scope) may read.
CREATE POLICY platform_all ON "platform_settings" USING ((SELECT app_is_platform())) WITH CHECK ((SELECT app_is_platform()));
CREATE POLICY school_read ON "platform_settings" FOR SELECT USING ((SELECT app_current_school_id()) IS NOT NULL);

-- Notifications: platform manages; a school reads its own and the "all schools" ones.
CREATE POLICY platform_all ON "notifications" USING ((SELECT app_is_platform())) WITH CHECK ((SELECT app_is_platform()));
CREATE POLICY school_read ON "notifications" FOR SELECT USING (
  (SELECT app_current_school_id()) IS NOT NULL
  AND ("school_id" IS NULL OR "school_id" = (SELECT app_current_school_id()))
);

-- Read receipts: platform sees all; a school only its own, and only for
-- notifications it is allowed to see.
CREATE POLICY platform_all ON "notification_reads" USING ((SELECT app_is_platform())) WITH CHECK ((SELECT app_is_platform()));
CREATE POLICY school_all ON "notification_reads"
  USING ("school_id" = (SELECT app_current_school_id()))
  WITH CHECK (
    "school_id" = (SELECT app_current_school_id())
    AND EXISTS (SELECT 1 FROM "notifications" n WHERE n."id" = "notification_id")
  );
