#!/usr/bin/env node
/**
 * Expose the local dev server via ngrok.
 *
 *   npm run tunnel        # assumes `npm run dev` is already running
 *   npm run dev:tunnel    # starts `next dev` AND opens a tunnel
 *
 * Requires NGROK_AUTHTOKEN in .env.local (or in the environment).
 * Get a free token from https://dashboard.ngrok.com/get-started/your-authtoken
 */
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Lightweight .env loader — avoids forcing dotenv to be installed at runtime.
loadDotEnv(resolve(fileURLToPath(import.meta.url), "../../.env.local"));
loadDotEnv(resolve(fileURLToPath(import.meta.url), "../../.env"));

const authtoken = (process.env.NGROK_AUTHTOKEN || "").trim();
if (!authtoken) {
  console.error(
    "\n[tunnel] NGROK_AUTHTOKEN is not set.\n" +
      "  1. Sign up at https://ngrok.com\n" +
      "  2. Copy your authtoken from https://dashboard.ngrok.com/get-started/your-authtoken\n" +
      "  3. Add it to .env.local as:\n" +
      "       NGROK_AUTHTOKEN=2abc...xyz\n",
  );
  process.exit(1);
}

const port = Number(process.env.PORT || 3000);
const startDev = process.argv.includes("--start-dev");

let devProcess;
if (startDev) {
  console.log(`[tunnel] starting "next dev" on port ${port}…`);
  devProcess = spawn(
    process.platform === "win32" ? "npm.cmd" : "npm",
    ["run", "dev"],
    { stdio: "inherit", env: { ...process.env, PORT: String(port) } },
  );
  // Give Next a moment to bind the port.
  await new Promise((r) => setTimeout(r, 2500));
}

let ngrok;
try {
  ngrok = await import("@ngrok/ngrok");
} catch (err) {
  console.error(
    "\n[tunnel] Could not load @ngrok/ngrok. Run `npm install` first.\n",
    err instanceof Error ? err.message : err,
  );
  process.exit(1);
}

const listener = await ngrok.forward({
  addr: port,
  authtoken,
  // Optional: pin a reserved domain here, e.g.
  //   domain: "your-reserved-domain.ngrok-free.app"
});

const url = listener.url();
console.log("\n[tunnel] Public URL:");
console.log(`  ${url}  →  http://localhost:${port}\n`);
console.log("[tunnel] Press Ctrl+C to stop.\n");

const shutdown = async () => {
  try {
    await listener.close();
  } catch {}
  if (devProcess && !devProcess.killed) devProcess.kill("SIGINT");
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

// Keep the process alive while the tunnel is open.
await new Promise(() => {});

// ---------------------------------------------------------------------------
// Minimal .env reader — we don't want a hard dotenv runtime dep.
// ---------------------------------------------------------------------------
function loadDotEnv(path) {
  if (!existsSync(path)) return;
  const content = readFileSync(path, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}
