/**
 * A5 · 三档响应式验证（截图 + 真实布局数值）
 *
 * 关键设计：**不靠看图判断是否溢出**。
 *   截图只能证明"某一张图里我肉眼没看出问题"，无法证明 `scrollWidth <= innerWidth`。
 *   因此这里启动一个 headless Chrome 并连它的 DevTools 协议（CDP），
 *   直接在页面里跑脚本读布局数值，把判据变成可断言的数字。
 *
 * 为什么手写 CDP 客户端而不是装 Playwright：
 *   本机没有 Playwright 的浏览器缓存，装它要下载上百 MB 运行时；
 *   而 CDP 就是 WebSocket 上加几行 JSON，本机已有 Chrome 与 node 内置 WebSocket 客户端。
 *
 * 用法：node scripts/check-responsive.mjs <baseUrl>
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import net from "node:net";
import { findChrome } from "./chrome-path.mjs";
import { probeMetadata } from "./probe-contract.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SHOT_DIR = path.join(ROOT, "_shot");
const PROBE_DIR = path.join(ROOT, "tests", "probe-out");
// 不再硬编码路径：按 CHROME_PATH → 常见安装位置 → PATH 查找（见 chrome-path.mjs）
const CHROME = findChrome();

const VIEWPORTS = [
  { name: "375", width: 375, height: 2600 },
  { name: "768", width: 768, height: 2600 },
  { name: "1440", width: 1440, height: 2600 },
];

const PAGES = [
  { route: "/", slug: "home" },
  { route: "/services", slug: "services" },
  { route: "/gallery", slug: "gallery" },
  { route: "/about", slug: "about" },
  { route: "/contact", slug: "contact" },
];

const BASE = process.argv[2] || "http://localhost:3000";
const PORT = 9333;

/** 在页面上下文中执行，返回真实布局数值 */
const PROBE_JS = `(() => {
  const de = document.documentElement;
  const iw = window.innerWidth;
  const overflowing = [];
  for (const el of document.querySelectorAll("body *")) {
    if (el.classList.contains("sr-only")) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    if (r.right > iw + 1 || r.left < -1) {
      overflowing.push({
        tag: el.tagName.toLowerCase(),
        cls: (typeof el.className === "string" ? el.className : "").slice(0, 100),
        left: Math.round(r.left),
        right: Math.round(r.right),
        text: (el.textContent || "").trim().slice(0, 36),
      });
    }
  }
  const clipped = [];
  for (const el of document.querySelectorAll("body *")) {
    // sr-only 元素本身就是 1px 宽的无障碍隐藏节点，
    // scrollWidth 必然远大于 clientWidth —— 这是**设计如此**，不是溢出缺陷。
    if (el.classList.contains("sr-only")) continue;
    const cs = getComputedStyle(el);
    if (cs.overflowX === "visible") continue;
    if (el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1) {
      clipped.push({
        tag: el.tagName.toLowerCase(),
        cls: (typeof el.className === "string" ? el.className : "").slice(0, 100),
        scrollW: el.scrollWidth, clientW: el.clientWidth,
        text: (el.textContent || "").trim().slice(0, 36),
      });
    }
  }
  // 固定底部的悬浮致电条
  const fixedBottom = [];
  for (const el of document.querySelectorAll("body *")) {
    const cs = getComputedStyle(el);
    if (cs.position === "fixed" && cs.bottom === "0px" && el.offsetHeight > 0) {
      fixedBottom.push({ tag: el.tagName.toLowerCase(), h: el.offsetHeight, display: cs.display });
    }
  }
  // 页脚是否被悬浮条遮住：比较页脚底边与悬浮条顶边
  let footerOverlap = null;
  const footer = document.querySelector("footer");
  const bar = [...document.querySelectorAll("body *")].find((el) => {
    const cs = getComputedStyle(el);
    return cs.position === "fixed" && cs.bottom === "0px";
  });
  if (footer && bar) {
    const fr = footer.getBoundingClientRect();
    const br = bar.getBoundingClientRect();
    footerOverlap = { footerBottom: Math.round(fr.bottom), barTop: Math.round(br.top) };
  }
  return {
    route: location.pathname, iw, sw: de.scrollWidth, bodySw: document.body.scrollWidth,
    hasHorizontalScroll: de.scrollWidth > iw,
    overflowing: overflowing.slice(0, 20), overflowingCount: overflowing.length,
    clipped: clipped.slice(0, 20), clippedCount: clipped.length,
    fixedBottom, footerOverlap,
    docHeight: de.scrollHeight,
    title: document.title,
  };
})()`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForPort(port, tries = 60) {
  for (let i = 0; i < tries; i++) {
    const ok = await new Promise((resolve) => {
      const s = net.connect({ port, host: "127.0.0.1" });
      s.on("connect", () => { s.destroy(); resolve(true); });
      s.on("error", () => resolve(false));
      setTimeout(() => { s.destroy(); resolve(false); }, 400);
    });
    if (ok) return true;
    await sleep(250);
  }
  return false;
}

/** 极简 CDP 客户端 */
class CDP {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 0;
    this.pending = new Map();
    this.ready = new Promise((resolve, reject) => {
      this.ws.addEventListener("open", () => resolve());
      this.ws.addEventListener("error", (e) => reject(new Error("ws error " + e.message)));
    });
    this.ws.addEventListener("message", (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(JSON.stringify(msg.error)));
        else resolve(msg.result);
      }
    });
  }
  send(method, params = {}) {
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error(`CDP timeout: ${method}`));
        }
      }, 30000);
    });
  }
  close() { try { this.ws.close(); } catch {} }
}

async function fetchJson(url, tries = 40) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url);
      if (r.ok) return await r.json();
    } catch {}
    await sleep(250);
  }
  throw new Error("DevTools endpoint not reachable: " + url);
}

async function main() {
  fs.mkdirSync(SHOT_DIR, { recursive: true });
  fs.mkdirSync(PROBE_DIR, { recursive: true });

  // 用独立 user-data-dir，避免污染日常 Chrome 配置；
  // 目录放系统临时区，不放进仓库（也不去递归删它，交给系统回收）
  const profile = path.join(
    process.env.TEMP || process.env.TMP || "/tmp",
    "rq-chrome-profile-" + Date.now()
  );

  const chrome = spawn(
    CHROME,
    [
      "--headless=new",
      "--disable-gpu",
      "--no-proxy-server",
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-extensions",
      "--hide-scrollbars",
      "--force-device-scale-factor=1",
      `--remote-debugging-port=${PORT}`,
      `--user-data-dir=${profile}`,
      "about:blank",
    ],
    { stdio: "ignore" }
  );

  let report = [];
  try {
    const up = await waitForPort(PORT);
    if (!up) throw new Error("Chrome 调试端口未就绪（可能是本机代理或安全软件拦截）");
    const ver = await fetchJson(`http://127.0.0.1:${PORT}/json/version`);
    console.log(`Chrome: ${ver["Browser"]}`);

    const targets = await fetchJson(`http://127.0.0.1:${PORT}/json/list`);
    const pageTarget = targets.find((t) => t.type === "page");
    if (!pageTarget) throw new Error("找不到 page target");

    const cdp = new CDP(pageTarget.webSocketDebuggerUrl);
    await cdp.ready;
    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");

    for (const vp of VIEWPORTS) {
      await cdp.send("Emulation.setDeviceMetricsOverride", {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: 1,
        mobile: vp.width < 768,
      });

      for (const page of PAGES) {
        const url = `${BASE}${page.route}`;
        await cdp.send("Page.navigate", { url });
        // 等 load + 字体/图片落位
        await sleep(1400);

        const res = await cdp.send("Runtime.evaluate", {
          expression: PROBE_JS,
          returnByValue: true,
          awaitPromise: false,
        });
        const probe = res.result?.value ?? { error: "no value" };

        // 截图
        const shot = path.join(SHOT_DIR, `${vp.name}-${page.slug}.png`);
        const shotRes = await cdp.send("Page.captureScreenshot", {
          format: "png",
          captureBeyondViewport: true,
        });
        fs.writeFileSync(shot, Buffer.from(shotRes.data, "base64"));

        report.push({
          viewport: vp.name,
          viewportWidth: vp.width,
          route: page.route,
          screenshot: path.relative(ROOT, shot).replace(/\\/g, "/"),
          screenshotBytes: fs.statSync(shot).size,
          probe,
        });

        const flag = probe.hasHorizontalScroll ? "  <-- 横向溢出!" : "";
        console.log(
          `[${vp.name}] ${page.route.padEnd(10)} sw=${probe.sw} iw=${probe.iw} ` +
            `overflow=${probe.overflowingCount} clipped=${probe.clippedCount}${flag}`
        );
      }
    }

    cdp.close();
  } finally {
    try { chrome.kill(); } catch {}
  }

  const out = path.join(PROBE_DIR, "responsive-probe.json");
  fs.writeFileSync(out, JSON.stringify({ ...probeMetadata(BASE), results: report }, null, 2), "utf8");

  const failures = report.filter(
    (r) => r.probe?.hasHorizontalScroll || r.probe?.overflowingCount > 0
  );
  console.log(`\n共 ${report.length} 条记录，写入 ${path.relative(ROOT, out)}`);
  if (failures.length) {
    console.log(`\n[FAIL] ${failures.length} 条存在横向溢出：`);
    for (const f of failures) {
      console.log(`  ${f.viewport} ${f.route}: sw=${f.probe.sw} > iw=${f.probe.iw}`);
      for (const o of f.probe.overflowing.slice(0, 5)) {
        console.log(`     <${o.tag} class="${o.cls}"> right=${o.right} 「${o.text}」`);
      }
    }
    process.exit(1);
  }
  console.log("三档 × 5 页全部无横向溢出。");
}

main().catch((e) => {
  console.error("响应式验证失败:", e);
  process.exit(2);
});
