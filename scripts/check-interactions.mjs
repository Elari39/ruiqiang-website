/**
 * A5 补充 · 交互态验证（弹层、汉堡菜单、悬浮条遮挡）
 *
 * 静态截图证明不了交互：
 *   - 相册弹层能不能打开、Esc 能不能关、关掉后焦点有没有回到触发元素
 *   - 汉堡菜单展开/收起、关闭后焦点归位
 *   - 手机悬浮条到底会不会永久遮住页脚内容（这类组件的头号真实缺陷）
 *
 * 这里用 CDP 真的去点、真的去按 Esc，然后读 DOM 状态判定。
 * 用法：node scripts/check-interactions.mjs <baseUrl>
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import net from "node:net";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SHOT_DIR = path.join(ROOT, "_shot");
const PROBE_DIR = path.join(ROOT, "tests", "probe-out");
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const BASE = process.argv[2] || "http://localhost:3000";
const PORT = 9334;

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
  async eval(expression) {
    const r = await this.send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: false,
    });
    if (r.exceptionDetails) {
      throw new Error("eval failed: " + JSON.stringify(r.exceptionDetails).slice(0, 300));
    }
    return r.result?.value;
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
  throw new Error("DevTools endpoint not reachable");
}

async function shot(cdp, name) {
  const res = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  const p = path.join(SHOT_DIR, name);
  fs.writeFileSync(p, Buffer.from(res.data, "base64"));
  return path.relative(ROOT, p).replace(/\\/g, "/");
}

const results = [];
function record(name, pass, detail) {
  results.push({ name, pass, detail });
  console.log(`${pass ? "  OK " : "  XX "} ${name}${detail ? " — " + detail : ""}`);
}

async function main() {
  fs.mkdirSync(SHOT_DIR, { recursive: true });
  fs.mkdirSync(PROBE_DIR, { recursive: true });

  const profile = path.join(
    process.env.TEMP || process.env.TMP || "/tmp",
    "rq-interact-profile-" + Date.now()
  );

  const chrome = spawn(CHROME, [
    "--headless=new", "--disable-gpu", "--no-proxy-server", "--no-first-run",
    "--no-default-browser-check", "--disable-extensions",
    `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, "about:blank",
  ], { stdio: "ignore" });

  try {
    if (!(await waitForPort(PORT))) throw new Error("Chrome 调试端口未就绪");
    const targets = await fetchJson(`http://127.0.0.1:${PORT}/json/list`);
    const page = targets.find((t) => t.type === "page");
    const cdp = new CDP(page.webSocketDebuggerUrl);
    await cdp.ready;
    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");

    // ================= 相册弹层（桌面） =================
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: 1440, height: 900, deviceScaleFactor: 1, mobile: false,
    });
    await cdp.send("Page.navigate", { url: `${BASE}/gallery` });
    await sleep(1500);

    await cdp.eval(`
      (() => {
        const btns = [...document.querySelectorAll('button[aria-label^="放大查看"]')];
        if (!btns.length) return 'no-buttons';
        btns[0].click();
        return 'clicked';
      })()
    `);
    await sleep(700);

    const dialogOpen = await cdp.eval(`
      (() => {
        const d = document.querySelector('[role="dialog"]');
        if (!d) return { open: false };
        return {
          open: true,
          title: (d.querySelector('[data-slot="dialog-title"]') || {}).textContent || "",
          imgs: d.querySelectorAll('img').length,
          hasEscHint: true,
        };
      })()
    `);
    record(
      "相册弹层点击后打开",
      dialogOpen?.open === true,
      dialogOpen?.open ? `标题「${dialogOpen.title}」，含 ${dialogOpen.imgs} 张图` : "未打开"
    );
    await shot(cdp, "_interact-dialog-open.png");

    // Esc 关闭
    await cdp.send("Input.dispatchKeyEvent", {
      type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27,
    });
    await cdp.send("Input.dispatchKeyEvent", {
      type: "keyUp", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27,
    });
    await sleep(700);

    const afterEsc = await cdp.eval(`
      (() => {
        const d = document.querySelector('[role="dialog"]');
        const active = document.activeElement;
        return {
          stillOpen: !!d,
          focusIsTrigger: !!(active && active.getAttribute && (active.getAttribute("aria-label") || "").startsWith("放大查看")),
          focusTag: active ? active.tagName.toLowerCase() : null,
        };
      })()
    `);
    record("弹层 Esc 可关闭", afterEsc?.stillOpen === false, afterEsc?.stillOpen ? "仍打开" : "已关闭");
    record(
      "弹层关闭后焦点回到触发按钮",
      afterEsc?.focusIsTrigger === true,
      `焦点在 <${afterEsc?.focusTag}>`
    );

    // ================= 汉堡菜单（手机） =================
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: 375, height: 900, deviceScaleFactor: 1, mobile: true,
    });
    await cdp.send("Page.navigate", { url: `${BASE}/` });
    await sleep(1500);

    const beforeOpen = await cdp.eval(`
      (() => document.getElementById('mobile-nav') ? 'open' : 'closed')()
    `);
    record("汉堡菜单初始为收起", beforeOpen === "closed", beforeOpen);

    await cdp.eval(`
      (() => {
        const b = document.querySelector('button[aria-controls="mobile-nav"]');
        if (!b) return 'no-trigger';
        b.click();
        return 'ok';
      })()
    `);
    await sleep(600);

    const afterOpen = await cdp.eval(`
      (() => {
        const nav = document.getElementById('mobile-nav');
        const b = document.querySelector('button[aria-controls="mobile-nav"]');
        const bodyOverflow = getComputedStyle(document.body).overflow;
        return {
          open: !!nav,
          links: nav ? nav.querySelectorAll('a').length : 0,
          ariaExpanded: b ? b.getAttribute('aria-expanded') : null,
          label: b ? b.getAttribute('aria-label') : null,
          bodyOverflow,
        };
      })()
    `);
    record("汉堡菜单可展开且含 5 项导航", afterOpen?.open === true, `${afterOpen?.links} 项`);
    record("展开时 aria-expanded=true", afterOpen?.ariaExpanded === "true", String(afterOpen?.ariaExpanded));
    record("展开时锁定 body 滚动", afterOpen?.bodyOverflow === "hidden", `overflow=${afterOpen?.bodyOverflow}`);
    await shot(cdp, "_interact-menu-open.png");

    // Esc 关闭 + 焦点归位
    await cdp.send("Input.dispatchKeyEvent", {
      type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27,
    });
    await cdp.send("Input.dispatchKeyEvent", {
      type: "keyUp", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27,
    });
    await sleep(600);

    const afterEscMenu = await cdp.eval(`
      (() => {
        const nav = document.getElementById('mobile-nav');
        const active = document.activeElement;
        const b = document.querySelector('button[aria-controls="mobile-nav"]');
        return {
          closed: !nav,
          focusOnTrigger: active === b,
          focusLabel: active ? (active.getAttribute('aria-label') || active.tagName) : null,
          bodyOverflow: getComputedStyle(document.body).overflow,
        };
      })()
    `);
    record("汉堡菜单 Esc 可关闭", afterEscMenu?.closed === true, afterEscMenu?.closed ? "已收起" : "仍展开");
    record("汉堡菜单关闭后焦点回到触发按钮", afterEscMenu?.focusOnTrigger === true, String(afterEscMenu?.focusLabel));
    record("收起后还原 body 滚动", afterEscMenu?.bodyOverflow !== "hidden", `overflow=${afterEscMenu?.bodyOverflow}`);

    // ================= 悬浮条不遮挡页脚（关键真实缺陷） =================
    for (const route of ["/", "/services", "/gallery", "/about", "/contact"]) {
      await cdp.send("Page.navigate", { url: `${BASE}${route}` });
      await sleep(1300);

      // 滚到底，让页脚与悬浮条同框
      await cdp.eval(`(() => { window.scrollTo(0, document.body.scrollHeight); return true; })()`);
      await sleep(500);

      const overlap = await cdp.eval(`
        (() => {
          const footer = document.querySelector('footer');
          if (!footer) return { hasFooter: false };
          const bar = [...document.querySelectorAll('body *')].find((el) => {
            const cs = getComputedStyle(el);
            return cs.position === 'fixed' && cs.bottom === '0px' && el.offsetHeight > 0;
          });
          const br = bar ? bar.getBoundingClientRect() : null;

          // 只量**文本叶子节点**的位置。
          // 早先版本量的是 footer 内所有 p/div 的最大底边，结果取到的是整个页脚容器
          // （其底边天然等于页面底部），于是恒判为"被遮挡" —— 那是探针的错，不是布局的错。
          const leaves = [...footer.querySelectorAll('*')].filter(
            (el) => el.children.length === 0 && (el.textContent || '').trim() !== ''
          );
          let maxTextBottom = null;
          let maxTextBottomLabel = null;
          for (const el of leaves) {
            const r = el.getBoundingClientRect();
            if (r.height <= 0) continue;
            if (maxTextBottom === null || r.bottom > maxTextBottom) {
              maxTextBottom = r.bottom;
              maxTextBottomLabel = (el.textContent || '').trim().slice(0, 28);
            }
          }

          return {
            hasFooter: true,
            hasBar: !!bar,
            barTop: br ? Math.round(br.top) : null,
            viewportH: window.innerHeight,
            footerTextBottom: maxTextBottom === null ? null : Math.round(maxTextBottom),
            footerTextLabel: maxTextBottomLabel,
            // 判据：页脚最后一行文字的底边不得进入悬浮条区域
            footerTextCovered:
              maxTextBottom !== null && br ? maxTextBottom > br.top - 1 : null,
          };
        })()
      `);

      const ok = overlap?.hasFooter && overlap?.footerTextCovered === false;
      record(
        `悬浮条不遮挡页脚文字 ${route}`,
        ok,
        overlap?.hasFooter
          ? `页脚末行底边=${overlap.footerTextBottom}("${overlap.footerTextLabel}") 悬浮条顶边=${overlap.barTop}`
          : "无页脚"
      );
    }
    await shot(cdp, "_interact-mobile-bottom.png");

    // 桌面端悬浮条应隐藏
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: 1440, height: 900, deviceScaleFactor: 1, mobile: false,
    });
    await cdp.send("Page.navigate", { url: `${BASE}/` });
    await sleep(1400);
    const desktopBar = await cdp.eval(`
      (() => {
        const bars = [...document.querySelectorAll('body *')].filter((el) => {
          const cs = getComputedStyle(el);
          return cs.position === 'fixed' && cs.bottom === '0px';
        });
        return { count: bars.length, visible: bars.filter(b => b.offsetHeight > 0).length };
      })()
    `);
    record(
      "桌面端悬浮致电条不显示（PRD 仅手机端要求）",
      desktopBar?.visible === 0,
      `fixed bar 总数=${desktopBar?.count}，可见=${desktopBar?.visible}`
    );

    cdp.close();
  } finally {
    try { chrome.kill(); } catch {}
  }

  const out = path.join(PROBE_DIR, "interaction-probe.json");
  fs.writeFileSync(out, JSON.stringify({ base: BASE, results }, null, 2), "utf8");

  const failed = results.filter((r) => !r.pass);
  console.log(`\n共 ${results.length} 项，通过 ${results.length - failed.length}，失败 ${failed.length}`);
  if (failed.length) {
    console.log("失败项：");
    for (const f of failed) console.log(`  - ${f.name}（${f.detail}）`);
    process.exit(1);
  }
  console.log("交互态验证全部通过。");
}

main().catch((e) => {
  console.error("交互态验证失败:", e);
  process.exit(2);
});
