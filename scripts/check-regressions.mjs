import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { chromeArgs, findChrome } from "./chrome-path.mjs";
import { probeMetadata } from "./probe-contract.mjs";

const base = process.argv[2] || "http://127.0.0.1:3311";
const live = new URL(base).hostname !== "127.0.0.1" && new URL(base).hostname !== "localhost";
const browser = await chromium.launch({ executablePath: findChrome(), args: chromeArgs() });
const page = await browser.newPage();
const failures = [];
const results = [];
async function check(name, action) {
  try {
    await action();
    results.push({ name, pass: true });
    console.log(`PASS ${name}`);
  } catch (error) {
    failures.push(`${name}: ${error.message}`);
    results.push({ name, pass: false, detail: error.message });
    console.error(`FAIL ${name}: ${error.message}`);
  }
}

try {
  for (const width of [375, 390, 767]) {
    await page.setViewportSize({ width, height: 812 });
    for (const route of ["/", "/services", "/gallery", "/about", "/contact"]) {
      await check(`致电入口命中 ${width} ${route}`, async () => {
        const response = await page.goto(base + route);
        assert.equal(response.status(), 200);
        await page.locator('button[aria-controls="mobile-nav"]').waitFor();
        // Local fixture reproduces the measured production iframe, including
        // late insertion. Live verification must use the real injected badge.
        if (!live) {
          await page.evaluate(() => {
            const badge = document.createElement("iframe");
            badge.id = "nl-badge-frame";
            badge.title = "Test badge";
            badge.style.cssText = "position:fixed;bottom:0;right:15px;width:196px;height:63px;border:0;z-index:2147483645";
            document.body.append(badge);
          });
        }
        await page.locator("#nl-badge-frame").waitFor({ state: "visible" });
        const link = page.locator("div.fixed").getByRole("link", { name: "立即致电 19936641843", exact: true });
        const hits = await link.evaluate((el) => {
          const r = el.getBoundingClientRect();
          return [0.1, 0.25, 0.5, 0.75, 0.9].map((x) => {
            const hit = document.elementFromPoint(r.left + r.width * x, r.top + r.height / 2);
            return hit === el || el.contains(hit);
          });
        });
        assert.deepEqual(hits, [true, true, true, true, true]);
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        const clear = await link.evaluate((el) => {
          const texts = [...document.querySelectorAll("footer *")].filter(e => !e.children.length && e.textContent.trim());
          return texts.every(e => e.getBoundingClientRect().bottom <= el.getBoundingClientRect().top);
        });
        assert.equal(clear, true, "页脚文字不能被抬高后的致电条遮挡");
      });
    }
  }
  await check("菜单跨断点后关闭并恢复滚动", async () => {
    await page.setViewportSize({ width: 768, height: 600 });
    await page.goto(base + "/");
    const trigger = page.locator('button[aria-controls="mobile-nav"]');
    await trigger.click();
    await page.waitForFunction(() => document.body.style.overflow === "hidden");
    await page.setViewportSize({ width: 1024, height: 600 });
    await page.waitForFunction(() => !document.getElementById("mobile-nav") && getComputedStyle(document.body).overflow !== "hidden", null, { timeout: 5000 });
    await page.mouse.move(500, 400);
    await page.mouse.wheel(0, 400);
    await page.waitForFunction(() => window.scrollY > 0);
    await page.setViewportSize({ width: 768, height: 600 });
    assert.equal(await trigger.getAttribute("aria-expanded"), "false");
    await trigger.click();
    await trigger.press("Escape");
    await page.waitForFunction(() => document.activeElement?.getAttribute("aria-controls") === "mobile-nav" && getComputedStyle(document.body).overflow !== "hidden");
  });
} finally {
  fs.mkdirSync("tests/probe-out", { recursive: true });
  await page.screenshot({ path: "tests/probe-out/regressions.png" });
  fs.writeFileSync(path.join("tests/probe-out", "regression-probe.json"), JSON.stringify({ ...probeMetadata(base), results }, null, 2));
  await browser.close();
}
if (failures.length) throw new Error(failures.join("\n"));
