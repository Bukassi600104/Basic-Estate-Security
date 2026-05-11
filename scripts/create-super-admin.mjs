/**
 * Creates the Super Admin user in Supabase.
 *
 * Usage:
 *   node --env-file=.env scripts/create-super-admin.mjs
 *
 * Or:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/create-super-admin.mjs
 */

import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

function loadDotEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const raw = fs.readFileSync(filePath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

const repoRoot = process.cwd();
loadDotEnvFile(path.join(repoRoot, ".env"));
loadDotEnvFile(path.join(repoRoot, ".env.local"));

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL;
const SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD;
const SUPER_ADMIN_NAME = process.env.SUPER_ADMIN_NAME || "Super Admin";

if (!SUPER_ADMIN_EMAIL || !SUPER_ADMIN_PASSWORD) {
  console.error("Missing SUPER_ADMIN_EMAIL or SUPER_ADMIN_PASSWORD");
  console.error("Example: SUPER_ADMIN_EMAIL=admin@example.com SUPER_ADMIN_PASSWORD='StrongPass123!' node scripts/create-super-admin.mjs");
  process.exit(1);
}

async function main() {
  console.log("Creating Super Admin user...");
  console.log(`Email: ${SUPER_ADMIN_EMAIL}`);
  console.log("");

  // Try to create user in Supabase Auth
  const { data: authData, error: authError } = await sb.auth.admin.createUser({
    email: SUPER_ADMIN_EMAIL,
    password: SUPER_ADMIN_PASSWORD,
    email_confirm: true,
    user_metadata: { name: SUPER_ADMIN_NAME, role: "SUPER_ADMIN" },
  });

  let userId;

  if (authError) {
    if (authError.message?.includes("already been registered")) {
      console.log("Auth user already exists. Fetching...");
      const { data: { users }, error: listErr } = await sb.auth.admin.listUsers();
      if (listErr) throw listErr;
      const existing = users.find(u => u.email === SUPER_ADMIN_EMAIL);
      if (!existing) throw new Error("User exists in auth but could not be found");
      userId = existing.id;

      // Update password
      await sb.auth.admin.updateUserById(userId, { password: SUPER_ADMIN_PASSWORD });
      console.log("Password updated.");
    } else {
      throw authError;
    }
  } else {
    userId = authData.user.id;
    console.log("Auth user created.");
  }

  // Upsert users table record
  const now = new Date().toISOString();
  const { error: dbError } = await sb.from("users").upsert({
    user_id: userId,
    role: "SUPER_ADMIN",
    name: SUPER_ADMIN_NAME,
    email: SUPER_ADMIN_EMAIL,
    created_at: now,
    updated_at: now,
  }, { onConflict: "user_id" });

  if (dbError) {
    console.error("Failed to upsert user record:", dbError.message);
    throw dbError;
  }
  console.log("User record created/updated.");

  console.log("");
  console.log("=".repeat(50));
  console.log("Super Admin user created successfully!");
  console.log("=".repeat(50));
  console.log("");
  console.log("Login credentials:");
  console.log(`  Email:    ${SUPER_ADMIN_EMAIL}`);
  console.log("  Password: [set from SUPER_ADMIN_PASSWORD]");
  console.log("");
  console.log("Sign in at /auth/sign-in");
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
