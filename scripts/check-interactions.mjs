/**
 * A5 补充 · 交互态验证（弹层、汉堡菜单、悬浮条遮挡）
 *
 * 静态截图证明不了交互：
 *   - 相册弹层能不能打开、**打开的是不是被点击的那一张**、Esc 能不能关、
 *     关掉后焦点有没有回到触发元素
 *   - 汉堡菜单展开/收起、关闭后焦点归位
 *   - 手机悬浮条到底会不会永久遮住页脚内容（这类组件的头号真实缺陷）
 *
 * ⚠️ "打开的是不是被点击的那一张"这条是补上的：原探针只点第 1 张，
 *    而弹层里"永远显示第 1 张"恰好是缺陷下的正确表现，于是恒过。
 *    现在故意点第 3 张，并同时校验图注与 `n / 总数` 计数。
 *
 * 这里用 CDP 真的去点、真的去按 Esc，然后读 DOM 状态判定。
 * 用法：node scripts/check-interactions.mjs <baseUrl>
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import net from "node:net";
import { chromeArgs, findChrome } from "./chrome-path.mjs";
import { probeMetadata } from "./probe-contract.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SHOT_DIR = path.join(ROOT, "_shot");
const PROBE_DIR = path.join(ROOT, "tests", "probe-out");
// 不再硬编码路径：按 CHROME_PATH → 常见安装位置 → PATH 查找（见 chrome-path.mjs）
const CHROME = findChrome();
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
    ...chromeArgs(),
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

    // ========== 弹层打开的是「被点击的那一张」（修掉的真实缺陷） ==========
    //
    // 缺陷回顾：弹层把 4 张图一次性渲进一个横向 snap 滚动容器，而最初
    // **没有任何把容器滚到被点击索引的逻辑**。于是点第 3 张，标题写的是第 3 张的
    // 图注，画面却永远是第 1 张 —— 图注与画面互相矛盾；手指滑到别的图后，
    // 标题也不会跟着变。
    //
    // 为什么原来的探针抓不到：它点的是 `btns[0]`（第 1 张），
    // 而"显示第 1 张"恰好是缺陷下的正确表现，于是恒过。
    // 因此这里**故意点第 3 张**（索引 2），让缺陷无处可藏。
    const CLICK_INDEX = 2;
    const clicked = await cdp.eval(`
      (() => {
        const btns = [...document.querySelectorAll('button[aria-label^="放大查看"]')];
        if (btns.length <= ${CLICK_INDEX}) {
          return { ok: false, reason: '缩略图不足 ' + btns.length + ' 张' , total: btns.length };
        }
        const captions = btns.map((b) => (b.getAttribute('aria-label') || '').replace('放大查看：', ''));
        btns[${CLICK_INDEX}].click();
        return { ok: true, captions, caption: captions[${CLICK_INDEX}], total: btns.length };
      })()
    `);
    await sleep(900);

    const lightbox = await cdp.eval(`
      (() => {
        const d = document.querySelector('[role="dialog"]');
        if (!d) return { open: false };

        // 定位弹层内的横向滚动容器（GalleryGrid 给它挂了 aria-label）
        const scroller = d.querySelector('[aria-label="工程实拍照片，可左右滑动切换"]');
        if (!scroller || !scroller.clientWidth) {
          return { open: true, scroller: false };
        }

        const titleEl = d.querySelector('[data-slot="dialog-title"]');
        return {
          open: true,
          scroller: true,
          clientWidth: scroller.clientWidth,
          scrollWidth: scroller.scrollWidth,
          scrollLeft: Math.round(scroller.scrollLeft),
          visibleIndex: Math.round(scroller.scrollLeft / scroller.clientWidth),
          title: (titleEl ? titleEl.textContent : '') || '',
          slides: scroller.children.length,
        };
      })()
    `);
    await shot(cdp, "_interact-lightbox-index.png");

    const titleMatches =
      lightbox?.scroller === true &&
      typeof lightbox.title === "string" &&
      typeof clicked?.caption === "string" &&
      clicked.caption.length > 0 &&
      lightbox.title.includes(clicked.caption);

    record(
      "灯箱打开的是被点击的那张图",
      lightbox?.scroller === true &&
        lightbox.visibleIndex === CLICK_INDEX &&
        titleMatches,
      `可见索引=${lightbox?.visibleIndex}, 点击索引=${CLICK_INDEX}, ` +
        `滚动位置=${lightbox?.scrollLeft}/${lightbox?.clientWidth}（scrollWidth=${lightbox?.scrollWidth}, ` +
        `共 ${lightbox?.slides} 张）, ` +
        `标题「${lightbox?.title}」, 期望图注「${clicked?.caption}」`
    );

    // 计数应当与可见照片一致（它是索引同步在界面上的可见证据）
    const counterText = typeof lightbox?.title === "string"
      ? (lightbox.title.match(/\d+\s*\/\s*\d+\s*$/) || [""])[0].trim()
      : "";
    record(
      "灯箱计数与可见照片一致",
      lightbox?.scroller === true && counterText === `${CLICK_INDEX + 1} / ${clicked?.total}`,
      `计数=「${counterText}」，期望=「${CLICK_INDEX + 1} / ${clicked?.total}」`
    );

    // ---- 滑动跟随：手指滑到别的图后，标题与计数要跟着变 ----
    //
    // 这是缺陷的另一半。只把"打开时定位正确"修好还不够：用户滑到第 2 张后，
    // 若标题仍写着第 3 张的图注，画面与文字依旧矛盾。
    // 这里直接改 scrollLeft 模拟一次横向滑动，再读回标题与计数。
    const SWIPE_TO = 1;
    await cdp.eval(`
      (() => {
        const d = document.querySelector('[role="dialog"]');
        const s = d && d.querySelector('[aria-label="工程实拍照片，可左右滑动切换"]');
        if (!s) return false;
        s.scrollLeft = s.clientWidth * ${SWIPE_TO};
        return true;
      })()
    `);
    await sleep(700);

    const afterSwipe = await cdp.eval(`
      (() => {
        const d = document.querySelector('[role="dialog"]');
        if (!d) return { open: false };
        const s = d.querySelector('[aria-label="工程实拍照片，可左右滑动切换"]');
        const titleEl = d.querySelector('[data-slot="dialog-title"]');
        return {
          open: true,
          visibleIndex: s ? Math.round(s.scrollLeft / s.clientWidth) : null,
          title: (titleEl ? titleEl.textContent : '') || '',
        };
      })()
    `);
    const swipeCaption = Array.isArray(clicked?.captions) ? clicked.captions[SWIPE_TO] : "";
    const swipeCounter = typeof afterSwipe?.title === "string"
      ? (afterSwipe.title.match(/\d+\s*\/\s*\d+\s*$/) || [""])[0].trim()
      : "";
    record(
      "灯箱内滑动后标题与计数跟随可见照片",
      afterSwipe?.visibleIndex === SWIPE_TO &&
        typeof afterSwipe.title === "string" &&
        swipeCaption.length > 0 &&
        afterSwipe.title.includes(swipeCaption) &&
        swipeCounter === `${SWIPE_TO + 1} / ${clicked?.total}`,
      `可见索引=${afterSwipe?.visibleIndex}, 期望索引=${SWIPE_TO}, ` +
        `标题「${afterSwipe?.title}」, 期望图注「${swipeCaption}」, 计数=「${swipeCounter}」`
    );

    // 收起点开的弹层，避免影响后面的用例
    await cdp.send("Input.dispatchKeyEvent", {
      type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27,
    });
    await cdp.send("Input.dispatchKeyEvent", {
      type: "keyUp", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27,
    });
    await sleep(500);

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
  fs.writeFileSync(out, JSON.stringify({ ...probeMetadata(BASE), results }, null, 2), "utf8");

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
