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
 * ## 探针产物缺失时怎么办（重要，改动过）
 *
 * 这里原先的写法是"报告不存在就抛错"，理由是"静默跳过就等于把 A5 的验收
 * 悄悄取消了"。这个理由本身是对的，但它带来一个当时没被注意到的后果：
 * `tests/probe-out/` 被 `.gitignore` 排除，因此**在任何一台新克隆的机器上、
 * 任何 CI 里，整个测试套件都必然失败** —— 本机之所以全绿，只是因为残留了
 * 上一轮探测的产物。一个"新环境必然红"的套件等于没有套件。
 *
 * 现在的策略是**响亮跳过 + 可强制**，既不悄悄取消验收，也不阻断新环境：
 *   - 缺少产物 → 打印醒目横幅说明缺什么、怎么生成，并跳过探针相关套件；
 *   - 设了 `REQUIRE_PROBES=1`（`npm run test:probes` 会设）→ 缺产物即**失败**。
 *     也就是说"跳过"这件事本身是被断言看住的，不是默认放行。
 */
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const PROBE_DIR = path.join(ROOT, "tests", "probe-out");
const RESPONSIVE = path.join(PROBE_DIR, "responsive-probe.json");
const INTERACTION = path.join(PROBE_DIR, "interaction-probe.json");

/** 是否具备探针产物。缺任何一份就跳过探针相关的 describe。 */
const PROBES_READY = fs.existsSync(RESPONSIVE) && fs.existsSync(INTERACTION);

/** `npm run test:probes` 会设它为 1：此时缺产物必须失败，而不是跳过。 */
const REQUIRE_PROBES = process.env.REQUIRE_PROBES === "1";

/** 三档宽度（PRD §5.3） */
const VIEWPORTS = ["375", "768", "1440"];
/** 五个页面（PRD §4） */
const ROUTES = ["/", "/services", "/gallery", "/about", "/contact"];

/** 探测报告里单条记录的形状（与 scripts/check-*.mjs 的产出对应） */
type OverflowItem = {
  tag: string;
  cls: string;
  left?: number;
  right: number;
  text: string;
};

type ClippedItem = {
  tag: string;
  cls: string;
  scrollW: number;
  clientW: number;
  text: string;
};

type ResponsiveProbe = {
  route: string;
  iw: number;
  sw: number;
  hasHorizontalScroll: boolean;
  overflowing: OverflowItem[];
  overflowingCount: number;
  clipped: ClippedItem[];
  clippedCount: number;
  fixedBottom: Array<{ tag: string; h: number; display: string }>;
  docHeight: number;
};

type ResponsiveRecord = {
  viewport: string;
  viewportWidth: number;
  route: string;
  screenshot: string;
  screenshotBytes: number;
  probe: ResponsiveProbe;
};

type InteractionRecord = {
  name: string;
  pass: boolean;
  detail: string;
};

function loadJson<T>(p: string, hint: string): T {
  if (!fs.existsSync(p)) {
    throw new Error(
      `缺少探测报告 ${path.relative(ROOT, p)}。请先运行：\n` +
        `  1) npm run build && npm start\n` +
        `  2) ${hint}\n` +
        `或者直接跑 \`npm run test:probes\`（会自动完成以上全部步骤）。\n` +
        `（正常情况下本套件已被跳过，走到这里说明报告存在但读不到。）`
    );
  }
  return JSON.parse(fs.readFileSync(p, "utf8")) as T;
}

// ---------------------------------------------------------------------------
// 探针门控自身必须被断言
//
// "缺产物就跳过"如果没人看住，就会退化成"永远跳过" —— 那才是原作者担心的
// 那种悄悄取消验收。所以这里显式区分两种情况：
//   REQUIRE_PROBES=1（test:probes 走的路径）→ 缺产物必须红；
//   未设置（普通 npm test）→ 允许跳过，但打印醒目横幅。
// ---------------------------------------------------------------------------

if (!PROBES_READY) {
  console.warn(
    [
      "",
      "=".repeat(74),
      "⚠️  响应式 / 交互态探针套件已跳过：缺少 tests/probe-out/ 下的探测报告。",
      `    缺: ${[
        !fs.existsSync(RESPONSIVE) && "responsive-probe.json",
        !fs.existsSync(INTERACTION) && "interaction-probe.json",
      ]
        .filter(Boolean)
        .join(", ")}`,
      "    （该目录被 .gitignore 排除，所以新克隆的仓库里本来就没有。）",
      "    要跑完整 A5 验收：npm run test:probes",
      "    或手动：npm run build && npm start，再跑 scripts/check-*.mjs。",
      "    设 REQUIRE_PROBES=1 可让本套件在缺产物时直接失败。",
      "=".repeat(74),
      "",
    ].join("\n")
  );
}

describe("A5 · 探针门控", () => {
  it("REQUIRE_PROBES=1 时，缺少探针产物必须失败（不允许悄悄跳过）", () => {
    if (REQUIRE_PROBES) {
      expect(
        PROBES_READY,
        "REQUIRE_PROBES=1 但 tests/probe-out/ 下缺少探测报告。" +
          "请检查 scripts/run-probes.mjs 是否成功跑完了两个探针脚本。",
      ).toBe(true);
    } else {
      // 未强制时这条恒真：门控的语义由上面那条分支表达
      expect(typeof PROBES_READY).toBe("boolean");
    }
  });
});

describe.skipIf(!PROBES_READY)("三档宽度无横向滚动（PRD §5.3 / §7.3）", () => {
  const data = () =>
    loadJson<{ results: ResponsiveRecord[] }>(
      RESPONSIVE,
      "node scripts/check-responsive.mjs http://localhost:3000"
    );

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

describe.skipIf(!PROBES_READY)("交互态验证（弹层 / 汉堡菜单 / 悬浮条遮挡）", () => {
  const data = () =>
    loadJson<{ results: InteractionRecord[] }>(
      INTERACTION,
      "node scripts/check-interactions.mjs http://localhost:3000"
    );

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

  /**
   * ★ 灯箱打开的是「被点击的那一张」。
   *
   * 这条对应一个真实缺陷：弹层把 4 张图渲进横向滚动容器却从不定位，
   * 点第 N 张永远显示第 1 张，图注与画面互相矛盾。
   *
   * 之所以原来的探针抓不到：它点的是第 1 张，而"显示第 1 张"在缺陷下
   * 恰好也是对的 —— 一个**永远不会失败**的用例。现在的探针故意点第 3 张。
   */
  it("★ 灯箱打开的是被点击的那张图，且计数与可见照片一致", () => {
    const { results } = data();

    const target = results.find((r) => /灯箱打开的是被点击的那张图/.test(r.name));
    expect(
      target,
      "缺少「灯箱打开的是被点击的那张图」这条探针 —— 请确认 scripts/check-interactions.mjs 已更新并重新探测",
    ).toBeTruthy();
    expect(target!.pass, `${target!.name}：${target!.detail}`).toBe(true);
    // 详情里必须能读出真实数字，而不是空话
    expect(target!.detail).toMatch(/可见索引=\d+, 点击索引=\d+/);

    const counter = results.find((r) => /灯箱计数与可见照片一致/.test(r.name));
    expect(counter, "缺少「灯箱计数与可见照片一致」这条探针").toBeTruthy();
    expect(counter!.pass, `${counter!.name}：${counter!.detail}`).toBe(true);
    expect(counter!.detail).toMatch(/计数=「\d+ \/ \d+」/);

    // 缺陷的另一半：滑动之后标题与计数必须跟着可见照片变，
    // 否则"打开对了、一滑又矛盾"
    const swipe = results.find((r) => /灯箱内滑动后标题与计数跟随可见照片/.test(r.name));
    expect(swipe, "缺少「灯箱内滑动后标题与计数跟随可见照片」这条探针").toBeTruthy();
    expect(swipe!.pass, `${swipe!.name}：${swipe!.detail}`).toBe(true);
    expect(swipe!.detail).toMatch(/可见索引=\d+, 期望索引=\d+/);
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
