import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

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
        await sleep(250 * attempt);
        continue;
      }
    }
  }

  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

function findTryCloudflareUrl(text) {
  const m = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/i);
  return m ? m[0] : null;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function readPossiblyUtf16Log(filePath) {
  if (!fs.existsSync(filePath)) return "";
  const buf = fs.readFileSync(filePath);

  // PowerShell Start-Process redirection often results in UTF-16LE logs.
  // Heuristic: BOM or lots of NUL bytes.
  const hasUtf16Bom = buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe;
  const nulCount = (() => {
    let n = 0;
    for (let i = 0; i < buf.length; i++) if (buf[i] === 0) n++;
    return n;
  })();
  const looksUtf16 = hasUtf16Bom || (nulCount > Math.max(8, buf.length / 10));

  return looksUtf16 ? buf.toString("utf16le") : buf.toString("utf8");
}

async function startCloudflaredDetached({ cloudflaredPath, logPath, errPath }) {
  // Start cloudflared detached from this terminal so later commands won't send Ctrl+C to it.
  // We redirect stdout/stderr to files, then poll the log for the assigned trycloudflare URL.
  const ps = spawn(
    "powershell",
    [
      "-NoProfile",
      "-Command",
      [
        "$p = Start-Process",
        `-FilePath '${cloudflaredPath.replace(/'/g, "''")}'`,
        "-ArgumentList @('tunnel','--url','http://127.0.0.1:3000')",
        `-RedirectStandardOutput '${logPath.replace(/'/g, "''")}'`,
        `-RedirectStandardError '${errPath.replace(/'/g, "''")}'`,
        "-PassThru",
        "-WindowStyle Hidden;",
        "$p.Id",
      ].join(" "),
    ],
    { stdio: ["ignore", "pipe", "pipe"] }
  );

  const stdout = await new Promise((resolve, reject) => {
    let out = "";
    ps.stdout.on("data", (d) => (out += d.toString("utf8")));
    ps.stderr.on("data", (d) => (out += d.toString("utf8")));
    ps.on("error", reject);
    ps.on("exit", (code) => {
      if (code === 0) resolve(out.trim());
      else reject(new Error(`Failed to start cloudflared (exit ${code ?? "unknown"})`));
    });
  });

  const pid = Number.parseInt(stdout, 10);
  if (!Number.isFinite(pid)) {
    throw new Error(`Could not determine cloudflared PID. Output: ${stdout}`);
  }

  return pid;
}

async function main() {
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

  const cloudflaredPath = path.join(repoRoot, "tools", "cloudflared.exe");
  if (!fs.existsSync(cloudflaredPath)) {
    console.error("Missing tools/cloudflared.exe. Download it first.");
    process.exit(1);
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const logPath = path.join(repoRoot, "tools", `cloudflared-${stamp}.out.log`);
  const errPath = path.join(repoRoot, "tools", `cloudflared-${stamp}.err.log`);

  console.log("Starting Cloudflare Quick Tunnel (detached) -> http://127.0.0.1:3000");
  const pid = await startCloudflaredDetached({
    cloudflaredPath,
    logPath,
    errPath,
  });

  let baseUrl = null;
  const timeoutAt = Date.now() + 60_000;
  while (Date.now() < timeoutAt) {
    const out = readPossiblyUtf16Log(logPath);
    const err = readPossiblyUtf16Log(errPath);
    baseUrl = findTryCloudflareUrl(`${out}\n${err}`);
    if (baseUrl) break;
    await sleep(250);
  }

  if (!baseUrl) {
    console.error("Timed out waiting for trycloudflare URL.");
    console.error(`Check logs: ${logPath} and ${errPath}`);
    console.error(`cloudflared PID: ${pid}`);
    process.exit(1);
  }

  const webhookUrl = `${baseUrl}/api/telegram/webhook`;
  console.log(`Detected tunnel URL: ${baseUrl}`);
  console.log(`Setting Telegram webhook -> ${webhookUrl}`);

  // Telegram may briefly fail to resolve a fresh trycloudflare hostname.
  // Retry for a short period instead of failing immediately.
  const startedAt = Date.now();
  const timeoutMs = 600_000;
  // Small initial delay helps propagation.
  await sleep(2_000);

  let lastErr = null;
  let attempts = 0;
  while (Date.now() - startedAt < timeoutMs) {
    attempts++;
    try {
      await tgCall(token, "setWebhook", {
        url: webhookUrl,
        drop_pending_updates: true,
        ...(secret ? { secret_token: secret } : {}),
      });
      lastErr = null;
      break;
    } catch (e) {
      lastErr = e;
      const msg = e instanceof Error ? e.message : String(e);
      if (!msg.includes("Failed to resolve host")) throw e;

      if (attempts === 1 || attempts % 6 === 0) {
        console.log("Waiting for Telegram to resolve tunnel hostname…");
      }

      await sleep(5_000);
    }
  }

  if (lastErr) {
    // Avoid leaving an orphaned tunnel running if webhook could not be set.
    try {
      process.kill(pid);
    } catch {
      // ignore
    }
    throw lastErr;
  }

  // Verify webhook actually stuck.
  const info = await tgCall(token, "getWebhookInfo");
  const currentUrl = info?.result?.url || "";
  if (currentUrl !== webhookUrl) {
    try {
      process.kill(pid);
    } catch {
      // ignore
    }
    throw new Error(`Webhook verification failed (expected ${webhookUrl}, got ${currentUrl}).`);
  }

  console.log("Webhook set successfully.");
  if (secret) console.log("Webhook secret enabled (x-telegram-bot-api-secret-token).");
  else console.log("Webhook secret not set (ok for local testing; recommended for production).");

  console.log(`cloudflared PID: ${pid}`);
  console.log(`cloudflared logs: ${logPath}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
