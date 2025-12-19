import fs from "node:fs";
import path from "node:path";

function parseArgs(argv) {
  const args = { url: null, action: "set" };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--url") args.url = argv[++i] ?? null;
    else if (a === "--get" || a === "info") args.action = "info";
    else if (a === "--delete" || a === "delete") args.action = "delete";
  }
  return args;
}

function readEnvFile(envPath) {
  if (!fs.existsSync(envPath)) return {};
  const raw = fs.readFileSync(envPath, "utf8");
  const out = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

async function tgCall(token, method, body) {
  const url = `https://api.telegram.org/bot${token}/${method}`;
  let lastErr = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15_000);
      const res = await fetch(url, {
        method: body ? "POST" : "GET",
        headers: body ? { "content-type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        const desc = json?.description ? `: ${json.description}` : "";
        throw new Error(`Telegram API error (${method})${desc}`);
      }
      return json;
    } catch (e) {
      lastErr = e;
      if (attempt < 3) {
        await new Promise((r) => setTimeout(r, 250 * attempt));
        continue;
      }
    }
  }

  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const repoRoot = process.cwd();
  const env = {
    ...readEnvFile(path.join(repoRoot, ".env")),
    ...readEnvFile(path.join(repoRoot, ".env.local")),
  };

  const token = env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
  const secret = env.TELEGRAM_WEBHOOK_SECRET || process.env.TELEGRAM_WEBHOOK_SECRET;

  if (!token) {
    console.error("Missing TELEGRAM_BOT_TOKEN. Put it in .env/.env.local or export it in the shell.");
    process.exit(1);
  }

  if (args.action === "info") {
    const me = await tgCall(token, "getMe");
    const username = me?.result?.username ? `@${me.result.username}` : "(no username)";
    const id = me?.result?.id ? String(me.result.id) : "?";
    console.log(`Bot: ${username} (id: ${id})`);
    const info = await tgCall(token, "getWebhookInfo");
    console.log(JSON.stringify(info.result, null, 2));
    return;
  }

  if (args.action === "delete") {
    const res = await tgCall(token, "setWebhook", { url: "" });
    console.log(res.result ? "Webhook cleared." : "Webhook clear failed.");
    return;
  }

  if (!args.url) {
    console.error("Usage: node scripts/telegram-webhook.mjs --url https://<public>/api/telegram/webhook");
    process.exit(1);
  }

  const body = {
    url: args.url,
    drop_pending_updates: true,
    ...(secret ? { secret_token: secret } : {}),
  };

  const res = await tgCall(token, "setWebhook", body);
  if (!res.result) {
    console.error("Webhook set failed.");
    process.exit(1);
  }

  const info = await tgCall(token, "getWebhookInfo");
  if (info?.result?.url !== args.url) {
    console.error(`Webhook verification failed (expected ${args.url}, got ${info?.result?.url || ""}).`);
    process.exit(1);
  }

  console.log("Webhook set.");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
