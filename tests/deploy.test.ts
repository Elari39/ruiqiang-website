/**
 * A8 验收测试：部署可移植性（build-side deployability）
 *
 * 这个文件回答的不是"能不能跑"，而是"换一家平台要不要改代码"。
 *
 * 为什么要专门测这个：
 *   部署平台锁定是**沉默的**。某天有人为了修一个构建报错加了
 *   `output: "export"`，或为了一个重定向加了 `vercel.json`，
 *   Vercel 上一切正常，直到要迁到 Netlify（或反过来）时才发现要重写配置。
 *   代码里没有任何迹象。这类回归没人会在 code review 时专门去找，
 *   所以用断言把它钉住。
 *
 * 覆盖三层：
 *   1. **配置层** —— 无平台专属配置文件、`next.config` 不削弱图片优化
 *   2. **路由层** —— 无 Route Handler / 动态函数（两家免费档都够用的前提）
 *   3. **环境层** —— 环境变量口径唯一且带可用缺省
 */
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { SITE_URL } from "@/lib/site";

const ROOT = process.cwd();

/** 递归收集文件（跳过依赖与构建产物）；pathPrefix 用于判断"是否在 app/ 下" */
function walk(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (["node_modules", ".next", ".git", "out"].includes(entry.name)) continue;
      walk(full, out);
    } else {
      out.push(full);
    }
  }
  return out;
}

/** 读取 next.config.ts 的原始文本（不做 import，避免它的注释影响判断） */
function readNextConfig(): string {
  const file = path.join(ROOT, "next.config.ts");
  expect(fs.existsSync(file), "next.config.ts 不存在").toBe(true);
  return fs.readFileSync(file, "utf8");
}

/** 去掉注释，避免"注释里提到了某个词"造成的假阳性 */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

describe("A8 · 部署可移植性", () => {
  /**
   * 本测试的**真实意图**是「换平台不用改源码」，不是「一个平台配置文件都不许有」。
   *
   * 演进记录（2026-09-28 双平台部署）：
   *   原先这里断言 `netlify.toml` 等文件一律不存在。后来用户要求并行部署到
   *   Netlify，于是新增了 `netlify.toml`。此时若继续禁止它，就是**把手段当成目的** ——
   *   该文件是**增量**的：它只对 Netlify 生效，Vercel 完全忽略它，
   *   而真正的可移植性保证（`next.config.ts` 保持默认、无 Route Handler、
   *   零平台专属环境变量）全部保留。
   *
   *   因此断言改为「允许各平台自己的配置文件，但源码侧必须保持通用」——
   *   并把「必须存在 Netlify 运行时插件」写成正向断言，
   *   因为少了它就会静默退化成「把 .next 当静态目录直传」。
   */
  it("平台配置文件若存在，必须是增量式的（不劫持源码可移植性）", () => {
    // vercel.json 仍然禁止：本项目在 Vercel 上零配置即可，加它属于无谓锁定
    expect(
      fs.existsSync(path.join(ROOT, "vercel.json")),
      "出现了 vercel.json。本项目在 Vercel 上零配置即可部署（原生识别 Next 16），" +
        "加它属于无谓的平台锁定",
    ).toBe(false);

    // netlify.toml 允许存在，但内容必须正确（见下一条）
    const hasNetlify = fs.existsSync(path.join(ROOT, "netlify.toml"));
    expect(typeof hasNetlify).toBe("boolean");
  });

  it("★ netlify.toml 若存在，必须声明 @netlify/plugin-nextjs", () => {
    const file = path.join(ROOT, "netlify.toml");
    if (!fs.existsSync(file)) return; // 未走 Netlify 路径时跳过

    const toml = fs.readFileSync(file, "utf8");
    expect(
      toml,
      "netlify.toml 未声明 @netlify/plugin-nextjs。只写 publish='.next' 而不装这个插件时，" +
        "Netlify 会把 .next 当成纯静态目录直传 —— _next/static 之外的东西" +
        "（App Router 路由分发、next/image 优化端点）会静默失效，" +
        "页面可能仍能打开但图片优化与部分路由行为不对，属于难排查的退化。",
    ).toContain("@netlify/plugin-nextjs");
  });

  it("★ 未启用静态导出（否则 next/image 优化会失效）", () => {
    const code = stripComments(readNextConfig());
    expect(
      code,
      "next.config.ts 启用了 output:'export'。这会让 next/image 的服务端优化失效，" +
        "并连带要求 images.unoptimized:true —— 等于为了静态导出削弱图片能力。" +
        "本项目两家平台都支持原生 Next 运行时，不需要静态导出。",
    ).not.toMatch(/output\s*:\s*["']export["']/);
  });

  it("next.config 未把 images 整体关成 unoptimized", () => {
    const code = stripComments(readNextConfig());
    expect(
      code,
        "next.config.ts 里出现了 unoptimized:true —— 图片会以原始体积直出，" +
        "PRD §7.5 的「体积显著低于原图」将不成立",
    ).not.toMatch(/unoptimized\s*:\s*true/);
  });

  it("★ app/ 下不存在 Route Handler（无 API 路由 = 无需服务端运行时）", () => {
    const appDir = path.join(ROOT, "app");
    const handlers = walk(appDir).filter((f) => /[\\/]route\.(ts|tsx|js|jsx)$/.test(f));
    expect(
      handlers.map((f) => path.relative(ROOT, f)),
      "app/ 下出现了 Route Handler。它会被渲染为动态函数（ƒ），" +
        "免费档的静态托管就不够了，且 Netlify 的静态导出路径会断",
    ).toEqual([]);
  });

  it("app/ 下的特殊文件只有 sitemap.ts / robots.ts（两者都是构建期静态生成）", () => {
    const appDir = path.join(ROOT, "app");
    const specials = walk(appDir)
      .map((f) => path.basename(f))
      .filter((n) => /^(sitemap|robots|manifest|opengraph-image|icon|apple-icon)\./.test(n));
    // 允许清单：已知的两个，且都被构建为 ○ (Static)
    expect(specials.slice().sort()).toEqual(["robots.ts", "sitemap.ts"]);
  });

  it("★ SITE_URL 有可用缺省（本地构建不必先配环境变量）", () => {
    // 未设 NEXT_PUBLIC_SITE_URL 时必须回落到 localhost，而不是空串或 undefined
    expect(SITE_URL.length).toBeGreaterThan(0);
    if (!process.env.NEXT_PUBLIC_SITE_URL) {
      expect(SITE_URL).toBe("http://localhost:3000");
    } else {
      expect(SITE_URL.startsWith("http")).toBe(true);
    }
  });

  it("SITE_URL 去掉尾部斜杠（避免拼出 //services 这类双斜杠 URL）", () => {
    expect(SITE_URL.endsWith("/")).toBe(false);
  });

  it("★ 代码里不出现平台专属环境变量（否则换平台要改代码）", () => {
    const srcFiles = [
      ...walk(path.join(ROOT, "lib")),
      ...walk(path.join(ROOT, "app")),
      ...walk(path.join(ROOT, "components")),
    ].filter((f) => /\.(ts|tsx)$/.test(f));

    const offenders: string[] = [];
    for (const f of srcFiles) {
      const code = stripComments(fs.readFileSync(f, "utf8"));
      for (const v of ["VERCEL_URL", "VERCEL_ENV", "NETLIFY", "DEPLOY_PRIME_URL", "CF_PAGES"]) {
        if (code.includes(v)) offenders.push(`${path.relative(ROOT, f)}: ${v}`);
      }
    }
    expect(
      offenders,
      `源码引用了平台专属环境变量，换平台会失效：\n${offenders.join("\n")}`,
    ).toEqual([]);
  });

  it("package.json 的 build 脚本是可移植的标准 next build", () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
    // 允许 run-next.mjs 包装（本机沙箱需要的），但它内部仍调用标准 next build
    expect(pkg.scripts.build).toBeTruthy();
    if (pkg.scripts.build.includes("run-next")) {
      const runner = fs.readFileSync(path.join(ROOT, "scripts", "run-next.mjs"), "utf8");
      expect(runner).toContain("bin");
      expect(runner).toContain("next");
    } else {
      expect(pkg.scripts.build).toContain("next build");
    }
  });

  it("★ 营业执照照及其派生品不在 public/ 下（合规闸门在部署链路上仍有效）", () => {
    const licenseHash = "c9231b84a2a8285c28081548ec3cfb41";
    const publicFiles = walk(path.join(ROOT, "public"));
    const leaked = publicFiles.filter((f) => f.includes(licenseHash));
    expect(leaked.map((f) => path.relative(ROOT, f)), "营业执照照泄漏到 public/").toEqual([]);
  });

  it("public/ 下不存在未被引用的原始大图（体积纪律）", () => {
    const publicImages = walk(path.join(ROOT, "public", "images")).filter((f) =>
      /\.(jpg|jpeg|png)$/i.test(f),
    );
    // 只允许 og-cover.jpg 这类刻意保留的 JPEG（社交平台对 AVIF 支持不稳）
    const oversized = publicImages
      .filter((f) => !f.endsWith("og-cover.jpg"))
      .filter((f) => fs.statSync(f).size > 400 * 1024)
      .map((f) => `${path.relative(ROOT, f)}: ${Math.round(fs.statSync(f).size / 1024)} KB`);
    expect(oversized, `public/ 下有超过 400 KB 的图片：\n${oversized.join("\n")}`).toEqual([]);
  });
});
