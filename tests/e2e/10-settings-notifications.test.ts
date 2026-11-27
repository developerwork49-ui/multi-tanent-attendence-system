import { test } from "node:test";
import assert from "node:assert/strict";
import { Client, Form, makeSchool, makeSuperAdmin, sys, uid } from "./lib";
import type { FormState } from "../../src/lib/form";

test("platform settings and notifications (Phase 13)", async (t) => {
  const sa = await makeSuperAdmin();
  const boss = new Client();
  await boss.login(sa.email, sa.password);
  const A = await makeSchool();
  const B = await makeSchool();
  const a = new Client();
  await a.login(A.admin.email, A.admin.password);
  const b = new Client();
  await b.login(B.admin.email, B.admin.password);

  await t.test("Super Admin saves settings; schools see name and contact (restored afterwards)", async () => {
    const original = await sys((tx) => tx.platformSettings.findUniqueOrThrow({ where: { id: 1 } }));
    try {
      const name = `Test Platform ${uid()}`;
      const bad = await boss.action<FormState>("/super-admin/settings", "saveSettings", [
        undefined,
        new Form({ platformName: " ", supportEmail: "nope", supportPhone: "", upgradeMessage: "", defaultTimezone: "Mars/Base" }),
      ]);
      assert.ok(bad.result?.fieldErrors?.platformName && bad.result.fieldErrors.supportEmail && bad.result.fieldErrors.defaultTimezone);

      const ok = await boss.action<FormState>("/super-admin/settings", "saveSettings", [
        undefined,
        new Form({ platformName: name, supportEmail: "help@e2e.example.test", supportPhone: "+92 300 0000000", upgradeMessage: "Pay by bank transfer.", defaultTimezone: "Asia/Dubai" }),
      ]);
      assert.equal(ok.result?.ok, true);
      assert.match((await a.get("/school")).text, new RegExp(name));
      assert.match((await a.get("/school/notifications")).text, /help@e2e\.example\.test/);
      assert.match((await new Client().get("/login")).text, new RegExp(name));
      assert.match((await boss.get("/super-admin/schools/new")).html, /<option selected="" value="Asia\/Dubai"|value="Asia\/Dubai" selected/);

      // A School Admin cannot call the settings action.
      await a.action("/super-admin/settings", "saveSettings", [undefined, new Form({ platformName: "Hacked", supportEmail: "", supportPhone: "", upgradeMessage: "", defaultTimezone: "UTC" })]);
      assert.equal((await sys((tx) => tx.platformSettings.findUniqueOrThrow({ where: { id: 1 } }))).platformName, name);
    } finally {
      const { platformName, supportEmail, supportPhone, upgradeMessage, defaultTimezone } = original;
      await sys((tx) => tx.platformSettings.update({ where: { id: 1 }, data: { platformName, supportEmail, supportPhone, upgradeMessage, defaultTimezone } }));
    }
  });

  await t.test("message to one school reaches only that school", async () => {
    const title = `Only A ${uid()}`;
    const sent = await boss.action<FormState>("/super-admin/notifications", "sendNotification", [
      undefined,
      new Form({ audience: String(A.id), title, body: "Hello A", tone: "IMPORTANT" }),
    ]);
    assert.equal(sent.result?.ok, true);
    const inboxA = await a.get("/school/notifications");
    assert.match(inboxA.text, new RegExp(title));
    assert.match(inboxA.text, /1 unread message/);
    assert.doesNotMatch((await b.get("/school/notifications")).text, new RegExp(title));
  });

  await t.test("read receipts: mark one, mark all; other school cannot mark it", async () => {
    const n = await sys((tx) => tx.notification.findFirstOrThrow({ where: { schoolId: A.id } }));
    const cross = await b.action<FormState>("/school/notifications", "markNotificationRead", [undefined, new Form({ notificationId: String(n.id) })]);
    assert.match(JSON.stringify(cross.result), /not found/);
    await a.action("/school/notifications", "markNotificationRead", [undefined, new Form({ notificationId: String(n.id) })]);
    assert.match((await a.get("/school/notifications")).text, /all caught up/);
    assert.equal(await sys((tx) => tx.notificationRead.count({ where: { notificationId: n.id } })), 1);
    assert.match((await boss.get("/super-admin/notifications")).text, /Read by 1 of 1 admin/);
  });

  await t.test("validation, School Admin cannot send, and delete", async () => {
    const empty = await boss.action<FormState>("/super-admin/notifications", "sendNotification", [undefined, new Form({ audience: "all", title: "", body: "", tone: "INFO" })]);
    assert.ok(empty.result?.fieldErrors?.title && empty.result.fieldErrors.body);
    const before = await sys((tx) => tx.notification.count());
    await a.action("/super-admin/notifications", "sendNotification", [undefined, new Form({ audience: "all", title: "Spam", body: "x", tone: "INFO" })]);
    assert.equal(await sys((tx) => tx.notification.count()), before);

    const n = await sys((tx) => tx.notification.findFirstOrThrow({ where: { schoolId: A.id } }));
    const del = await boss.action<FormState>("/super-admin/notifications", "deleteNotification", [undefined, new Form({ notificationId: String(n.id) })]);
    assert.equal(del.result?.ok, true);
    assert.equal(await sys((tx) => tx.notification.count({ where: { id: n.id } })), 0);
  });
});
