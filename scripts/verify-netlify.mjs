// Netlify's build user cannot apt install browser libraries. Use the packaged
// headless browser and libraries in a temporary directory; keep the same gate.
import chromium, { inflate, setupLambdaEnvironment } from "@sparticuz/chromium";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

if (process.platform !== "linux") throw new Error("verify:netlify targets Linux; use npm run verify locally");
const packageDir = path.dirname(fileURLToPath(import.meta.resolve("@sparticuz/chromium")));
await inflate(path.resolve(packageDir, "../bin/al2023.tar.br"));
setupLambdaEnvironment(path.join(tmpdir(), "al2023/lib"));
const executable = await chromium.executablePath();
// Keep normal web security. Only process/sandbox flags needed by the isolated
// build container are used; no disable-web-security or insecure-content flags.
const args = ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--no-zygote", "--single-process"];
const result = spawnSync(process.execPath, [process.env.npm_execpath, "run", "verify"], {
  stdio: "inherit",
  env: { ...process.env, CHROME_PATH: executable, PROBE_CHROME_ARGS: JSON.stringify(args) },
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
