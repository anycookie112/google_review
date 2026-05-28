#!/usr/bin/env node
/**
 * Start the Next.js dev server and expose it publicly with Tailscale Funnel.
 *
 * Usage:
 *   npm run funnel
 *   npm run funnel -- --port 3000
 *
 * Requirements:
 *   - tailscale CLI installed
 *   - tailscaled running
 *   - `tailscale up` completed at least once
 */
import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import net from "node:net";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

loadDotEnv(resolve(fileURLToPath(import.meta.url), "../../.env.local"));
loadDotEnv(resolve(fileURLToPath(import.meta.url), "../../.env"));

const argPort = readArgValue("--port");
const port = Number(argPort || process.env.PORT || 3000);
if (!Number.isFinite(port) || port <= 0) {
  console.error("[funnel] Invalid port. Use --port <number>.");
  process.exit(1);
}

if (!hasCommand("tailscale")) {
  console.error(
    "\n[funnel] tailscale is not installed.\n" +
      "Install it from https://tailscale.com/download and re-run this command.\n",
  );
  process.exit(1);
}

const status = spawnSync("tailscale", ["status"], {
  stdio: "pipe",
  encoding: "utf8",
});
if (status.status !== 0) {
  console.error(
    "\n[funnel] Tailscale is not connected yet.\n" +
      "Run: tailscale up\n" +
      "Then re-run: npm run funnel\n",
  );
  process.exit(1);
}

let devProcess = null;
const portInUse = await isPortListening(port);
if (portInUse) {
  console.log(
    `[funnel] port ${port} is already in use; reusing existing local server instead of starting next dev.`,
  );
} else {
  console.log(`[funnel] starting \"next dev\" on port ${port}...`);
  devProcess = spawn(
    process.platform === "win32" ? "npm.cmd" : "npm",
    ["run", "dev", "--", "--port", String(port)],
    { stdio: "inherit", env: process.env },
  );

  let devExitedEarly = false;
  devProcess.on("exit", () => {
    devExitedEarly = true;
  });

  // Give Next a moment to bind to the port.
  await new Promise((r) => setTimeout(r, 2500));

  if (devExitedEarly) {
    console.error(
      "\n[funnel] next dev exited before Funnel was enabled.\n" +
        "Check for port conflicts or startup errors, then retry.\n",
    );
    process.exit(1);
  }
}

console.log(`[funnel] enabling Tailscale Funnel on port ${port}...`);
const funnel = spawnSync("tailscale", ["funnel", "--bg", String(port)], {
  stdio: "pipe",
  encoding: "utf8",
  timeout: 15000,
});

if (funnel.error && funnel.error.code === "ETIMEDOUT") {
  console.error(
    "\n[funnel] Timed out while enabling Funnel.\n" +
      "This usually means Tailscale is waiting on admin approval or needs elevated permissions.\n\n" +
      `Try manually:\n  tailscale funnel --bg ${port}\n` +
      `If that says access denied, run:\n  sudo tailscale funnel --bg ${port}\n` +
      "If still denied, enable Funnel/Serve in your Tailscale admin console and retry.\n",
  );
  if (devProcess && !devProcess.killed) devProcess.kill("SIGINT");
  process.exit(1);
}

if (funnel.status !== 0) {
  console.error("\n[funnel] Failed to enable funnel:");
  if (funnel.stderr?.trim()) console.error(funnel.stderr.trim());
  if (funnel.stdout?.trim()) console.error(funnel.stdout.trim());
  if (
    `${funnel.stderr || ""}\n${funnel.stdout || ""}`
      .toLowerCase()
      .includes("serve config denied")
  ) {
    console.error(
      "\n[funnel] Your account cannot modify serve/funnel config right now.\n" +
        "Run one of these:\n" +
        `  tailscale funnel --bg ${port}\n` +
        `  sudo tailscale funnel --bg ${port}\n` +
        "Then complete any admin-console enablement link shown by Tailscale.\n",
    );
  }
  if (devProcess && !devProcess.killed) devProcess.kill("SIGINT");
  process.exit(1);
}

const statusOut = spawnSync("tailscale", ["funnel", "status"], {
  stdio: "pipe",
  encoding: "utf8",
});

console.log("\n[funnel] Funnel is active. Public endpoint:\n");
if (statusOut.stdout?.trim()) {
  console.log(statusOut.stdout.trim());
} else {
  console.log(`  https://<your-tailnet-hostname>.ts.net (forwarding to localhost:${port})`);
}
if (devProcess) {
  console.log("\n[funnel] Press Ctrl+C to stop local dev server.");
} else {
  console.log("\n[funnel] Existing local server is being reused and will keep running.");
}
console.log(`[funnel] To disable funnel later: tailscale funnel off ${port}\n`);

const shutdown = () => {
  if (devProcess && !devProcess.killed) devProcess.kill("SIGINT");
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

if (devProcess) {
  devProcess.on("exit", (code) => {
    process.exit(code ?? 0);
  });
} else {
  await new Promise(() => {});
}

function hasCommand(command) {
  const probe = spawnSync(process.platform === "win32" ? "where" : "which", [command], {
    stdio: "pipe",
  });
  return probe.status === 0;
}

function readArgValue(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : "";
}

function isPortListening(port) {
  return new Promise((resolvePort) => {
    const socket = net.connect({ host: "127.0.0.1", port });
    socket.once("connect", () => {
      socket.destroy();
      resolvePort(true);
    });
    socket.once("error", () => {
      resolvePort(false);
    });
  });
}

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
