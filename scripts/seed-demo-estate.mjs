#!/usr/bin/env node
/**
 * Seed script: creates the "Jehova Elohim" demo estate with all accounts.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-demo-estate.mjs
 *
 * Or set them in .env and run:
 *   node --env-file=.env scripts/seed-demo-estate.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { randomInt } from "node:crypto";
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

function nanoid(len = 12) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function genPassword() {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnpqrstuvwxyz";
  const digits = "23456789";
  const special = "!@#$";
  const pick = (s) => s[Math.floor(Math.random() * s.length)];
  const required = [pick(upper), pick(lower), pick(digits), pick(special)];
  const all = upper + lower + digits;
  const rest = Array.from({ length: 4 }, () => pick(all));
  const chars = [...required, ...rest];
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

function genVerificationCode(initials) {
  const digits = Array.from({ length: 4 }, () => Math.floor(Math.random() * 10)).join("");
  const letters = Array.from({ length: 4 }, () => String.fromCharCode(65 + Math.floor(Math.random() * 26))).join("");
  return `BS-${initials}-${digits}${letters}`;
}

function luhnCheck(payload) {
  let sum = 0;
  for (let i = payload.length - 1; i >= 0; i--) {
    let d = Number(payload[i]);
    if ((payload.length - 1 - i) % 2 === 0) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
  }
  return String((10 - (sum % 10)) % 10);
}

function genAccessCode() {
  const payloadLen = 7;
  const min = 10 ** (payloadLen - 1);
  const max = 10 ** payloadLen;
  const payload = String(randomInt(min, max));
  return payload + luhnCheck(payload);
}

async function createAuthUser(email, password, name, role, estateId) {
  const { data, error } = await sb.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, role, estate_id: estateId },
  });
  if (error) {
    if (error.message?.includes("already been registered")) {
      // Find existing user and update their metadata
      const { data: { users } } = await sb.auth.admin.listUsers();
      const existing = users.find(u => u.email === email);
      if (existing) {
        await sb.auth.admin.updateUserById(existing.id, {
          password,
          user_metadata: { name, role, estate_id: estateId },
        });
        console.log(`  (existing user reused: ${email})`);
        return existing;
      }
    }
    throw new Error(`Auth createUser failed for ${email}: ${error.message}`);
  }
  return data.user;
}

async function main() {
  console.log("\n=== Seeding Jehova Elohim Estate Demo ===\n");

  // 0. Clean up previous demo estate if it exists
  const { data: existing } = await sb.from("estates").select("estate_id").eq("name", "Jehova Elohim Estate");
  if (existing?.length) {
    for (const e of existing) {
      console.log(`Cleaning up previous estate: ${e.estate_id}`);
      await sb.from("activity_logs").delete().eq("estate_id", e.estate_id);
      await sb.from("validation_logs").delete().eq("estate_id", e.estate_id);
      await sb.from("guard_shifts").delete().eq("estate_id", e.estate_id);
      await sb.from("codes").delete().eq("estate_id", e.estate_id);
      await sb.from("users").delete().eq("estate_id", e.estate_id);
      await sb.from("residents").delete().eq("estate_id", e.estate_id);
      await sb.from("gates").delete().eq("estate_id", e.estate_id);
      await sb.from("estates").delete().eq("estate_id", e.estate_id);
    }
    console.log("Previous data cleaned.\n");
  }

  // 1. Create Estate
  const estateId = `est_${nanoid()}`;
  const now = new Date();
  const trialEnds = new Date(now);
  trialEnds.setDate(trialEnds.getDate() + 90);

  const { error: estateErr } = await sb.from("estates").insert({
    estate_id: estateId,
    name: "Jehova Elohim Estate",
    initials: "JE",
    status: "ACTIVE",
    address: "Lekki Phase 2, Lagos, Nigeria",
    subscription_tier: "PREMIUM",
    subscription_status: "TRIALING",
    billing_cycle: "MONTHLY",
    trial_started_at: now.toISOString(),
    trial_ends_at: trialEnds.toISOString(),
    max_houses: 100,
    max_admins: 3,
    features: JSON.stringify({
      exportEnabled: true,
      advancedAnalytics: true,
      subAdminEnabled: true,
    }),
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  });
  if (estateErr) { console.error("Estate creation failed:", estateErr); process.exit(1); }
  console.log(`Estate created: ${estateId}`);

  // 2. Create Estate Admin
  const adminPassword = genPassword();
  const adminEmail = process.env.DEMO_ESTATE_ADMIN_EMAIL || "demo-admin@estate.local";
  const adminUser = await createAuthUser(adminEmail, adminPassword, "Estate Admin", "ESTATE_ADMIN", estateId);

  await sb.from("users").insert({
    user_id: adminUser.id,
    estate_id: estateId,
    role: "ESTATE_ADMIN",
    name: "Estate Admin",
    email: adminEmail,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  });

  console.log(`\nEstate Admin:`);
  console.log(`  Email:    ${adminEmail}`);
  console.log(`  Password: ${adminPassword}`);

  // 3. Create Gates
  const gate1Id = `gate_${nanoid()}`;
  const gate2Id = `gate_${nanoid()}`;

  await sb.from("gates").insert([
    { gate_id: gate1Id, estate_id: estateId, name: "Main Gate", shift_type: "DAY", shift_start_hour: 7, shift_end_hour: 19, created_at: now.toISOString(), updated_at: now.toISOString() },
    { gate_id: gate2Id, estate_id: estateId, name: "Back Gate", shift_type: "NIGHT", shift_start_hour: 19, shift_end_hour: 7, created_at: now.toISOString(), updated_at: now.toISOString() },
  ]);
  console.log(`\nGates: Main Gate (Day 7AM-7PM), Back Gate (Night 7PM-7AM)`);

  // 4. Create Guards
  const guard1Password = genPassword();
  const guard1VerCode = genVerificationCode("JE");
  const guard1User = await createAuthUser("guard-emeka@estate.local", guard1Password, "Emeka Okafor", "GUARD", estateId);
  await sb.from("users").insert({
    user_id: guard1User.id, estate_id: estateId, role: "GUARD",
    name: "Emeka Okafor", email: "guard-emeka@estate.local", phone: "+2348001234501",
    verification_code: guard1VerCode,
    created_at: now.toISOString(), updated_at: now.toISOString(),
  });

  const guard2Password = genPassword();
  const guard2VerCode = genVerificationCode("JE");
  const guard2User = await createAuthUser("guard-fatima@estate.local", guard2Password, "Fatima Ibrahim", "GUARD", estateId);
  await sb.from("users").insert({
    user_id: guard2User.id, estate_id: estateId, role: "GUARD",
    name: "Fatima Ibrahim", email: "guard-fatima@estate.local", phone: "+2348001234502",
    verification_code: guard2VerCode,
    created_at: now.toISOString(), updated_at: now.toISOString(),
  });

  console.log(`\nGuard 1 (Day - Main Gate):`);
  console.log(`  Name:              Emeka Okafor`);
  console.log(`  Phone:             +2348001234501`);
  console.log(`  Verification Code: ${guard1VerCode}`);
  console.log(`  Password:          ${guard1Password}`);

  console.log(`\nGuard 2 (Night - Back Gate):`);
  console.log(`  Name:              Fatima Ibrahim`);
  console.log(`  Phone:             +2348001234502`);
  console.log(`  Verification Code: ${guard2VerCode}`);
  console.log(`  Password:          ${guard2Password}`);

  // 5. Create Residents
  const residents = [
    { name: "Dr. Afolabi Adeyemi", house: "A-101", phone: "+2348012345001", email: "afolabi@estate.local" },
    { name: "Mrs. Ngozi Eze", house: "B-205", phone: "+2348012345002", email: "ngozi@estate.local" },
    { name: "Mr. Chukwuemeka Obi", house: "C-310", phone: "+2348012345003", email: "chukwuemeka@estate.local" },
  ];

  const residentAccounts = [];
  for (const r of residents) {
    const residentId = `res_${nanoid()}`;
    const verCode = genVerificationCode("JE");
    const password = genPassword();

    await sb.from("residents").insert({
      resident_id: residentId, estate_id: estateId,
      name: r.name, house_number: r.house,
      status: "APPROVED", phone: r.phone, email: r.email,
      verification_code: verCode,
      created_at: now.toISOString(), updated_at: now.toISOString(),
    });

    const resUser = await createAuthUser(r.email, password, r.name, "RESIDENT", estateId);
    await sb.from("users").insert({
      user_id: resUser.id, estate_id: estateId, role: "RESIDENT",
      name: r.name, email: r.email, phone: r.phone,
      resident_id: residentId,
      created_at: now.toISOString(), updated_at: now.toISOString(),
    });

    residentAccounts.push({ ...r, residentId, verCode, password });
  }

  console.log(`\nResidents:`);
  for (const r of residentAccounts) {
    console.log(`\n  ${r.name} (${r.house}):`);
    console.log(`    Email:             ${r.email}`);
    console.log(`    Phone:             ${r.phone}`);
    console.log(`    Verification Code: ${r.verCode}`);
    console.log(`    Password:          ${r.password}`);
  }

  // 6. Create sample access codes for first resident
  const firstResident = residentAccounts[0];
  const guestCode = genAccessCode();
  const exitCode = genAccessCode();
  const visitId = `visit_${nanoid()}`;
  const codeExpiry = new Date(now.getTime() + 6 * 60 * 60 * 1000); // 6 hours

  const guestCodeId = `code_${nanoid()}`;
  const exitCodeId = `code_${nanoid()}`;

  await sb.from("codes").insert([
    {
      code_id: guestCodeId, estate_id: estateId, code_value: guestCode,
      resident_id: firstResident.residentId, pass_type: "GUEST", status: "ACTIVE",
      event_type: "ENTRY", visit_id: visitId, linked_code_id: exitCodeId,
      guest_count: 2, guest_names: "John & Mary",
      expires_at: codeExpiry.toISOString(),
      created_at: now.toISOString(), updated_at: now.toISOString(),
    },
    {
      code_id: exitCodeId, estate_id: estateId, code_value: exitCode,
      resident_id: firstResident.residentId, pass_type: "GUEST", status: "ACTIVE",
      event_type: "EXIT", visit_id: visitId, linked_code_id: guestCodeId,
      guest_count: 2, guest_names: "John & Mary",
      expires_at: codeExpiry.toISOString(),
      created_at: now.toISOString(), updated_at: now.toISOString(),
    },
  ]);

  // Staff code for second resident
  const staffCode = genAccessCode();
  const staffExpiry = new Date(now.getTime() + 183 * 24 * 60 * 60 * 1000);
  await sb.from("codes").insert({
    code_id: `code_${nanoid()}`, estate_id: estateId, code_value: staffCode,
    resident_id: residentAccounts[1].residentId, pass_type: "STAFF", status: "ACTIVE",
    event_type: "ENTRY", guest_count: 1, guest_names: "Blessing (cleaner)",
    expires_at: staffExpiry.toISOString(),
    created_at: now.toISOString(), updated_at: now.toISOString(),
  });

  console.log(`\nSample Codes:`);
  console.log(`  Guest Entry Code: ${guestCode} (for ${firstResident.name}, 2 guests)`);
  console.log(`  Guest Exit Code:  ${exitCode} (paired with entry above)`);
  console.log(`  Staff Code:       ${staffCode} (for ${residentAccounts[1].name}, cleaner)`);

  // 7. Create sample validation logs
  const sampleLogs = [
    { gate: gate1Id, gateName: "Main Gate", shift: "DAY", outcome: "SUCCESS", decision: "ALLOW", passType: "GUEST", event: "ENTRY", code: guestCode, guardId: guard1User.id, guardName: "Emeka Okafor", resName: firstResident.name, house: firstResident.house, count: 2, hoursAgo: 5 },
    { gate: gate2Id, gateName: "Back Gate", shift: "NIGHT", outcome: "SUCCESS", decision: "ALLOW", passType: "GUEST", event: "EXIT", code: exitCode, guardId: guard2User.id, guardName: "Fatima Ibrahim", resName: firstResident.name, house: firstResident.house, count: 2, hoursAgo: 2 },
    { gate: gate1Id, gateName: "Main Gate", shift: "DAY", outcome: "SUCCESS", decision: "ALLOW", passType: "STAFF", event: "ENTRY", code: staffCode, guardId: guard1User.id, guardName: "Emeka Okafor", resName: residentAccounts[1].name, house: residentAccounts[1].house, count: 1, hoursAgo: 8 },
    { gate: gate1Id, gateName: "Main Gate", shift: "DAY", outcome: "FAILURE", decision: "DENY", passType: "GUEST", event: "ENTRY", code: "9999999", guardId: guard1User.id, guardName: "Emeka Okafor", failureReason: "INVALID_CODE", hoursAgo: 6 },
    { gate: gate2Id, gateName: "Back Gate", shift: "NIGHT", outcome: "FAILURE", decision: "DENY", passType: "GUEST", event: "ENTRY", code: "1111111", guardId: guard2User.id, guardName: "Fatima Ibrahim", failureReason: "CODE_EXPIRED", hoursAgo: 1 },
  ];

  for (const log of sampleLogs) {
    const logTime = new Date(now.getTime() - log.hoursAgo * 60 * 60 * 1000);
    await sb.from("validation_logs").insert({
      log_id: `vlog_${nanoid()}`,
      estate_id: estateId,
      validated_at: logTime.toISOString(),
      gate_id: log.gate,
      gate_name: log.gateName,
      shift_type: log.shift,
      outcome: log.outcome,
      decision: log.decision,
      failure_reason: log.failureReason || null,
      pass_type: log.passType,
      event_type: log.event,
      guest_count: log.count || null,
      resident_name: log.resName || null,
      house_number: log.house || null,
      code_value: log.code,
      guard_user_id: log.guardId,
      guard_name: log.guardName,
    });
  }

  // 8. Activity logs
  const activities = [
    { type: "ESTATE_CREATED", message: "Jehova Elohim Estate created", hoursAgo: 48 },
    { type: "GUARD_CREATED", message: "Emeka Okafor (guard-emeka@estate.local)", hoursAgo: 47 },
    { type: "GUARD_CREATED", message: "Fatima Ibrahim (guard-fatima@estate.local)", hoursAgo: 47 },
    { type: "RESIDENT_ONBOARDED", message: "Dr. Afolabi Adeyemi (Unit A-101)", hoursAgo: 46 },
    { type: "RESIDENT_ONBOARDED", message: "Mrs. Ngozi Eze (Unit B-205)", hoursAgo: 45 },
    { type: "RESIDENT_ONBOARDED", message: "Mr. Chukwuemeka Obi (Unit C-310)", hoursAgo: 44 },
  ];

  for (const act of activities) {
    const actTime = new Date(now.getTime() - act.hoursAgo * 60 * 60 * 1000);
    await sb.from("activity_logs").insert({
      activity_id: `act_${nanoid()}`,
      estate_id: estateId,
      type: act.type,
      message: act.message,
      created_at: actTime.toISOString(),
    });
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log(`\nDemo estate seeded successfully!`);
  console.log(`Estate ID: ${estateId}`);
  console.log(`\nUse the Estate Admin credentials to log in and explore.`);
  console.log(`Guards use their verification codes + passwords to sign in.`);
  console.log(`Residents use their email/phone + passwords.`);
  console.log(`\n${"=".repeat(60)}\n`);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
