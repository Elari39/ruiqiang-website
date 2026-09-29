/**
 * 定位本机 Chrome / Chromium 可执行文件。
 *
 * ## 为什么单独抽成一个模块
 *
 * `check-responsive.mjs` 与 `check-interactions.mjs` 原先都把路径硬编码成
 * `C:/Program Files/Google/Chrome/Application/chrome.exe`。在一台
 * Chrome 装在别处、用 Edge/Chromium、或者根本不是 Windows 的机器上，
 * 探针脚本会直接 `spawn ENOENT` —— 而报错信息里完全看不出是"找不到浏览器"，
 * 更看不出该改哪里。探针本身是有价值的验收手段，不该因为一条硬编码路径
 * 就在别的机器上整体失效。
 *
 * ## 查找顺序
 *
 *   1. 环境变量显式指定（CHROME_PATH → PUPPETEER_EXECUTABLE_PATH → CHROME_BIN）
 *   2. 各平台常见安装位置（Windows / macOS / Linux，含 Edge 与 Chromium）
 *   3. PATH 里找 google-chrome / chromium / chrome（尽力而为，失败不报错）
 *
 * 全都找不到时抛出**可操作**的错误，而不是让 spawn 抛一个看不懂的 ENOENT。
 */
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { chromium } from "playwright";

const ENV_KEYS = ["CHROME_PATH", "PUPPETEER_EXECUTABLE_PATH", "CHROME_BIN"];

/** Browser flags supplied only by the isolated cloud verification runner. */
export function chromeArgs() {
  return JSON.parse(process.env.PROBE_CHROME_ARGS || "[]");
}

const WELL_KNOWN = [
  // Windows · Chrome
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  // Windows · Chrome（用户级安装）
  process.env.LOCALAPPDATA &&
    `${process.env.LOCALAPPDATA}/Google/Chrome/Application/chrome.exe`,
  // Windows · Edge 同样实现了 CDP，可作兜底
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  // macOS
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  // Linux
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/snap/bin/chromium",
].filter(Boolean);

/** PATH 里按名字找（尽力而为：受限沙箱下取子进程输出可能被拒，忽略即可） */
function fromPath() {
  const cmd = process.platform === "win32" ? "where" : "which";
  for (const name of ["google-chrome", "chromium", "chrome"]) {
    try {
      const out = execFileSync(cmd, [name], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      });
      const first = out
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean)[0];
      if (first && fs.existsSync(first)) return first;
    } catch {
      /* 没找到，或环境不允许取子进程输出 —— 继续试下一个 */
    }
  }
  return null;
}

/**
 * 返回可用的浏览器可执行文件路径；找不到就抛错。
 * @returns {string}
 */
export function findChrome() {
  for (const key of ENV_KEYS) {
    const v = process.env[key];
    if (v && fs.existsSync(v)) return v;
  }

  for (const p of WELL_KNOWN) {
    try {
      if (fs.existsSync(p)) return p;
    } catch {
      /* 路径非法，跳过 */
    }
  }

  const viaPath = fromPath();
  if (viaPath) return viaPath;

  const installed = chromium.executablePath();
  if (fs.existsSync(installed)) return installed;

  const tried = [
    ...ENV_KEYS.map((k) => `环境变量 ${k}`),
    ...WELL_KNOWN,
  ];
  throw new Error(
    "找不到 Chrome / Chromium 可执行文件，探针无法运行。\n" +
      "请显式指定（推荐）：\n" +
      '  PowerShell:  $env:CHROME_PATH = "D:\\path\\to\\chrome.exe"\n' +
      '  bash:        export CHROME_PATH=/usr/bin/google-chrome\n' +
      `已尝试过的位置：\n  - ${tried.join("\n  - ")}\n` +
      "PATH 里也没有 google-chrome / chromium / chrome。",
  );
}
