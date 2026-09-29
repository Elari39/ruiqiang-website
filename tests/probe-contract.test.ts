import { describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { readProbeRun, REPORT_NAMES, sourceFingerprint, validateReport } from "../scripts/probe-contract.mjs";

const run = { runId: "new-run", buildId: "build-1", sourceHash: "source-1", base: "http://127.0.0.1:3311", startedAt: new Date(Date.now() - 5000).toISOString() };
const report = () => ({ ...run, generatedAt: new Date().toISOString(), results: [{ pass: true }] });

describe("报告必须来自本次源码、构建和运行", () => {
  it("接受本轮完整报告", () => {
    const fresh = report();
    expect(validateReport(fresh, run)).toEqual(fresh);
  });
  it.each(["runId", "buildId", "sourceHash", "base"])("拒绝不匹配的 %s", (key) => {
    expect(() => validateReport({ ...report(), [key]: "old" }, run)).toThrow();
    expect(() => validateReport({ ...report(), [key]: undefined }, run)).toThrow();
  });
  it.each(["invalid", "2000-01-01T00:00:00Z", "2099-01-01T00:00:00Z"])("拒绝无效或过期时间 %s", generatedAt => {
    expect(() => validateReport({ ...report(), generatedAt }, run)).toThrow();
  });
  it("拒绝空报告和旧版无身份报告", () => {
    expect(() => validateReport({ ...report(), results: [] }, run)).toThrow();
    expect(() => validateReport({ results: [{ pass: true }] }, run)).toThrow();
  });
  it("源码变化、重新构建或缺少运行记录时拒绝验收", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "rq-probe-contract-"));
    try {
      fs.mkdirSync(path.join(root, ".next"));
      fs.mkdirSync(path.join(root, "app"));
      fs.writeFileSync(path.join(root, "app/page.tsx"), "original");
      fs.writeFileSync(path.join(root, ".next/BUILD_ID"), run.buildId);
      expect(() => readProbeRun(root)).toThrow();
      fs.writeFileSync(path.join(root, ".next/probe-run.json"), JSON.stringify({ ...run, sourceHash: sourceFingerprint(root) }));
      expect(readProbeRun(root).runId).toBe(run.runId);
      fs.writeFileSync(path.join(root, ".next/BUILD_ID"), "new-build");
      expect(() => readProbeRun(root)).toThrow();
      fs.writeFileSync(path.join(root, ".next/BUILD_ID"), run.buildId);
      fs.writeFileSync(path.join(root, "app/page.tsx"), "changed");
      expect(() => readProbeRun(root)).toThrow();
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
  });
});

describe("当前构建的全部浏览器报告", () => {
  it.each(REPORT_NAMES)("%s 身份匹配且结果非空", name => {
    const data = JSON.parse(fs.readFileSync(path.join("tests/probe-out", name), "utf8"));
    expect(() => validateReport(data, readProbeRun())).not.toThrow();
  });
  it("新回归报告包含三档五页命中检测和跨断点检测，全部通过", () => {
    const data = JSON.parse(fs.readFileSync("tests/probe-out/regression-probe.json", "utf8"));
    validateReport(data, readProbeRun());
    expect(data.results).toHaveLength(16);
    expect(data.results.every((r: { pass: boolean }) => r.pass === true)).toBe(true);
    for (const width of [375, 390, 767]) {
      for (const route of ["/", "/services", "/gallery", "/about", "/contact"]) {
        expect(data.results.some((r: { name: string }) => r.name === `致电入口命中 ${width} ${route}`)).toBe(true);
      }
    }
    expect(data.results.some((r: { name: string }) => r.name === "菜单跨断点后关闭并恢复滚动")).toBe(true);
  });
  it("Netlify 发布入口强制执行完整验收", () => {
    const config = fs.readFileSync("netlify.toml", "utf8");
    expect(config).toMatch(/command\s*=\s*"[^"]*npm run verify"/);
    const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
    expect(pkg.scripts.verify).toBe("npm run lint && npm run test:probes");
  });
});
