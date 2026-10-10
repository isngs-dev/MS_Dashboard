/**
 * Production start: `npm start`.
 *
 * Listens on the PORT environment variable when there is one (Render, Railway, Fly, ... all set it
 * and expect the app to bind it on 0.0.0.0), otherwise on 3107 for local use. Plain `next start -p 3107`
 * ignores PORT, which makes Render report "failed to detect open port".
 */
import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const nextBin = require.resolve("next/dist/bin/next");
const port = process.env.PORT || "3107";

const child = spawn(process.execPath, [nextBin, "start", "-H", "0.0.0.0", "-p", port], { stdio: "inherit" });

// let the platform stop the server cleanly (Render sends SIGTERM on every deploy)
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
child.on("exit", (code, signal) => process.exit(code ?? (signal ? 1 : 0)));
