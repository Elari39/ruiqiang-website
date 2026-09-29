import { spawn, spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { sourceFingerprint } from "./probe-contract.mjs";

const root = process.cwd();
const port = process.env.PROBE_PORT || "3311";
const base = `http://127.0.0.1:${port}`;
const next = path.join(root, "node_modules/next/dist/bin/next");
function run(args, env = {}) {
  const result = spawnSync(process.execPath, args, {
    cwd: root, stdio: "inherit", env: { ...process.env, ...env },
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${args.join(" ")} 失败：${result.status}`);
}

let server;
try {
  // Standard build: no environment guard bypass and no stale build reuse.
  run([next, "build"]);
  run(["node_modules/typescript/bin/tsc", "--noEmit"]);
  const context = {
    runId: randomUUID(),
    buildId: fs.readFileSync(".next/BUILD_ID", "utf8").trim(),
    sourceHash: sourceFingerprint(), base, startedAt: new Date().toISOString(),
  };
  fs.writeFileSync(".next/probe-run.json", JSON.stringify(context));
  server = spawn(process.execPath, [next, "start", "-p", port, "-H", "127.0.0.1"], { stdio: "inherit" });
  let started = false;
  server.on("error", (error) => { console.error(error); });
  for (let attempt = 0; attempt < 120; attempt++) {
    await new Promise(resolve => setTimeout(resolve, 500));
    if (server.exitCode !== null) throw new Error("生产服务提前退出（检查端口占用）");
    try {
      const response = await fetch(base, { signal: AbortSignal.timeout(2000) });
      if (response.ok) { started = true; break; }
    } catch { /* startup retry */ }
  }
  if (!started) throw new Error("生产服务启动超时");
  const env = { PROBE_RUN_ID: context.runId, REQUIRE_PROBES: "1" };
  for (const script of ["check-responsive", "check-interactions", "check-regressions"]) {
    run([`scripts/${script}.mjs`, base], env);
  }
  run(["node_modules/vitest/vitest.mjs", "run"], env);
  console.log("完整验收通过：本次构建、三份新报告及全部断言一致。");
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  server?.kill();
}
