import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { nanoid } from "nanoid";

export const runtime = "nodejs";

type TgUser = {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
};

type TgMessage = {
  message_id: number;
  from?: TgUser;
  chat: { id: number; type: string };
  text?: string;
  contact?: { phone_number: string; user_id?: number };
};

type TgCallbackQuery = {
  id: string;
  from: TgUser;
  message?: { message_id: number; chat: { id: number } };
  data?: string;
};

type TgUpdate = {
  update_id: number;
  message?: TgMessage;
  callback_query?: TgCallbackQuery;
};

function tgApiUrl(method: string) {
  return `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`;
}

async function tgCall(method: string, body: unknown) {
  const res = await fetch(tgApiUrl(method), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.ok) {
    throw new Error(`Telegram API error (${method})`);
  }

  return json;
}

async function sendMessage(chatId: number, text: string, extra?: Record<string, unknown>) {
  return tgCall("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    ...extra,
  });
}

async function answerCallbackQuery(id: string) {
  return tgCall("answerCallbackQuery", { callback_query_id: id });
}

function normalizePhoneRaw(input: string) {
  const digits = input.replace(/\D/g, "");
  return digits;
}

function phoneVariants(digits: string) {
  const variants = new Set<string>();
  if (!digits) return [];

  variants.add(digits);

  // Nigeria-friendly variants: 234XXXXXXXXXX <-> 0XXXXXXXXXX
  if (digits.startsWith("234") && digits.length >= 13) {
    variants.add(`0${digits.slice(3)}`);
    variants.add(`+${digits}`);
  }
  if (digits.startsWith("0") && digits.length >= 11) {
    variants.add(`234${digits.slice(1)}`);
    variants.add(`+234${digits.slice(1)}`);
  }
  if (digits.startsWith("+")) {
    variants.add(digits.slice(1));
  }

  return Array.from(variants);
}

async function getOrInitBotSession(telegramUserId: string) {
  const existing = await prisma.botSession.findUnique({ where: { telegramUserId } });
  if (existing) return existing;

  return prisma.botSession.create({
    data: {
      telegramUserId,
      state: "idle",
      data: {},
    },
  });
}

async function setBotSession(telegramUserId: string, state: string, data?: any) {
  return prisma.botSession.upsert({
    where: { telegramUserId },
    update: { state, data: data ?? {}, updatedAt: new Date() },
    create: { telegramUserId, state, data: data ?? {} },
  });
}

async function findUserByTelegramId(telegramUserId: string) {
  return prisma.user.findFirst({
    where: { telegramUserId },
    include: { resident: true, estate: true },
  });
}

async function linkUserByPhone(telegramUserId: string, telegramUsername: string | undefined, phoneNumber: string) {
  const digits = normalizePhoneRaw(phoneNumber);
  const variants = phoneVariants(digits);

  // Try exact matches for common variants.
  const user = await prisma.user.findFirst({
    where: {
      phone: { in: variants },
    },
    include: { resident: true, estate: true },
  });

  if (!user) return null;

  // Prevent accidentally linking across estates/roles? We allow any role; bot will gate later.
  return prisma.user.update({
    where: { id: user.id },
    data: {
      telegramUserId,
      telegramUsername: telegramUsername ?? user.telegramUsername,
    },
    include: { resident: true, estate: true },
  });
}

function isEstateActive(user: any) {
  return user?.estate?.status === "ACTIVE";
}

function isResidentActive(user: any) {
  return user?.resident?.status === "APPROVED";
}

function escapeHtml(text: string) {
  return text.replace(/[&<>"']/g, (c) => {
    switch (c) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return c;
    }
  });
}

function estateNameFromUser(user: any) {
  return user?.estate?.name ? String(user.estate.name) : "";
}

function residentPolicyText(estateName: string) {
  const safeEstateName = escapeHtml(estateName);
  return (
    `Welcome to <b>Basic securities</b>.\n` +
    (safeEstateName ? `Estate: <b>${safeEstateName}</b>\n\n` : "\n") +
    `<b>Rules & Compliance</b>\n` +
    `1) Codes are for access control only — do not sell or post publicly.\n` +
    `2) Share a code only with the intended guest/domestic staff.\n` +
    `3) Guests must validate the code at the gate before entry.\n` +
    `4) One-time guest codes expire after validation or 6 hours (whichever comes first).\n` +
    `5) Misuse may lead to account suspension and code revocation.\n\n` +
    `By tapping <b>I Agree</b>, you acknowledge these rules and consent to security logging for gate validations within the estate.`
  );
}

function residentPolicyKeyboard() {
  return {
    inline_keyboard: [
      [{ text: "I Agree", callback_data: "R:ACK_POLICY" }],
      [{ text: "Help / Support", callback_data: "HELP" }],
    ],
  };
}

function residentHasAckedPolicy(session: any) {
  const data = (session?.data ?? {}) as any;
  return Boolean(data?.residentPolicyAckedAt);
}

function residentMenuKeyboard() {
  return {
    inline_keyboard: [
      [{ text: "Generate code", callback_data: "R:GEN" }],
      [{ text: "Manage House Help Codes", callback_data: "R:STAFF_LIST" }],
      [{ text: "Help / Support", callback_data: "HELP" }],
    ],
  };
}

function guardMenuKeyboard() {
  return {
    inline_keyboard: [[{ text: "Validate Visitor Code", callback_data: "G:START_VALIDATE" }]],
  };
}

async function showHome(chatId: number, telegramUserId: string) {
  const user = await findUserByTelegramId(telegramUserId);

  if (!user) {
    await setBotSession(telegramUserId, "awaiting_contact", {});
    return sendMessage(
      chatId,
      "Welcome to <b>Basic securities</b>.\n\nTo continue, please share your phone number so we can link your account.",
      {
        reply_markup: {
          keyboard: [[{ text: "Share phone number", request_contact: true }]],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      }
    );
  }

  if (!isEstateActive(user)) {
    return sendMessage(chatId, "Access blocked. Contact Estate Admin.");
  }

  const estateName = estateNameFromUser(user);

  if (user.role === "RESIDENT" || user.role === "RESIDENT_DELEGATE") {
    if (!isResidentActive(user)) {
      return sendMessage(chatId, "Your account is disabled. Contact admin.");
    }

    const session = await getOrInitBotSession(telegramUserId);
    if (!residentHasAckedPolicy(session)) {
      await setBotSession(telegramUserId, "resident_policy", session.data ?? {});
      return sendMessage(chatId, residentPolicyText(estateName), {
        reply_markup: residentPolicyKeyboard(),
      });
    }

    await setBotSession(telegramUserId, "resident_menu", session.data ?? {});
    return sendMessage(chatId, `Welcome to <b>Basic securities</b>.\nEstate: <b>${escapeHtml(estateName)}</b>`, {
      reply_markup: residentMenuKeyboard(),
    });
  }

  if (user.role === "GUARD") {
    await setBotSession(telegramUserId, "guard_menu", {});
    return sendMessage(chatId, `Welcome to <b>Basic securities</b>.\nEstate: <b>${escapeHtml(estateName)}</b>`, {
      reply_markup: guardMenuKeyboard(),
    });
  }

  return sendMessage(chatId, "This bot is not enabled for your role. Contact Estate Admin.");
}

async function createCodeForResident(user: any, type: "GUEST" | "STAFF") {
  const now = new Date();
  const expiresAt = type === "GUEST" ? new Date(now.getTime() + 6 * 60 * 60 * 1000) : new Date(now.getTime() + 183 * 24 * 60 * 60 * 1000);

  // try a few times for uniqueness
  let created = null as any;
  for (let i = 0; i < 4; i++) {
    const codeValue = `BS-${nanoid(8).toUpperCase()}`;
    try {
      created = await prisma.code.create({
        data: {
          estateId: user.estateId,
          residentId: user.residentId,
          createdById: user.id,
          type,
          code: codeValue,
          expiresAt,
        },
      });
      break;
    } catch {
      // retry
    }
  }

  if (!created) throw new Error("Failed to generate unique code");

  await prisma.activityLog.create({
    data: {
      estateId: user.estateId,
      type: "CODE_CREATED",
      message: `${type} code created for House ${user.resident?.houseNumber ?? "?"}`,
    },
  });

  return created;
}

async function logValidationAttempt(params: {
  estateId: string;
  guardUserId: string;
  codeValue: string;
  gateId?: string | null;
  gateName?: string | null;
  decision: "ALLOW" | "DENY";
  codeId?: string | null;
  residentName?: string | null;
  houseNumber?: string | null;
  passType?: "GUEST" | "STAFF" | null;
}) {
  return prisma.validationLog.create({
    data: {
      estateId: params.estateId,
      guardUserId: params.guardUserId,
      codeId: params.codeId ?? null,
      codeValue: params.codeValue,
      decision: params.decision,
      gateId: params.gateId ?? null,
      gateName: params.gateName ?? null,
      residentName: params.residentName ?? null,
      houseNumber: params.houseNumber ?? null,
      passType: (params.passType as any) ?? null,
    },
  });
}

async function validateCodeAsGuard(params: {
  guard: any;
  codeValue: string;
  gateId?: string | null;
}) {
  const guard = params.guard;
  const codeValue = params.codeValue.trim();

  const gate = params.gateId
    ? await prisma.gate.findFirst({ where: { id: params.gateId, estateId: guard.estateId } })
    : null;

  if (!isEstateActive(guard)) {
    return { ok: false as const, message: "Estate suspended. Contact admin." };
  }

  const code = await prisma.code.findFirst({
    where: { estateId: guard.estateId, code: codeValue },
    include: { resident: true },
  });

  if (!code) {
    return { ok: false as const, message: "Access Denied\nReason: Code not found" };
  }

  if (code.status !== "ACTIVE") {
    return { ok: false as const, message: `Access Denied\nReason: Code is ${code.status}` };
  }

  const now = new Date();
  if (now > code.expiresAt) {
    await prisma.code.update({ where: { id: code.id }, data: { status: "EXPIRED" } });
    return { ok: false as const, message: "Access Denied\nReason: Expired" };
  }

  // Resident must be active/approved
  if (code.resident.status !== "APPROVED") {
    return { ok: false as const, message: "Access Denied\nReason: Resident disabled" };
  }

  // SUCCESS path: create log + update code per type.
  const result = await prisma.$transaction(async (tx) => {
    const log = await tx.validationLog.create({
      data: {
        estateId: guard.estateId,
        guardUserId: guard.id,
        codeId: code.id,
        decision: "ALLOW",
        gateId: gate?.id ?? null,
        gateName: gate?.name ?? null,
        houseNumber: code.resident.houseNumber,
        residentName: code.resident.name,
        passType: code.type,
        codeValue: code.code,
      },
    });

    let updatedCode = code;

    if (code.type === "GUEST") {
      updatedCode = await tx.code.update({
        where: { id: code.id },
        data: {
          status: "USED",
          expiresAt: now,
          lastValidatedAt: now,
        },
        include: { resident: true },
      });
    } else {
      updatedCode = await tx.code.update({
        where: { id: code.id },
        data: { lastValidatedAt: now },
        include: { resident: true },
      });
    }

    await tx.activityLog.create({
      data: {
        estateId: guard.estateId,
        type: "VALIDATION_RECORDED",
        message: `Validation ALLOW for House ${code.resident.houseNumber} (${code.type})`,
      },
    });

    return { log, code: updatedCode };
  });

  return {
    ok: true as const,
    residentName: code.resident.name,
    houseNumber: code.resident.houseNumber,
    passType: code.type,
    message: `Access Granted\nResident: ${code.resident.name}\nAddress: House ${code.resident.houseNumber}`,
    logId: result.log.id,
  };
}

export async function POST(req: Request) {
  if (!env.TELEGRAM_BOT_TOKEN) {
    return NextResponse.json({ error: "Telegram bot not configured" }, { status: 503 });
  }

  const secretHeader = req.headers.get("x-telegram-bot-api-secret-token");
  if (env.TELEGRAM_WEBHOOK_SECRET && secretHeader !== env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const update = (await req.json().catch(() => null)) as TgUpdate | null;
  if (!update) return NextResponse.json({ ok: true });

  // callback query
  if (update.callback_query) {
    const cq = update.callback_query;
    const chatId = cq.message?.chat.id;
    const telegramUserId = String(cq.from.id);
    const data = cq.data ?? "";

    if (chatId == null) {
      await answerCallbackQuery(cq.id);
      return NextResponse.json({ ok: true });
    }

    await answerCallbackQuery(cq.id);

    const user = await findUserByTelegramId(telegramUserId);
    if (!user) {
      await sendMessage(chatId, "Please link your account first.");
      await showHome(chatId, telegramUserId);
      return NextResponse.json({ ok: true });
    }

    // HELP
    if (data === "HELP") {
      await sendMessage(chatId, "If you need help, contact your Estate Admin.");
      await showHome(chatId, telegramUserId);
      return NextResponse.json({ ok: true });
    }

    // Resident flows
    if ((user.role === "RESIDENT" || user.role === "RESIDENT_DELEGATE") && data.startsWith("R:")) {
      if (!isEstateActive(user)) {
        await sendMessage(chatId, "Estate suspended. Contact admin.");
        return NextResponse.json({ ok: true });
      }
      if (!isResidentActive(user)) {
        await sendMessage(chatId, "Your account is disabled. Contact admin.");
        return NextResponse.json({ ok: true });
      }

      // Enforce rules/compliance acknowledgment before resident can proceed.
      if (data !== "R:ACK_POLICY") {
        const session = await getOrInitBotSession(telegramUserId);
        if (!residentHasAckedPolicy(session)) {
          await setBotSession(telegramUserId, "resident_policy", session.data ?? {});
          await sendMessage(chatId, residentPolicyText(estateNameFromUser(user)), {
            reply_markup: residentPolicyKeyboard(),
          });
          return NextResponse.json({ ok: true });
        }
      }

      if (data === "R:ACK_POLICY") {
        const session = await getOrInitBotSession(telegramUserId);
        const merged = { ...(session.data as any), residentPolicyAckedAt: new Date().toISOString() };
        await setBotSession(telegramUserId, "resident_menu", merged);
        await sendMessage(chatId, "Thanks — you can now generate codes.");
        await showHome(chatId, telegramUserId);
        return NextResponse.json({ ok: true });
      }

      if (data === "R:GEN") {
        await setBotSession(telegramUserId, "resident_generate_type", {});
        await sendMessage(chatId, "Select Code Type:", {
          reply_markup: {
            inline_keyboard: [
              [{ text: "Guest (one-time)", callback_data: "R:GEN_TYPE:GUEST" }],
              [{ text: "House Help (recurring)", callback_data: "R:GEN_TYPE:STAFF" }],
              [{ text: "Back", callback_data: "R:HOME" }],
            ],
          },
        });
        return NextResponse.json({ ok: true });
      }

      if (data.startsWith("R:GEN_TYPE:")) {
        const type = data.split(":")[2] as "GUEST" | "STAFF";
        const duration = type === "GUEST" ? "6 hours" : "6 months";
        const rule = type === "GUEST" ? "One-time. Expires immediately after validation." : "Recurring. Can be renewed.";

        await setBotSession(telegramUserId, "resident_generate_confirm", { type });
        await sendMessage(chatId, `You selected <b>${type === "GUEST" ? "Guest" : "House Help"}</b>.\n\nExpiry: <b>${duration}</b>\nRules: ${rule}\n\nProceed?`, {
          reply_markup: {
            inline_keyboard: [
              [{ text: "✅ Confirm", callback_data: `R:GEN_CONFIRM:${type}` }],
              [{ text: "Cancel", callback_data: "R:HOME" }],
            ],
          },
        });
        return NextResponse.json({ ok: true });
      }

      if (data.startsWith("R:GEN_CONFIRM:")) {
        const type = data.split(":")[2] as "GUEST" | "STAFF";
        const created = await createCodeForResident(user, type);
        const expiry = new Date(created.expiresAt).toLocaleString();
        const recipient = type === "GUEST" ? "guest" : "domestic staff";
        await sendMessage(
          chatId,
          `Your code: <b>${created.code}</b>\nExpiry: <b>${expiry}</b>\n\n<b>Next step:</b> Validate this code at the gate.\nShare this code with your ${recipient}.`,
          {
          reply_markup: {
            inline_keyboard: [[{ text: "Back to menu", callback_data: "R:HOME" }]],
          },
          }
        );
        await setBotSession(telegramUserId, "resident_menu", {});
        return NextResponse.json({ ok: true });
      }

      if (data === "R:STAFF_LIST") {
        const codes = await prisma.code.findMany({
          where: { estateId: user.estateId!, residentId: user.residentId!, type: "STAFF" },
          orderBy: { createdAt: "desc" },
          take: 10,
        });

        if (!codes.length) {
          await sendMessage(chatId, "No House Help codes yet.", {
            reply_markup: { inline_keyboard: [[{ text: "Back", callback_data: "R:HOME" }]] },
          });
          return NextResponse.json({ ok: true });
        }

        await setBotSession(telegramUserId, "resident_staff_pick", {});
        await sendMessage(chatId, "Select a House Help code:", {
          reply_markup: {
            inline_keyboard: [
              ...codes.map((c) => [
                {
                  text: `${c.code} (exp ${new Date(c.expiresAt).toLocaleDateString()})`,
                  callback_data: `R:STAFF_PICK:${c.id}`,
                },
              ]),
              [{ text: "Back", callback_data: "R:HOME" }],
            ],
          },
        });

        return NextResponse.json({ ok: true });
      }

      if (data.startsWith("R:STAFF_PICK:")) {
        const codeId = data.split(":")[2];
        const code = await prisma.code.findFirst({ where: { id: codeId, estateId: user.estateId!, residentId: user.residentId! } });
        if (!code || code.type !== "STAFF") {
          await sendMessage(chatId, "Please select a valid option.");
          await showHome(chatId, telegramUserId);
          return NextResponse.json({ ok: true });
        }

        await setBotSession(telegramUserId, "resident_staff_actions", { codeId });
        await sendMessage(chatId, `Code: <b>${code.code}</b>\nExpiry: <b>${new Date(code.expiresAt).toLocaleString()}</b>\nStatus: <b>${code.status}</b>`, {
          reply_markup: {
            inline_keyboard: [
              [{ text: "Renew", callback_data: `R:STAFF_RENEW:${code.id}` }],
              [{ text: "Revoke", callback_data: `R:STAFF_REVOKE:${code.id}` }],
              [{ text: "Back", callback_data: "R:STAFF_LIST" }],
            ],
          },
        });

        return NextResponse.json({ ok: true });
      }

      if (data.startsWith("R:STAFF_RENEW:")) {
        const codeId = data.split(":")[2];
        const now = new Date();
        const newExpiry = new Date(now.getTime() + 183 * 24 * 60 * 60 * 1000);

        const existing = await prisma.code.findFirst({
          where: {
            id: codeId,
            estateId: user.estateId!,
            residentId: user.residentId!,
            type: "STAFF",
          },
        });

        if (!existing) {
          await sendMessage(chatId, "Please select a valid option.");
          await showHome(chatId, telegramUserId);
          return NextResponse.json({ ok: true });
        }

        const updated = await prisma.code.update({
          where: { id: existing.id },
          data: { expiresAt: newExpiry, status: "ACTIVE" },
        });

        await prisma.activityLog.create({
          data: {
            estateId: user.estateId!,
            type: "CODE_RENEWED",
            message: `STAFF code renewed for House ${user.resident?.houseNumber ?? "?"}`,
          },
        });

        await sendMessage(chatId, `Code renewed until <b>${new Date(updated.expiresAt).toLocaleString()}</b>.`, {
          reply_markup: { inline_keyboard: [[{ text: "Back", callback_data: "R:STAFF_LIST" }]] },
        });

        return NextResponse.json({ ok: true });
      }

      if (data.startsWith("R:STAFF_REVOKE:")) {
        const codeId = data.split(":")[2];
        const now = new Date();

        const existing = await prisma.code.findFirst({
          where: {
            id: codeId,
            estateId: user.estateId!,
            residentId: user.residentId!,
            type: "STAFF",
          },
        });

        if (!existing) {
          await sendMessage(chatId, "Please select a valid option.");
          await showHome(chatId, telegramUserId);
          return NextResponse.json({ ok: true });
        }

        await prisma.code.update({
          where: { id: existing.id },
          data: { status: "REVOKED", expiresAt: now },
        });

        await prisma.activityLog.create({
          data: {
            estateId: user.estateId!,
            type: "CODE_REVOKED",
            message: `STAFF code revoked for House ${user.resident?.houseNumber ?? "?"}`,
          },
        });

        await sendMessage(chatId, "Code revoked successfully.", {
          reply_markup: { inline_keyboard: [[{ text: "Back", callback_data: "R:STAFF_LIST" }]] },
        });

        return NextResponse.json({ ok: true });
      }

      if (data === "R:HOME") {
        await showHome(chatId, telegramUserId);
        return NextResponse.json({ ok: true });
      }

      await sendMessage(chatId, "Please select a valid option.");
      await showHome(chatId, telegramUserId);
      return NextResponse.json({ ok: true });
    }

    // Guard flows
    if (user.role === "GUARD" && data.startsWith("G:")) {
      if (data === "G:START_VALIDATE") {
        if (!isEstateActive(user)) {
          await sendMessage(chatId, "Estate suspended. Contact admin.");
          return NextResponse.json({ ok: true });
        }

        const gates = await prisma.gate.findMany({ where: { estateId: user.estateId! }, orderBy: { name: "asc" } });
        if (!gates.length) {
          await sendMessage(chatId, "No gates configured. Contact Estate Admin.");
          await showHome(chatId, telegramUserId);
          return NextResponse.json({ ok: true });
        }

        if (gates.length === 1) {
          await setBotSession(telegramUserId, "guard_awaiting_code", { gateId: gates[0].id });
          await sendMessage(chatId, `Gate: <b>${gates[0].name}</b>\n\nEnter Code:`);
          return NextResponse.json({ ok: true });
        }

        await setBotSession(telegramUserId, "guard_pick_gate", {});
        await sendMessage(chatId, "Select gate:", {
          reply_markup: {
            inline_keyboard: [
              ...gates.map((g) => [{ text: g.name, callback_data: `G:GATE:${g.id}` }]),
              [{ text: "Back", callback_data: "G:HOME" }],
            ],
          },
        });
        return NextResponse.json({ ok: true });
      }

      if (data.startsWith("G:GATE:")) {
        const gateId = data.split(":")[2];
        const gate = await prisma.gate.findFirst({ where: { id: gateId, estateId: user.estateId! } });
        if (!gate) {
          await sendMessage(chatId, "Please select a valid gate.");
          return NextResponse.json({ ok: true });
        }

        await setBotSession(telegramUserId, "guard_awaiting_code", { gateId: gate.id });
        await sendMessage(chatId, `Gate: <b>${gate.name}</b>\n\nEnter Code:`);
        return NextResponse.json({ ok: true });
      }

      if (data === "G:HOME") {
        await showHome(chatId, telegramUserId);
        return NextResponse.json({ ok: true });
      }

      await sendMessage(chatId, "Please select a valid option.");
      await showHome(chatId, telegramUserId);
      return NextResponse.json({ ok: true });
    }

    await sendMessage(chatId, "Please select a valid option.");
    await showHome(chatId, telegramUserId);
    return NextResponse.json({ ok: true });
  }

  // message
  if (update.message) {
    const msg = update.message;
    const chatId = msg.chat.id;
    const fromId = msg.from?.id;
    if (!fromId) return NextResponse.json({ ok: true });

    const telegramUserId = String(fromId);
    const text = msg.text?.trim() ?? "";

    // Contact sharing links account.
    if (msg.contact?.phone_number) {
      const linked = await linkUserByPhone(telegramUserId, msg.from?.username, msg.contact.phone_number);
      await sendMessage(chatId, linked ? "Account linked successfully." : "Phone number not recognized. Contact Estate Admin.", {
        reply_markup: { remove_keyboard: true },
      });
      await showHome(chatId, telegramUserId);
      return NextResponse.json({ ok: true });
    }

    // /start or any text returns home unless we're awaiting a code.
    const session = await getOrInitBotSession(telegramUserId);

    if (session.state === "guard_awaiting_code" && text) {
      const guard = await findUserByTelegramId(telegramUserId);
      if (!guard || guard.role !== "GUARD") {
        await sendMessage(chatId, "Unauthorized. Contact Estate Admin.");
        return NextResponse.json({ ok: true });
      }

      const gateId = (session.data as any)?.gateId as string | undefined;
      const result = await validateCodeAsGuard({ guard, codeValue: text, gateId: gateId ?? null });

      await sendMessage(chatId, result.ok ? `✅ Valid\n\n${result.message}` : `❌ Invalid / Expired / Used\n\n${result.message}`);
      await setBotSession(telegramUserId, "guard_menu", {});
      await showHome(chatId, telegramUserId);
      return NextResponse.json({ ok: true });
    }

    if (text === "/start" || text === "/menu" || text === "menu") {
      await showHome(chatId, telegramUserId);
      return NextResponse.json({ ok: true });
    }

    // Default: show menu.
    await showHome(chatId, telegramUserId);
  }

  return NextResponse.json({ ok: true });
}
