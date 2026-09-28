/**
 * A5 验收测试：响应式与交互态
 *
 * 本测试**不重新启动浏览器**（那属于 scripts/check-*.mjs 的职责），
 * 而是读取那两个脚本产出的探测报告，把结果转成断言。
 *
 * 这样分层的理由：
 *   - 浏览器探测慢且有环境依赖（要 Chrome、要服务在跑），不适合塞进单测；
 *   - 但"探测结果"本身必须被断言，否则报告只是躺在那里的 JSON，
 *     回归时没人会发现数值变坏了。
 *
 * 若报告不存在，本套件会**失败并提示先跑脚本**，而不是静默跳过 ——
 * 静默跳过就等于把 A5 的验收悄悄取消了。
 */
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const PROBE_DIR = path.join(ROOT, "tests", "probe-out");
const RESPONSIVE = path.join(PROBE_DIR, "responsive-probe.json");
const INTERACTION = path.join(PROBE_DIR, "interaction-probe.json");

/** 三档宽度（PRD §5.3） */
const VIEWPORTS = ["375", "768", "1440"];
/** 五个页面（PRD §4） */
const ROUTES = ["/", "/services", "/gallery", "/about", "/contact"];

function loadJson(p: string, hint: string) {
  if (!fs.existsSync(p)) {
    throw new Error(
      `缺少探测报告 ${path.relative(ROOT, p)}。请先运行：\n` +
        `  1) npm run build && npm start\n` +
        `  2) ${hint}\n` +
        `没有报告时本套件必须失败，不能跳过。`
    );
  }
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

describe("三档宽度无横向滚动（PRD §5.3 / §7.3）", () => {
  const data = () => loadJson(RESPONSIVE, "node scripts/check-responsive.mjs http://localhost:3000");

  it("报告覆盖 3 档 × 5 页 = 15 个组合", () => {
    const { results } = data();
    expect(results.length).toBe(15);
    for (const vp of VIEWPORTS) {
      for (const route of ROUTES) {
        const found = results.find((r) => r.viewport === vp && r.route === route);
        expect(found, `缺少 ${vp} ${route} 的记录`).toBeTruthy();
      }
    }
  });

  it("每档每页 scrollWidth 都不超过 innerWidth（差 1px 也算失败）", () => {
    const { results } = data();
    const bad: string[] = [];
    for (const r of results) {
      const { sw, iw } = r.probe;
      if (sw > iw) bad.push(`${r.viewport} ${r.route}: sw=${sw} > iw=${iw}`);
    }
    expect(bad).toEqual([]);
  });

  it("没有任何元素超出视口边界", () => {
    const { results } = data();
    const bad: string[] = [];
    for (const r of results) {
      if (r.probe.overflowingCount > 0) {
        const first = r.probe.overflowing[0];
        bad.push(
          `${r.viewport} ${r.route}: ${r.probe.overflowingCount} 个元素溢出，` +
            `首个 <${first.tag} right=${first.right}>`
        );
      }
    }
    expect(bad).toEqual([]);
  });

  it("没有非 sr-only 元素被容器裁切", () => {
    const { results } = data();
    const bad: string[] = [];
    for (const r of results) {
      if (r.probe.clippedCount > 0) {
        const first = r.probe.clipped[0];
        bad.push(
          `${r.viewport} ${r.route}: <${first.tag}> scrollW=${first.scrollW} clientW=${first.clientW}`
        );
      }
    }
    expect(bad).toEqual([]);
  });

  it("15 张截图全部生成且非空", () => {
    const { results } = data();
    const bad: string[] = [];
    for (const r of results) {
      const p = path.join(ROOT, r.screenshot);
      if (!fs.existsSync(p)) bad.push(`缺失 ${r.screenshot}`);
      else if (fs.statSync(p).size < 10_000) {
        bad.push(`${r.screenshot} 仅 ${fs.statSync(p).size} 字节，疑似空白`);
      }
    }
    expect(bad).toEqual([]);
  });

  it("手机端（375/768）有固定悬浮条，桌面端（1440）没有", () => {
    const { results } = data();
    for (const r of results) {
      const bars = r.probe.fixedBottom?.length ?? 0;
      if (r.viewport === "1440") {
        expect(bars, `1440 ${r.route} 不应有悬浮条`).toBe(0);
      } else {
        // 375 一定有；768 也已收进（悬浮条 md:hidden）
        if (r.viewport === "375") {
          expect(bars, `375 ${r.route} 应有悬浮条`).toBeGreaterThan(0);
        }
      }
    }
  });
});

describe("交互态验证（弹层 / 汉堡菜单 / 悬浮条遮挡）", () => {
  const data = () => loadJson(INTERACTION, "node scripts/check-interactions.mjs http://localhost:3000");

  it("全部交互项通过", () => {
    const { results } = data();
    const failed = results.filter((r) => !r.pass);
    expect(
      failed.map((f) => `${f.name}（${f.detail}）`),
      "交互验证存在失败项"
    ).toEqual([]);
  });

  it("覆盖了弹层、汉堡菜单、悬浮条三类交互", () => {
    const { results } = data();
    const names = results.map((r) => r.name).join(" | ");
    expect(names).toMatch(/弹层/);
    expect(names).toMatch(/汉堡菜单/);
    expect(names).toMatch(/悬浮条/);
  });

  it("悬浮条不遮挡页脚文字（三档中最易失守的真实缺陷）", () => {
    const { results } = data();
    const checks = results.filter((r) => r.name.startsWith("悬浮条不遮挡页脚文字"));
    expect(checks.length).toBe(5);
    for (const c of checks) {
      expect(c.pass, `${c.name}: ${c.detail}`).toBe(true);
      // 详情里应能读出真实的数字，而不是空话
      expect(c.detail).toMatch(/底边=\d+/);
      expect(c.detail).toMatch(/顶边=\d+/);
    }
  });

  it("焦点管理：弹层与汉堡菜单关闭后都回到触发元素", () => {
    const { results } = data();
    const focusChecks = results.filter((r) => /焦点回到触发/.test(r.name));
    expect(focusChecks.length).toBeGreaterThanOrEqual(2);
    for (const c of focusChecks) {
      expect(c.pass, `${c.name}: ${c.detail}`).toBe(true);
    }
  });
});
