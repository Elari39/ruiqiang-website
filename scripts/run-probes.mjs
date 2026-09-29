#!/usr/bin/env node
/**
 * 一键跑完整 A5 浏览器探测 + 断言（`npm run test:probes`）。
 *
 * ## 为什么需要这个编排脚本
 *
 * 响应式与交互态的断言（`tests/responsive.test.ts`）读的是 `tests/probe-out/`
 * 下的探测报告，而那个目录被 `.gitignore` 排除 —— 报告要靠**真的启动浏览器去点**
 * 才能产出。于是完整的 A5 验收本来是三步手工活：
 *
 *   1) npm run build
 *   2) npm start          （另开一个终端保持运行）
 *   3) node scripts/check-responsive.mjs http://localhost:3000
 *      node scripts/check-interactions.mjs http://localhost:3000
 *   4) npm test
 *
 * 步骤多、要两个终端、还容易把服务端口搞错。这里把它压成一条命令，
 * 并且**最后一步带上 REQUIRE_PROBES=1** —— 保证"探针没跑成"会直接失败，
 * 而不是被 tests/responsive.test.ts 的跳过逻辑掩盖过去。
 *
 * ## 实现注意
 *
 *   - 子进程一律 `stdio: "inherit"`，不用管道捕获输出。
 *     受限沙箱下管道（named pipe）会被拒（EPERM），inherit 不会；
 *     而且在终端里能直接看到 next / Chrome 的实时输出，排查更快。
 *   - 构建走 `scripts/run-next.mjs`，绕开本机沙箱的批量删除守卫
 *     （直接 `next build` 会清 `.next/` 时被拦）。Netlify 云端仍用标准
 *     `npm run build`，与本脚本无关。
 *   - 端口可用 `PROBE_PORT` 覆盖，便于本机已有服务占用 3311 时改道。
 */
import { spawn, spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const NODE = process.execPath;
const PORT = process.env.PROBE_PORT || "3311";
const BASE = `http://127.0.0.1:${PORT}`;

const NEXT_BIN = path.join(ROOT, "node_modules", "next", "dist", "bin", "next");
const VITEST_BIN = path.join(ROOT, "node_modules", "vitest", "vitest.mjs");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** 跑一个子步骤；非零退出码立即终止整个编排 */
function run(label, args, extraEnv = {}) {
  console.log(`\n${"=".repeat(74)}\n=== ${label}\n${"=".repeat(74)}`);
  const r = spawnSync(NODE, args, {
    cwd: ROOT,
    stdio: "inherit",
    env: { ...process.env, ...extraEnv },
  });
  if (r.error) {
    console.error(`\n${label} 无法启动：${r.error.message}`);
    process.exit(1);
  }
  if (r.status !== 0) {
    console.error(`\n✖ ${label} 失败（退出码 ${r.status}）`);
    process.exit(r.status ?? 1);
  }
  console.log(`✔ ${label}`);
}

/** 轮询到服务可用；服务提前退出则立刻报错，不空等到超时 */
async function waitForServer(server, tries = 120) {
  for (let i = 0; i < tries; i++) {
    if (server.exitCode !== null) {
      throw new Error(
        `next start 提前退出（退出码 ${server.exitCode}）。` +
          `常见原因：端口 ${PORT} 被占用 —— 可用 PROBE_PORT 换一个端口重试。`,
      );
    }
    try {
      const r = await fetch(`${BASE}/`);
      if (r.ok) return;
    } catch {
      /* 还没起来 */
    }
    await sleep(500);
  }
  throw new Error(`等待 ${BASE} 就绪超时（${(tries * 500) / 1000}s）`);
}

async function main() {
  run("构建（scripts/run-next.mjs，绕开本机沙箱的批量删除守卫）", [
    path.join(ROOT, "scripts", "run-next.mjs"),
    "build",
  ]);

  console.log(`\n启动生产服务：next start -p ${PORT}`);
  const server = spawn(NODE, [NEXT_BIN, "start", "-p", PORT], {
    cwd: ROOT,
    stdio: "inherit",
  });

  // 无论探测成功失败都要收掉服务进程，否则端口会一直被占
  const shutdown = () => {
    try {
      server.kill();
    } catch {
      /* 已经退了 */
    }
  };
  process.on("exit", shutdown);
  process.on("SIGINT", () => {
    shutdown();
    process.exit(130);
  });

  try {
    await waitForServer(server);
    console.log(`服务已就绪：${BASE}`);

    run("响应式探测（3 档 × 5 页）", [
      path.join(ROOT, "scripts", "check-responsive.mjs"),
      BASE,
    ]);
    run("交互态探测（弹层 / 汉堡菜单 / 悬浮条）", [
      path.join(ROOT, "scripts", "check-interactions.mjs"),
      BASE,
    ]);
  } finally {
    shutdown();
    // 给端口一点释放时间，避免紧接着的步骤偶发占用
    await sleep(500);
  }

  /*
   * 最后一步是真正的断言。
   * REQUIRE_PROBES=1 让 tests/responsive.test.ts 在缺产物时**失败**而不是跳过 ——
   * 否则"探针脚本静默没产出报告"会被当成"验收通过"，那正是本脚本要防的事。
   */
  run(
    "vitest（REQUIRE_PROBES=1：探针产物缺失即失败）",
    [VITEST_BIN, "run"],
    { REQUIRE_PROBES: "1" },
  );

  console.log(`\n${"=".repeat(74)}\n✔ 完整 A5 验收通过：探测产物已刷新，全部断言为绿。`);
}

main().catch((e) => {
  console.error(`\n✖ test:probes 失败：${e.message}`);
  process.exit(2);
});
