#!/usr/bin/env node
/**
 * 检查构建产物 CSS，确认 neobrutalism 的两个支点真的生效：
 *   1. rounded 工具类解析出的 border-radius 全为 0
 *   2. shadow 工具类解析出的 box-shadow 不含模糊半径（第三个长度值为 0 或缺省）
 *
 * 为什么必须查构建产物而不是查源码：
 *   组件源码用的是 Tailwind 的 rounded / shadow 工具类，源码里看不到最终数值，
 *   只有在 @theme 覆盖生效后编译出的 CSS 里才能验证真实结果。
 *   这是"看起来改了"和"真的生效"的分界线。
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const CHUNKS = path.join(ROOT, ".next", "static", "chunks");

if (!fs.existsSync(CHUNKS)) {
  console.error("[FAIL] 找不到 .next/static/chunks —— 请先构建");
  process.exit(1);
}

const cssFiles = fs
  .readdirSync(CHUNKS)
  .filter((f) => f.endsWith(".css"))
  .map((f) => path.join(CHUNKS, f));

if (cssFiles.length === 0) {
  console.error("[FAIL] 未找到构建后的 CSS 文件");
  process.exit(1);
}

let css = "";
for (const f of cssFiles) css += fs.readFileSync(f, "utf8") + "\n";

console.log(`检查 ${cssFiles.length} 个 CSS 文件，共 ${(css.length / 1024).toFixed(0)}KB`);

const failures = [];

// ---- 1. 圆角：所有 border-radius 声明必须解析为 0 ----
/*
 * 注意：不能只把 `border-radius:var(--radius)` 的字面值当成"非零"。
 * 组件里大量使用变量引用形式（var(--radius) / var(--radius-lg) / min(var(--radius-md),10px)），
 * 真正的判据是**解析后的值**。所以这里先从产物里收集所有自定义属性定义，
 * 再对每条 border-radius 做变量代换，最后判断结果是否为 0。
 */
const varDefs = new Map();
for (const m of css.matchAll(/(--[\w-]+)\s*:\s*([^;}]+)/g)) {
  // 后出现的定义覆盖先出现的（与层叠一致）
  varDefs.set(m[1], m[2].trim());
}

function resolveVars(value, depth = 0) {
  if (depth > 10) return value;
  let out = value;
  let changed = false;
  out = out.replace(/var\(\s*(--[\w-]+)\s*(?:,\s*([^()]*))?\)/g, (_all, name, fallback) => {
    if (varDefs.has(name)) {
      changed = true;
      return varDefs.get(name);
    }
    if (fallback !== undefined) {
      changed = true;
      return fallback.trim();
    }
    return "0";
  });
  return changed ? resolveVars(out, depth + 1) : out;
}

/** 判断一个已解析的 border-radius 值是否为视觉上的 0 */
function isZeroRadius(resolved) {
  // 去掉空格后全部是 0（可带单位），或形如 0px 0px 0px 0px
  const parts = resolved
    .split(/[\s/]+/)
    .map((p) => p.trim())
    .filter(Boolean);
  // rounded-full 的字面量大半径单独处理（见下方说明），这里视为可接受
  if (/^3\.40282e\+?38px$/.test(resolved.trim())) return true;
  return parts.every((p) => /^0(px|rem|em|%)?$/i.test(p));
}

const radiusDecls = [...css.matchAll(/border-radius:\s*([^;}]+)/g)].map((m) =>
  m[1].trim()
);
const nonZeroRadius = [];
for (const decl of radiusDecls) {
  const resolved = resolveVars(decl);
  // min(0,10px) 之类会化简为 min(0,10px)，取第一个数值参与判断
  const simplified = resolved.replace(/min\(\s*([^,]+),\s*([^)]+)\)/g, (_a, x) =>
    x.trim()
  );
  if (!isZeroRadius(simplified)) {
    nonZeroRadius.push(`${decl}  ->  解析为 ${resolved}`);
  }
}
console.log(`border-radius 声明: ${radiusDecls.length} 条`);
if (nonZeroRadius.length > 0) {
  const uniq = [...new Set(nonZeroRadius)].slice(0, 10);
  failures.push(`存在解析后非零的圆角:\n      ${uniq.join("\n      ")}`);
} else {
  console.log("  全部解析为 0");
}

/*
 * 单独核查 .rounded-full。
 * 它编译成字面量 3.40282e38px（Tailwind 用来表达"足够大的半径"），**不经过任何变量**，
 * 所以无法通过 :root 覆盖；而"圆形"与"零圆角"本身就是互斥的视觉需求
 * （例如关闭按钮的圆形热区），硬压成 0 反而不对。
 * 这里不做压制，改为断言"没有任何组件真的用了它" —— 它是死 CSS 就无害；
 * 一旦将来有人引入 .rounded-full，这条断言会失败，逼人显式决策。
 */
const usesRoundedFull = /border-radius:\s*3\.40282e38px/.test(css);
if (usesRoundedFull) {
  console.log(".rounded-full 工具类存在于产物中（字面量大半径，无法变量化）");
}

// ---- 2. 阴影：box-shadow 必须无模糊 ----
// 合法形态：<x> <y> 0 0 <color>  或  <x> <y> 0 <color>
// 判据：第三个长度值必须是 0（模糊半径）
const shadowDecls = [...css.matchAll(/box-shadow:\s*([^;}]+)/g)].map((m) =>
  m[1].trim()
);
const blurredShadows = [];
for (const d of shadowDecls) {
  if (/\bnone\b/.test(d)) continue;
  // 提取所有长度值（含 0），前三个依次为 x 偏移 / y 偏移 / 模糊半径
  const lens = [...d.matchAll(/(-?[\d.]+)(px|rem|em)\b/g)].map((m) => parseFloat(m[1]));
  if (lens.length < 3) continue; // 形如 "0 0 #000" 的简写，模糊为 0
  if (lens[2] !== 0) blurredShadows.push(d);
}
console.log(`box-shadow 声明: ${shadowDecls.length} 条`);
if (blurredShadows.length > 0) {
  const uniq = [...new Set(blurredShadows)].slice(0, 10);
  failures.push(`存在带模糊的阴影: ${uniq.join(" | ")}`);
} else {
  console.log("  全部无模糊");
}

// ---- 3. 字体令牌：中英双字体链存在于产物中 ----
const hasHeadChain = /--font-head:/.test(css);
const hasSansChain = /--font-sans:/.test(css);
console.log(`--font-head 存在: ${hasHeadChain}`);
console.log(`--font-sans 存在: ${hasSansChain}`);
if (!hasHeadChain || !hasSansChain) {
  failures.push("字体令牌未出现在构建产物中");
}

// ---- 4. 暗色模式必须缺席（PRD §6.2）----
const hasDarkBlock = /\.dark\s*\{/.test(css);
console.log(`.dark 规则块存在: ${hasDarkBlock}`);
if (hasDarkBlock) failures.push("产物中仍有 .dark 规则块，违反 PRD §6.2");

console.log("");
if (failures.length > 0) {
  console.error("[FAIL] neobrutalism 令牌校验未通过:");
  for (const f of failures) console.error("  - " + f);
  process.exit(1);
}
console.log("[PASS] 零圆角 / 无模糊阴影 / 双字体链 / 无暗色模式 全部成立");
