/**
 * A3 验收测试：neobrutalism 主题与组件
 *
 * 分两层：
 *   1. 源码层 —— 组件从注册表拉取后确实落库、具备零圆角的令牌化写法、
 *      以及许可证依据留痕（PRD §3.2）。
 *   2. **产物层** —— 断言编译后的 CSS 里圆角解析为 0、阴影无模糊。
 *      这一层才是关键：源码里写的是工具类名，看不出最终数值，
 *      只有查构建产物才能证明"真的生效"，而不是"看起来改了"。
 */
import { describe, expect, it, beforeAll } from "vitest";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const UI_DIR = path.join(ROOT, "components", "ui");
const CHUNKS = path.join(ROOT, ".next", "static", "chunks");

const REQUIRED_COMPONENTS = [
  "button.tsx",
  "card.tsx",
  "badge.tsx",
  "dialog.tsx",
  "accordion.tsx",
];

/** 剥离注释：避免"提醒后人别这么写"的说明性文字把检查变成假阳性（踩过两次）。 */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

describe("组件源码已落库（PRD §3）", () => {
  it("5 个 neobrutalism 组件源码都存在", () => {
    for (const f of REQUIRED_COMPONENTS) {
      expect(fs.existsSync(path.join(UI_DIR, f)), `${f} 应存在`).toBe(true);
    }
  });

  it("组件是源码（可自由修改），不是 npm 运行时依赖", () => {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(ROOT, "package.json"), "utf8")
    );
    const deps = {
      ...(pkg.dependencies ?? {}),
      ...(pkg.devDependencies ?? {}),
    };
    // 不应出现"neobrutalism"相关的运行时包
    const nbDeps = Object.keys(deps).filter((d) => /neobrutal/i.test(d));
    expect(nbDeps).toEqual([]);
  });

  it("components.json 已登记 neobrutalism 注册表，便于后续增补组件", () => {
    const cfg = JSON.parse(
      fs.readFileSync(path.join(ROOT, "components.json"), "utf8")
    );
    expect(cfg.registries?.["@neobrutalism"]).toBe(
      "https://neobrutalism.com/r/radix/{name}.json"
    );
    // CSS 入口必须指向真实使用的样式文件，否则 shadcn 会改错文件
    expect(cfg.tailwind.css).toBe("app/globals.css");
  });

  it("组件不含硬编码的 border-black 之类色值，统一走令牌", () => {
    const offenders: string[] = [];
    for (const f of REQUIRED_COMPONENTS) {
      const s = fs.readFileSync(path.join(UI_DIR, f), "utf8");
      const hits = s.match(/(?:bg|text|border)-(?:black|white)\b/g);
      if (hits) offenders.push(`${f}: ${[...new Set(hits)].join(", ")}`);
    }
    expect(offenders).toEqual([]);
  });

  it("许可证依据留痕在仓库内（PRD §3.2：允许商用、署名非强制）", () => {
    const notice = path.join(UI_DIR, "NOTICE.md");
    expect(fs.existsSync(notice)).toBe(true);
    const s = fs.readFileSync(notice, "utf8");

    // 依据必须可追溯：来源站、条款版本、授权结论三件套缺一不可
    expect(s).toContain("neobrutalism.com");
    expect(s).toContain("2026-06-26");
    expect(s).toMatch(/第\s*4\s*条/);

    // PRD §3.2 的核心结论必须写明：允许商用 / 允许修改分发 / 署名非强制
    expect(s).toMatch(/商用/);
    expect(s).toMatch(/分发/);
    expect(s).toMatch(/署名非强制/);

    // 且必须明确"无授权风险"这一落地结论，避免只抄条款不下判断
    expect(s).toMatch(/无需付费/);
    expect(s).toMatch(/无授权风险/);
  });
});

describe("设计令牌覆盖了组件用到的 Tailwind 默认标度", () => {
  let css: string;

  beforeAll(() => {
    if (!fs.existsSync(CHUNKS)) {
      throw new Error("找不到构建产物，请先运行 npm run build");
    }
    css = fs
      .readdirSync(CHUNKS)
      .filter((f) => f.endsWith(".css"))
      .map((f) => fs.readFileSync(path.join(CHUNKS, f), "utf8"))
      .join("\n");
  });

  it("所有圆角声明解析后为 0", () => {
    const varDefs = new Map<string, string>();
    for (const m of css.matchAll(/(--[\w-]+)\s*:\s*([^;}]+)/g)) {
      varDefs.set(m[1], m[2].trim());
    }
    const resolve = (v: string, d = 0): string => {
      if (d > 10) return v;
      let changed = false;
      const out = v.replace(
        /var\(\s*(--[\w-]+)\s*(?:,\s*([^()]*))?\)/g,
        (_a, name: string, fb?: string) => {
          if (varDefs.has(name)) {
            changed = true;
            return varDefs.get(name)!;
          }
          changed = true;
          return fb?.trim() ?? "0";
        }
      );
      return changed ? resolve(out, d + 1) : out;
    };

    const decls = [...css.matchAll(/border-radius:\s*([^;}]+)/g)].map((m) =>
      m[1].trim()
    );
    const bad: string[] = [];
    for (const decl of decls) {
      const r = resolve(decl).replace(
        /min\(\s*([^,]+),\s*([^)]+)\)/g,
        (_a, x: string) => x.trim()
      );
      if (/^3\.40282e\+?38px$/.test(r)) continue; // rounded-full 字面量，见下条
      const parts = r.split(/[\s/]+/).filter(Boolean);
      if (!parts.every((p) => /^0(px|rem|em|%)?$/i.test(p))) {
        bad.push(`${decl} -> ${r}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it("没有任何组件真正使用 rounded-full（否则圆形与零圆角冲突，需显式决策）", () => {
    const users: string[] = [];
    for (const f of fs.readdirSync(UI_DIR)) {
      if (!f.endsWith(".tsx")) continue;
      const s = stripComments(fs.readFileSync(path.join(UI_DIR, f), "utf8"));
      if (s.includes("rounded-full")) users.push(f);
    }
    // 页面与自定义组件也不应使用
    for (const dir of ["app", "components"]) {
      const walk = (d: string) => {
        for (const n of fs.readdirSync(d)) {
          const p = path.join(d, n);
          if (fs.statSync(p).isDirectory()) {
            if (n === "ui") continue;
            walk(p);
          } else if (n.endsWith(".tsx")) {
            const s = stripComments(fs.readFileSync(p, "utf8"));
            if (s.includes("rounded-full")) users.push(path.relative(ROOT, p));
          }
        }
      };
      if (fs.existsSync(dir)) walk(dir);
    }
    expect(users).toEqual([]);
  });

  it("所有阴影声明无模糊半径", () => {
    const decls = [...css.matchAll(/box-shadow:\s*([^;}]+)/g)].map((m) =>
      m[1].trim()
    );
    const blurred: string[] = [];
    for (const d of decls) {
      if (/\bnone\b/.test(d)) continue;
      const lens = [...d.matchAll(/(-?[\d.]+)(px|rem|em)\b/g)].map((m) =>
        parseFloat(m[1])
      );
      if (lens.length < 3) continue;
      if (lens[2] !== 0) blurred.push(d);
    }
    expect(blurred).toEqual([]);
  });

  it("双字体令牌存在于产物中", () => {
    expect(css).toMatch(/--font-head:/);
    expect(css).toMatch(/--font-sans:/);
  });

  it("产物中不存在 .dark 规则块（PRD §6.2 不做深色模式）", () => {
    expect(css).not.toMatch(/\.dark\s*\{/);
  });

  it("产物中不含 Geist 字体（shadcn init 会注入，必须清掉，否则覆盖 --font-sans）", () => {
    expect(css).not.toMatch(/font-family:\s*Geist/);
    expect(css).not.toMatch(/--font-geist-/);
  });
});

describe("布局未被 shadcn 注入污染", () => {
  it("app/layout.tsx 不存在 Geist 的实际引入（注释里提到不算）", () => {
    const s = fs.readFileSync(path.join(ROOT, "app", "layout.tsx"), "utf8");

    // 去掉注释后再断言：否则"提醒后人别引入 Geist"的说明性注释
    // 会把测试本身变成假阳性（踩过）。
    const code = s
      .replace(/\/\*[\s\S]*?\*\//g, "") // 块注释
      .replace(/^\s*\/\/.*$/gm, ""); // 行注释

    // 真正的污染形态有三类，逐个封死：
    expect(code).not.toMatch(/\bGeist\b/); // ① 引入 / 调用 Geist
    expect(code).not.toMatch(/--font-geist-/); // ② 占用 Geist 字体变量
    expect(code).not.toMatch(/font-geist/); // ③ 引用 Geist 生成的类名

    // 反向保证：剥离注释的逻辑没有把整份代码剥空（否则上面三条恒真）
    expect(code).toContain("export default function RootLayout");
    expect(code.length).toBeGreaterThan(200);
  });

  it("app/layout.tsx 使用本项目的中英双字体变量", () => {
    const s = fs.readFileSync(path.join(ROOT, "app", "layout.tsx"), "utf8");
    for (const v of [
      "--font-latin-head",
      "--font-latin-body",
      "--font-sc-head",
      "--font-sc-body",
    ]) {
      expect(s).toContain(v);
    }
  });
});
