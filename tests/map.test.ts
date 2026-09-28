/**
 * A6 验收测试：地图与可复制地址
 *
 * 两层：
 *   1. **剪贴板降级逻辑** —— 这是本阶段最容易被写错的部分。用注入的假环境
 *      穷举四条路径（API 成功 / API 缺失 / API 被拒 / 全失败），
 *      确保任何一条路径都不会"静默无反应"。
 *   2. **地图与坐标纪律** —— 材料里没有经纬度，代码里就**不能有**经纬度。
 *      这条比功能更重要：一个编造的坐标会把客户导航到错误的地方。
 */
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { copyText, type ClipboardEnv, type TempElement } from "@/lib/clipboard";

const ROOT = process.cwd();
const SERVER_APP = path.join(ROOT, ".next", "server", "app");

/** 造一个假的临时元素 + 记录其 DOM 生命周期 */
function makeEnv(opts: {
  clipboard?: "ok" | "reject" | "absent";
  execCommand?: boolean | "throw";
  withDoc?: boolean;
  onTemp?: (el: TempElement, text: string) => void;
}): {
  env: ClipboardEnv;
  log: { appended: number; removed: number; execCalled: number; tempPresent: boolean };
} {
  const log = { appended: 0, removed: 0, execCalled: 0, tempPresent: false };

  const env: ClipboardEnv = {
    nav:
      opts.clipboard === "absent"
        ? {} // 非安全上下文：navigator 在，但 clipboard 是 undefined
        : {
            clipboard: {
              writeText: async () => {
                if (opts.clipboard === "reject") throw new Error("NotAllowedError");
              },
            },
          },
    execCommand:
      opts.execCommand === undefined
        ? undefined
        : () => {
            log.execCalled++;
            if (opts.execCommand === "throw") throw new Error("boom");
            return opts.execCommand as boolean;
          },
  };

  if (opts.withDoc) {
    env.doc = {
      createElement: () =>
        ({
          value: "",
          style: {},
          setAttribute: () => {},
        }) as TempElement,
      body: {
        appendChild: () => {
          log.appended++;
          log.tempPresent = true;
        },
        removeChild: () => {
          log.removed++;
          log.tempPresent = false;
        },
      },
    };
  }

  if (opts.onTemp) env.onTempElement = opts.onTemp;
  return { env, log };
}

describe("剪贴板复制降级逻辑（A6 核心）", () => {
  it("路径一：clipboard API 可用时优先使用它，不碰 execCommand", async () => {
    const { env, log } = makeEnv({ clipboard: "ok", execCommand: true, withDoc: true });
    const r = await copyText("地址", env);
    expect(r).toBe("ok");
    expect(log.execCalled, "不该调用兜底路径").toBe(0);
  });

  it("路径二：clipboard 不存在（非安全上下文）时走 execCommand", async () => {
    const { env, log } = makeEnv({ clipboard: "absent", execCommand: true, withDoc: true });
    const r = await copyText("地址", env);
    expect(r).toBe("ok");
    expect(log.execCalled, "必须尝试兜底").toBe(1);
  });

  it("路径三：clipboard 被拒时也走 execCommand（不直接判失败）", async () => {
    const { env, log } = makeEnv({ clipboard: "reject", execCommand: true, withDoc: true });
    const r = await copyText("地址", env);
    expect(r).toBe("ok");
    expect(log.execCalled, "被拒后必须尝试兜底").toBe(1);
  });

  it("路径四：两条路都不可用时返回 manual（调用方据此给人工指引）", async () => {
    const { env } = makeEnv({ clipboard: "absent" }); // 无 doc、无 execCommand
    const r = await copyText("地址", env);
    expect(r).toBe("manual");
  });

  it("execCommand 返回 false 时返回 manual，而不是假装成功", async () => {
    const { env } = makeEnv({ clipboard: "absent", execCommand: false, withDoc: true });
    const r = await copyText("地址", env);
    expect(r).toBe("manual");
  });

  it("execCommand 抛异常时不崩，返回 manual", async () => {
    const { env } = makeEnv({ clipboard: "absent", execCommand: "throw", withDoc: true });
    const r = await copyText("地址", env);
    expect(r).toBe("manual");
  });

  it("兜底路径会创建并清理临时节点（不在 DOM 留垃圾）", async () => {
    const { env, log } = makeEnv({ clipboard: "absent", execCommand: true, withDoc: true });
    await copyText("地址", env);
    expect(log.appended).toBe(1);
    expect(log.removed, "必须移除临时 textarea").toBe(1);
    expect(log.tempPresent).toBe(false);
  });

  it("即便 execCommand 抛异常，临时节点也会被清理", async () => {
    const { env, log } = makeEnv({ clipboard: "absent", execCommand: "throw", withDoc: true });
    await copyText("地址", env);
    expect(log.removed, "异常路径也必须清理").toBe(1);
  });

  it("选中操作发生在节点插入文档之后（顺序错了选区会无效）", async () => {
    const order: string[] = [];
    const { env } = makeEnv({
      clipboard: "absent",
      execCommand: true,
      withDoc: true,
      onTemp: () => order.push("select"),
    });
    const origAppend = env.doc!.body.appendChild;
    env.doc!.body.appendChild = (el: TempElement) => {
      order.push("append");
      origAppend(el);
    };
    const origExec = env.execCommand!;
    env.execCommand = (c: string) => {
      order.push("exec");
      return origExec(c);
    };

    await copyText("地址", env);
    expect(order).toEqual(["append", "select", "exec"]);
  });

  it("复制的内容就是传入的完整地址（不多不少）", async () => {
    const seen: string[] = [];
    const { env } = makeEnv({
      clipboard: "absent",
      execCommand: true,
      withDoc: true,
      onTemp: (_el, text) => seen.push(text),
    });
    const addr = "重庆市大足区棠香街道二环北路中段187号附50号";
    await copyText(addr, env);

    // 同时验证 clipboard 未参与、且兜底拿到的文本一致
    const seen2: string[] = [];
    const r2 = makeEnv({ clipboard: "ok" });
    const origWrite = r2.env.nav!.clipboard!.writeText;
    r2.env.nav!.clipboard!.writeText = async (t: string) => {
      seen2.push(t);
      return origWrite(t);
    };
    await copyText(addr, r2.env);

    expect(seen).toEqual([addr]);
    expect(seen2).toEqual([addr]);
  });
});

describe("源码层：坐标纪律（不得编造经纬度）", () => {
  it("lib/company.ts 里 GEO 的 lat/lng 为 null（材料中无坐标）", () => {
    const s = fs.readFileSync(path.join(ROOT, "lib", "company.ts"), "utf8");
    // 抓 GEO 字面量块
    const m = s.match(/export const GEO[\s\S]*?\n\};/);
    expect(m, "应存在 GEO 定义").toBeTruthy();
    const block = m![0];
    expect(block, "lat 必须为 null").toMatch(/lat:\s*null/);
    expect(block, "lng 必须为 null").toMatch(/lng:\s*null/);
    expect(block, "verified 必须为 false").toMatch(/verified:\s*false/);
  });

  it("全站源码不出现疑似坐标的数字（防手滑填进去）", () => {
    const files = [
      "lib/company.ts",
      "lib/site.ts",
      "lib/content.ts",
      "components/MapEmbed.tsx",
    ];
    const bad: string[] = [];
    for (const f of files) {
      const p = path.join(ROOT, f);
      if (!fs.existsSync(p)) continue;
      const s = fs.readFileSync(p, "utf8");
      // 大足区坐标大致在 lng 105.7 / lat 29.7 附近；任何形如 1xx.xxx / 2x.xxx 的字面量都值得警惕
      const hits = s.match(/\b(?:10[0-9]|11[0-9])\.[0-9]{3,}\b|\b(?:2[0-9]|3[0-5])\.[0-9]{3,}\b/g);
      if (hits) bad.push(`${f}: ${[...new Set(hits)].join(", ")}`);
    }
    expect(bad).toEqual([]);
  });

  it("GEO 的 source 字段如实说明尚未取得，而不是留空", () => {
    const s = fs.readFileSync(path.join(ROOT, "lib", "company.ts"), "utf8");
    const m = s.match(/export const GEO[\s\S]*?\n\};/);
    expect(m![0]).toMatch(/source:\s*"[^"]*尚未取得[^"]*"/);
  });

  it("说明里写清了本机取证失败的原因（可追溯，不是一句空话）", () => {
    const s = fs.readFileSync(path.join(ROOT, "lib", "company.ts"), "utf8");
    expect(s).toMatch(/nominatim/i);
    expect(s).toMatch(/amap/i);
    expect(s).toMatch(/INVALID_USER_KEY/);
  });
});

describe("源码层：地图组件（路线 B + 可切换）", () => {
  it("保留了 SDK-MODE 注释分支，便于将来切交互地图", () => {
    const s = fs.readFileSync(path.join(ROOT, "components", "MapEmbed.tsx"), "utf8");
    expect(s).toMatch(/SDK-MODE/);
    expect(s).toMatch(/NEXT_PUBLIC_AMAP_KEY/);
  });

  it("外链一律 target=_blank + rel=noopener noreferrer", () => {
    const s = fs.readFileSync(path.join(ROOT, "components", "MapEmbed.tsx"), "utf8");
    // 数一下有几个 <a 与几个 target/rel
    const anchors = s.match(/<a\b/g)?.length ?? 0;
    const blanks = s.match(/target="_blank"/g)?.length ?? 0;
    const rels = s.match(/rel="noopener noreferrer"/g)?.length ?? 0;
    expect(anchors).toBeGreaterThanOrEqual(2);
    expect(blanks, "每个外链都要 target=_blank").toBe(anchors);
    expect(rels, "每个外链都要 rel=noopener noreferrer").toBe(anchors);
  });

  it("地图外链用的是检索形式（不依赖本地坐标）", () => {
    const s = fs.readFileSync(path.join(ROOT, "lib", "company.ts"), "utf8");
    expect(s).toMatch(/uri\.amap\.com\/search\?keyword=/);
    expect(s).toMatch(/map\.baidu\.com\/search\//);
  });

  it("外链 URL 里编码的是完整地址", () => {
    const s = fs.readFileSync(path.join(ROOT, "lib", "company.ts"), "utf8");
    const m = s.match(/export const MAP_SEARCH_URL =([\s\S]*?);/);
    expect(m, "应存在 MAP_SEARCH_URL").toBeTruthy();
    expect(m![1]).toMatch(/encodeURIComponent\(COMPANY\.address\)/);
  });

  it("组件按 HAS_GEO 在两种形态间切换（不是写死一种）", () => {
    const s = fs.readFileSync(path.join(ROOT, "components", "MapEmbed.tsx"), "utf8");
    expect(s).toMatch(/HAS_GEO\s*\?/);
  });
});

describe("产物层：联系页含地图与可复制地址", () => {
  it("联系页渲染地图区与外链", () => {
    const p = path.join(SERVER_APP, "contact.html");
    if (!fs.existsSync(p)) throw new Error("找不到 contact.html，请先 npm run build");
    const doc = fs.readFileSync(p, "utf8");

    expect(doc).toContain("位置地图");
    // 两个图商外链
    expect(doc).toMatch(/uri\.amap\.com\/search\?keyword=/);
    expect(doc).toMatch(/map\.baidu\.com\/search\//);
    // 安全属性
    expect(doc).toMatch(/rel="noopener noreferrer"/);
  });

  it("联系页的复制按钮与反馈区都在产物里", () => {
    const doc = fs.readFileSync(path.join(SERVER_APP, "contact.html"), "utf8");
    expect(doc).toContain("复制地址");
    // 反馈区必须存在（role=status），否则失败时用户看不到任何东西
    expect(doc).toMatch(/role="status"/);
    expect(doc).toMatch(/aria-live="polite"/);
  });

  it("联系页不出现任何经纬度数字（产物层再兜一次底）", () => {
    const doc = fs.readFileSync(path.join(SERVER_APP, "contact.html"), "utf8");
    const hits = doc.match(/\b(?:10[0-9]|11[0-9])\.[0-9]{3,}\b|\b(?:2[0-9]|3[0-5])\.[0-9]{3,}\b/g);
    expect(hits ?? []).toEqual([]);
  });
});
