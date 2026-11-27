/**
 * Sets a new password for an existing Super Admin or School Admin
 * (for a forgotten password, e.g. the only Super Admin).
 *
 *   npm run reset-password
 *
 * Asks for the account email and the new password (hidden while typing).
 * Also clears any login lockout and signs the account out on all devices.
 * Needs direct access to the database (.env), so only the server owner
 * can run it.
 */
import "dotenv/config";
import { createInterface } from "node:readline/promises";
import { PrismaClient } from "../src/generated/prisma/client";
import { createDbAdapter } from "../src/lib/db-adapter";
import { withSystemScope } from "../src/lib/db-scope";
import { checkPasswordPolicy, hashPassword } from "../src/lib/auth/password";
import { askHidden } from "./ask-hidden";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set (check your .env file).");
  const prisma = new PrismaClient({ adapter: createDbAdapter(url) });

  try {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const email = (await rl.question("Account email: ")).trim().toLowerCase();
    rl.close();
    if (!email) throw new Error("Please enter an email.");

    const found = await withSystemScope(prisma, (tx) =>
      tx.user.findUnique({ where: { email }, select: { id: true, role: true } }),
    );
    if (!found) throw new Error(`No account with email ${email}. Nothing was changed.`);
    console.log(`Found ${found.role === "SUPER_ADMIN" ? "Super Admin" : "School Admin"} account.`);

    const password = await askHidden("New password (min 10 characters): ");
    const again = await askHidden("Repeat new password: ");
    if (password !== again) throw new Error("Passwords do not match. Nothing was changed.");
    const policyError = checkPasswordPolicy(password);
    if (policyError) throw new Error(`${policyError} Nothing was changed.`);
    const passwordHash = await hashPassword(password);

    // One all-or-nothing transaction: new password, unlock, sign out everywhere, audit.
    await withSystemScope(prisma, async (tx) => {
      await tx.user.update({
        where: { id: found.id },
        data: { passwordHash, passwordChangedAt: new Date(), failedLoginCount: 0, lockedUntil: null },
      });
      await tx.session.deleteMany({ where: { userId: found.id } });
      await tx.auditLog.create({
        data: {
          action: "user.reset_password",
          entityType: "user",
          entityId: String(found.id),
          details: { via: "cli" },
        },
      });
    });

    console.log(`\n✔ New password set for ${email}. Any old logins were signed out.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(`\n✖ ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
