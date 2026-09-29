/**
 * README「线上实拍」图生成器
 *
 * 产出 `docs/screenshots/` 下 3 张成品图（入库，README 直接引用）：
 *
 *   desktop-home.png  1440×900 桌面首屏 + 浏览器窗口外框
 *   mobile-home.png    390×844 手机首屏 + 浏览器窗口外框
 *   pages-grid.png    4 个内页（服务项目 / 工程实拍 / 关于我们 / 联系我们）
 *
 * ## 为什么不是"随便截个图"
 *
 * 1. **内容是真的。** 走 CDP 驱动本机 headless Chrome，**实际访问线上域名**
 *    逐页导航、等字体与图片就绪后再拍，不是画出来的示意图。
 * 2. **地址栏是真的。** 外框里的域名来自 `SITE_URL`，与站点
 *    `lib/site.ts` 的 `PRODUCTION_SITE_URL` 同源，换域名只改一处。
 * 3. **外框是合成的，README 里写明。** headless 截图拿不到浏览器自身的
 *    标签栏/地址栏（CDP 只能截页面内容），所以窗口边框与地址栏由本脚本
 *    按站点设计令牌（`--border: #000` / `--radius: 0` / 硬偏移阴影）用
 *    HTML 渲染合成。README 的图注里如实标注，不含糊。
 *
 * ## 尺寸与清晰度
 *
 * 原图按 DPR 2 抓（1440 视口 → 2880px 宽），合成页按 DPR 1 渲染成品。
 * 这样成品 PNG 保持在 README 友好的几百 KB 量级，同时页面文字在
 * 缩放到 GitHub 正文宽度后依然锐利。
 *
 * 用法：
 *   node scripts/capture-readme-shots.mjs
 *   SITE_URL=http://localhost:3000 node scripts/capture-readme-shots.mjs
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import net from "node:net";
import { findChrome } from "./chrome-path.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = path.join(ROOT, "docs", "screenshots");
const SITE = (process.env.SITE_URL || "https://ruiqiang-jianzhu.netlify.app").replace(/\/+$/, "");
const HOST = new URL(SITE).host;
const PORT = 9345;
const CHROME = findChrome();

/** 站点设计令牌（app/globals.css）——外框与站点同一套语言，不另起炉灶 */
const T = {
  border: "#000",
  card: "#fff",
  primary: "#ffdc58",
  mutedFg: "#6b6355",
  red: "#e63946",
  orange: "#ffb066",
  green: "#9be89b",
};

/** 待抓的原始页面（DPR 2，只抓首屏；README 不需要整页长图） */
const RAW = [
  { name: "home-1440", route: "/", width: 1440, height: 900, mobile: false },
  { name: "home-390", route: "/", width: 390, height: 844, mobile: true },
  { name: "services-1440", route: "/services", width: 1440, height: 900, mobile: false },
  { name: "gallery-1440", route: "/gallery", width: 1440, height: 900, mobile: false },
  { name: "about-1440", route: "/about", width: 1440, height: 900, mobile: false },
  { name: "contact-1440", route: "/contact", width: 1440, height: 900, mobile: false },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** 等字体与图片就绪：CDP 的 load 事件早于 next/font 换字与图集解码 */
const READY_JS = `(async () => {
  const wait = (i) => i.complete ? null : new Promise((r) => {
    i.addEventListener("load", r, { once: true });
    i.addEventListener("error", r, { once: true });
  });
  try { await document.fonts.ready; } catch {}
  await Promise.all([...document.images].map(wait));
  window.scrollTo(0, 0);
  const s = document.createElement("style");
  s.textContent = "*,*::before,*::after{transition:none!important;animation:none!important;caret-color:transparent!important}";
  document.head.appendChild(s);
  return { ready: document.readyState, fonts: document.fonts.status, images: document.images.length, title: document.title };
})()`;

/** 极简 CDP 客户端（与 scripts/check-responsive.mjs 同款：不引入 Playwright） */
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

// ---------------------------------------------------------------------------
// 合成层：浏览器窗口外框
// ---------------------------------------------------------------------------

const PAGE_CSS = `
html,body{margin:0;padding:0;background:transparent}
.win{background:${T.card};border:0 solid ${T.border};box-sizing:content-box;overflow:hidden}
.bar{display:flex;align-items:center;background:${T.primary};border:0 solid ${T.border};box-sizing:content-box}
.dots{display:flex;flex:0 0 auto}
.dots i{display:block;box-sizing:border-box;border:2px solid ${T.border}}
.url{flex:1 1 auto;display:flex;align-items:center;box-sizing:border-box;overflow:hidden;
     white-space:nowrap;background:${T.card};border-style:solid;border-color:${T.border};color:${T.border};
     font-family:"Segoe UI",-apple-system,system-ui,"Helvetica Neue",Arial,sans-serif;line-height:1}
.url b{font-weight:700;letter-spacing:.1px}
.url .p{color:${T.mutedFg}}
.url svg{flex:0 0 auto}
`;

/** 锁形图标：地址栏里那一小枚，纯 SVG，不依赖外部资源 */
function lockIcon(size, stroke) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none"
    stroke="${T.border}" stroke-width="${stroke}" stroke-linecap="round">
    <rect x="5" y="10.6" width="14" height="9.4" rx="1.2"/>
    <path d="M8.4 10.6V7.8a3.6 3.6 0 0 1 7.2 0v2.8"/></svg>`;
}

/**
 * 一个窗口外框。contentW/contentH 是**截图的显示尺寸**，
 * 外框尺寸由 border/barH 推出，调用方据此算版面。
 */
function browserWindow({ src, route, contentW, contentH, barH, border, shadow, dot, font, radius = 0 }) {
  const pathPart = route === "/" ? "/" : route;
  const pillH = Math.round(barH * 0.6);
  const pillBorder = Math.max(2, Math.round(border * 0.66));
  return `<div class="win" style="width:${contentW}px;border-width:${border}px;border-radius:${radius}px;
      box-shadow:${shadow}px ${shadow}px 0 0 ${T.border}">
    <div class="bar" style="height:${barH}px;border-bottom-width:${border}px;padding:0 ${Math.round(barH * 0.3)}px">
      <span class="dots" style="gap:${Math.round(dot * 0.55)}px">
        <i style="width:${dot}px;height:${dot}px;border-radius:${Math.max(2, Math.round(dot / 2))}px;background:${T.red}"></i>
        <i style="width:${dot}px;height:${dot}px;border-radius:${Math.max(2, Math.round(dot / 2))}px;background:${T.orange}"></i>
        <i style="width:${dot}px;height:${dot}px;border-radius:${Math.max(2, Math.round(dot / 2))}px;background:${T.green}"></i>
      </span>
      <span class="url" style="height:${pillH}px;border-width:${pillBorder}px;border-radius:0;
            font-size:${font}px;padding:0 ${Math.round(font * 0.75)}px;gap:${Math.round(font * 0.45)}px">
        ${lockIcon(Math.round(font * 1.05), Math.max(2, Math.round(font / 6.5)))}
        <b>${HOST}</b><span class="p">${pathPart}</span>
      </span>
    </div>
    <img src="data:image/png;base64,${src}" width="${contentW}" height="${contentH}" alt="">
  </div>`;
}

/** 单窗口成品页：totalW/totalH 由调用方按 contentW/H + 外框算出 */
function singlePage({ body, width, height }) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>${PAGE_CSS}
    body{width:${width}px;height:${height}px;overflow:hidden}
  </style></head><body>${body}</body></html>`;
}

/** 2×2 内页网格成品页 */
function gridPage({ body, width, height, gapX, gapY }) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>${PAGE_CSS}
    body{width:${width}px;height:${height}px;overflow:hidden}
    .grid{display:grid;grid-template-columns:repeat(2,max-content);gap:${gapY}px ${gapX}px}
  </style></head><body><div class="grid">${body}</div></body></html>`;
}

/** 渲染一段合成用 HTML 并截图（透明背景，便于在 GitHub 明/暗主题下都好看） */
async function renderComposite(cdp, tmpDir, name, html, width, height) {
  const file = path.join(tmpDir, `${name}.html`);
  fs.writeFileSync(file, html, "utf8");
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width, height, deviceScaleFactor: 1, mobile: false,
  });
  await cdp.send("Page.navigate", { url: "file:///" + file.replace(/\\/g, "/") });
  await sleep(600);
  await cdp.send("Runtime.evaluate", { expression: "document.fonts.ready", awaitPromise: true });
  const shot = await cdp.send("Page.captureScreenshot", {
    format: "png", captureBeyondViewport: true, fromSurface: true,
  });
  const out = path.join(OUT_DIR, `${name}.png`);
  fs.writeFileSync(out, Buffer.from(shot.data, "base64"));
  const stat = fs.statSync(out);
  const meta = pngSize(out);
  console.log(
    `  ${name}.png  ${meta.width}×${meta.height}  ${(stat.size / 1024).toFixed(0)} KB`
  );
  return { file: path.relative(ROOT, out).replace(/\\/g, "/"), ...meta, bytes: stat.size };
}

/** 读 PNG 的 IHDR 尺寸（不引第三方库） */
function pngSize(file) {
  const b = fs.readFileSync(file);
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
}

// ---------------------------------------------------------------------------
// 主流程
// ---------------------------------------------------------------------------

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "rq-readme-shots-"));
  const profile = path.join(tmpDir, "chrome-profile");
  console.log(`站点：${SITE}\nChrome：${CHROME}\n临时目录：${tmpDir}\n`);

  const chrome = spawn(
    CHROME,
    [
      "--headless=new",
      "--disable-gpu",
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-extensions",
      "--hide-scrollbars",
      "--font-render-hinting=none",
      "--disable-lcd-text",
      "--force-device-scale-factor=1",
      `--remote-debugging-port=${PORT}`,
      `--user-data-dir=${profile}`,
      "about:blank",
    ],
    { stdio: "ignore" }
  );

  const manifest = { site: SITE, capturedAt: new Date().toISOString(), shots: [] };
  try {
    if (!(await waitForPort(PORT))) throw new Error("Chrome 调试端口未就绪");
    const ver = await fetchJson(`http://127.0.0.1:${PORT}/json/version`);
    console.log(`${ver["Browser"]}\n`);

    const targets = await fetchJson(`http://127.0.0.1:${PORT}/json/list`);
    const pageTarget = targets.find((t) => t.type === "page");
    if (!pageTarget) throw new Error("找不到 page target");

    const cdp = new CDP(pageTarget.webSocketDebuggerUrl);
    await cdp.ready;
    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");
    // 透明底色：外框之外的区域保持透明，明暗主题下都不出现白板
    await cdp.send("Emulation.setDefaultBackgroundColorOverride", {
      color: { r: 0, g: 0, b: 0, a: 0 },
    });

    // --- 1. 抓原始页面（DPR 2） ------------------------------------------
    console.log("抓取线上原始页面（DPR 2）：");
    const raw = new Map();
    for (const spec of RAW) {
      await cdp.send("Emulation.setDeviceMetricsOverride", {
        width: spec.width, height: spec.height, deviceScaleFactor: 2, mobile: spec.mobile,
      });
      const url = SITE + spec.route;
      await cdp.send("Page.navigate", { url });
      await sleep(1500);
      const ready = await cdp.send("Runtime.evaluate", {
        expression: READY_JS, awaitPromise: true, returnByValue: true,
      });
      const info = ready.result?.value ?? {};
      if (info.ready !== "complete" || !info.title) {
        throw new Error(`页面未就绪：${url} → ${JSON.stringify(info)}（网络不通或被拦截？）`);
      }
      await sleep(400);
      const shot = await cdp.send("Page.captureScreenshot", { format: "png", fromSurface: true });
      const buf = Buffer.from(shot.data, "base64");
      const file = path.join(tmpDir, `${spec.name}.png`);
      fs.writeFileSync(file, buf);
      const size = pngSize(file);
      raw.set(spec.name, buf.toString("base64"));
      console.log(
        `  [${String(spec.width).padStart(4)}px] ${spec.route.padEnd(10)} ` +
          `${size.width}×${size.height}  ${(buf.length / 1024).toFixed(0)} KB  「${info.title}」`
      );
    }

    // --- 2. 合成成品 ------------------------------------------------------
    console.log("\n合成窗口外框：");
    const D = { border: 3, shadow: 10, pad: 22 };

    // 桌面首屏
    {
      const barH = 46, cw = 1440, ch = 900;
      const body = browserWindow({
        src: raw.get("home-1440"), route: "/", contentW: cw, contentH: ch,
        barH, border: D.border, shadow: D.shadow, dot: 12, font: 14,
      });
      const html = singlePage({ body, width: cw + D.border * 2 + D.pad, height: ch + barH + D.border * 2 + D.pad });
      manifest.shots.push(await renderComposite(cdp, tmpDir, "desktop-home", html, cw + D.border * 2 + D.pad, ch + barH + D.border * 2 + D.pad));
    }

    // 手机首屏
    {
      const barH = 36, cw = 390, ch = 844;
      const body = browserWindow({
        src: raw.get("home-390"), route: "/", contentW: cw, contentH: ch,
        barH, border: D.border, shadow: D.shadow, dot: 9, font: 11,
      });
      const html = singlePage({ body, width: cw + D.border * 2 + D.pad, height: ch + barH + D.border * 2 + D.pad });
      manifest.shots.push(await renderComposite(cdp, tmpDir, "mobile-home", html, cw + D.border * 2 + D.pad, ch + barH + D.border * 2 + D.pad));
    }

    // 4 个内页 2×2 网格
    {
      const barH = 28, cw = 700, ch = Math.round((900 * cw) / 1440);
      const cells = [
        ["services-1440", "/services"],
        ["gallery-1440", "/gallery"],
        ["about-1440", "/about"],
        ["contact-1440", "/contact"],
      ];
      const body = cells
        .map(([key, route]) =>
          browserWindow({
            src: raw.get(key), route, contentW: cw, contentH: ch,
            barH, border: D.border, shadow: 8, dot: 8, font: 11,
          })
        )
        .join("");
      const gapX = 26, gapY = 24;
      const winW = cw + D.border * 2, winH = ch + barH + D.border * 2;
      const width = winW * 2 + gapX + D.pad + 8;
      const height = winH * 2 + gapY + D.pad + 8;
      const html = gridPage({ body, width, height, gapX, gapY });
      manifest.shots.push(await renderComposite(cdp, tmpDir, "pages-grid", html, width, height));
    }

    cdp.close();
  } finally {
    try { chrome.kill(); } catch {}
  }

  fs.writeFileSync(
    path.join(OUT_DIR, "manifest.json"),
    JSON.stringify(manifest, null, 2) + "\n",
    "utf8"
  );
  console.log(`\n完成：${manifest.shots.length} 张写入 docs/screenshots/（含 manifest.json）`);
}

main().catch((e) => {
  console.error("\n生成 README 截图失败：", e.message || e);
  process.exit(2);
});
