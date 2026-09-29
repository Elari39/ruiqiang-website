import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

export const REPORT_NAMES = ["responsive-probe.json", "interaction-probe.json", "regression-probe.json"];

export function sourceFingerprint(root = process.cwd()) {
  const hash = createHash("sha256");
  function visit(relative) {
    const full = path.join(root, relative);
    if (!fs.existsSync(full)) return;
    if (fs.statSync(full).isDirectory()) {
      for (const name of fs.readdirSync(full).sort()) {
        if (name !== "probe-out") visit(`${relative}/${name}`);
      }
    } else {
      hash.update(relative).update("\0").update(fs.readFileSync(full)).update("\0");
    }
  }
  for (const entry of ["app", "components", "lib", "public", "scripts", "tests", "package.json", "package-lock.json", "next.config.ts", "netlify.toml", "tsconfig.json", "vitest.config.mts", "eslint.config.mjs", "postcss.config.mjs"]) visit(entry);
  return hash.digest("hex");
}

export function readProbeRun(root = process.cwd()) {
  const run = JSON.parse(fs.readFileSync(path.join(root, ".next/probe-run.json"), "utf8"));
  const buildId = fs.readFileSync(path.join(root, ".next/BUILD_ID"), "utf8").trim();
  if (run.buildId !== buildId || run.sourceHash !== sourceFingerprint(root)) {
    throw new Error("探针报告不属于当前构建/源码；请运行 npm run test:probes");
  }
  return run;
}

export function probeMetadata(base) {
  // Live reports describe the deployed site, never certify a local build.
  if (!process.env.PROBE_RUN_ID) return { base, mode: "standalone", generatedAt: new Date().toISOString() };
  const run = readProbeRun();
  if (run.runId !== process.env.PROBE_RUN_ID || run.base !== base) throw new Error("探针运行标识或目标地址不匹配");
  return { ...run, generatedAt: new Date().toISOString() };
}

export function validateReport(report, run) {
  for (const key of ["runId", "buildId", "sourceHash", "base"]) {
    if (!run[key] || report[key] !== run[key]) throw new Error(`探针报告 ${key} 不匹配`);
  }
  const generated = Date.parse(report.generatedAt);
  const started = Date.parse(run.startedAt);
  if (!Number.isFinite(started) || !Number.isFinite(generated) || generated < started || generated > Date.now() + 5000) {
    throw new Error("探针报告生成时间无效或早于本次验收");
  }
  if (!Array.isArray(report.results) || !report.results.length) throw new Error("探针结果为空");
  return report;
}
