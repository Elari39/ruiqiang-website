/**
 * A7 验收测试：SEO 与技术收口
 *
 * 本文件盯的是"搜索引擎看到的东西"，分三层：
 *
 *   1. **元数据层（纯函数）** —— title / description 的唯一性与长度。
 *      这是最容易悄悄退化的部分：新增页面时复制粘贴上一页的 metadata，
 *      测试全绿、人眼也看不出，但搜索引擎会把两页判为重复内容。
 *
 *   2. **结构化数据层** —— LocalBusiness JSON-LD 的字段合法性。
 *      重点是**负向断言**：不得出现 aggregateRating / review / award。
 *      这三者一旦写进去就是虚假标记（PRD §7.7），比不写结构化数据更糟。
 *
 *   3. **构建产物层** —— 真去读 `.next/server/app/**` 里生成的 HTML，
 *      确认 canonical、og:image、JSON-LD 真的落地了，而不是只写在源码里。
 *      源码里对、产物里不对，是本项目已经踩过的坑（见文档注释）。
 */
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { PAGE_META, NAV_ITEMS, SITE_NAME, SITE_URL, pageUrl } from "@/lib/site";
import { buildMetadata } from "@/lib/metadata";
import { COMPANY, BUSINESS_SCOPE } from "@/lib/company";

/** 经营范围全文（许可 + 一般），用于校验结构化数据未自造业务 */
const BUSINESS_SCOPE_TEXT = `${BUSINESS_SCOPE.licensed}${BUSINESS_SCOPE.general}`;

const ROOT = process.cwd();

/** 产物目录：Next 把每个静态路由的 HTML 放在这里 */
const SERVER_APP = path.join(ROOT, ".next", "server", "app");

/** 读取某个路由的构建产物 HTML；产物不存在时给出可操作的报错 */
function readHtml(pathname: string): string {
  const file = path.join(
    SERVER_APP,
    pathname === "/" ? "index.html" : `${pathname.slice(1)}.html`,
  );
  if (!fs.existsSync(file)) {
    throw new Error(
      `缺少构建产物 ${path.relative(ROOT, file)}，请先运行 \`node scripts/run-next.mjs build\``,
    );
  }
  return fs.readFileSync(file, "utf8");
}

const ALL_PAGES = Object.keys(PAGE_META) as (keyof typeof PAGE_META)[];

describe("A7 · 逐页元数据", () => {
  it("元数据表覆盖全部 5 个导航页面，且没有多余条目", () => {
    expect(ALL_PAGES.slice().sort()).toEqual(
      NAV_ITEMS.map((n) => n.href).slice().sort(),
    );
  });

  it("title 两两不重复（去重后长度不变）", () => {
    const titles = ALL_PAGES.map((p) => PAGE_META[p].title);
    const dupes = titles.filter((t, i) => titles.indexOf(t) !== i);
    expect(dupes, `重复的 title：${dupes.join(" / ")}`).toEqual([]);
    expect(new Set(titles).size).toBe(titles.length);
  });

  it("description 两两不重复（去重后长度不变）", () => {
    const descs = ALL_PAGES.map((p) => PAGE_META[p].description);
    const dupes = descs.filter((d, i) => descs.indexOf(d) !== i);
    expect(dupes, `重复的 description：${dupes.join(" / ")}`).toEqual([]);
    expect(new Set(descs).size).toBe(descs.length);
  });

  it("description 长度落在搜索引擎摘要区间（60–160 字符）", () => {
    const bad: string[] = [];
    for (const p of ALL_PAGES) {
      const len = PAGE_META[p].description.length;
      if (len < 60 || len > 160) bad.push(`${p}: ${len} 字符`);
    }
    expect(bad, `长度越界的 description：\n${bad.join("\n")}`).toEqual([]);
  });

  it("除首页外，页面短标题不与站名重复（避免渲染出「站名｜站名」）", () => {
    const bad = ALL_PAGES.filter((p) => p !== "/" && PAGE_META[p].title.includes(SITE_NAME));
    expect(bad, `标题已含站名、会被模板再拼一次：${bad.join(" / ")}`).toEqual([]);
  });

  it("buildMetadata 为每页都给出 canonical 与 og:url，且两者一致", () => {
    for (const p of ALL_PAGES) {
      const m = buildMetadata(p);
      expect(m.alternates?.canonical, `${p} 缺 canonical`).toBe(pageUrl(p));
      expect(m.openGraph?.url, `${p} 的 og:url 与 canonical 不一致`).toBe(pageUrl(p));
    }
  });

  it("buildMetadata 的 og:image 是绝对 URL 且指向真实存在的文件", () => {
    for (const p of ALL_PAGES) {
      const m = buildMetadata(p);
      const images = m.openGraph?.images;
      expect(Array.isArray(images) && images.length > 0, `${p} 缺 og:image`).toBe(true);
      const first = (images as { url: string }[])[0];
      expect(first.url.startsWith(SITE_URL), `${p} 的 og:image 不是绝对 URL`).toBe(true);

      // 绝对 URL → 相对 public 的路径 → 文件必须真的在
      const rel = first.url.slice(SITE_URL.length).replace(/^\//, "");
      const onDisk = path.join(ROOT, "public", rel);
      expect(fs.existsSync(onDisk), `og:image 指向的文件不存在：${onDisk}`).toBe(true);
    }
  });

  it("twitter 卡片为 summary_large_image 且带图", () => {
    for (const p of ALL_PAGES) {
      const m = buildMetadata(p);
      // Next 的 Twitter 类型是「判别联合」：只有 card:'summary_large_image'
      // 的那一支才有 card 字段，直接写 m.twitter?.card 会报类型错。
      // 这里先做 in 收窄，再断言 —— 收窄本身也顺带证明了 card 的类型正确。
      const tw = m.twitter;
      expect(tw && "card" in tw, `${p} 的 twitter 配置缺 card 字段`).toBe(true);
      if (!tw || !("card" in tw)) return;
      expect(tw.card, `${p} twitter card 类型不对`).toBe("summary_large_image");

      const twImages = tw.images;
      const list = Array.isArray(twImages) ? twImages : twImages ? [twImages] : [];
      expect(list.length, `${p} twitter 无图`).toBeGreaterThan(0);
    }
  });

  it("pageUrl 对首页产出以 / 结尾的规范形，子页不带尾斜杠", () => {
    expect(pageUrl("/")).toBe(`${SITE_URL}/`);
    expect(pageUrl("/services")).toBe(`${SITE_URL}/services`);
  });
});

describe("A7 · LocalBusiness 结构化数据", () => {
  const jsonLdHtml = () => readHtml("/");

  /** 从 HTML 里抠出第一个 application/ld+json 脚本内容并解析 */
  function extractJsonLd(html: string): Record<string, unknown> {
    const m = html.match(
      /<script type="application\/ld\+json">([\s\S]*?)<\/script>/,
    );
    expect(m, "产物中没有找到 application/ld+json 脚本").not.toBeNull();
    const raw = m![1]
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, "&")
      .replace(/&#x27;/g, "'")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">");
    return JSON.parse(raw) as Record<string, unknown>;
  }

  it("首页产物中存在可解析的 JSON-LD，且 @type 同时声明 LocalBusiness", () => {
    const ld = extractJsonLd(jsonLdHtml());
    expect(ld["@context"]).toBe("https://schema.org");
    const types = ld["@type"];
    expect(Array.isArray(types)).toBe(true);
    expect(types as string[]).toContain("LocalBusiness");
  });

  it("★ 负向断言：不得出现 aggregateRating / review / award 等无出处字段", () => {
    const html = jsonLdHtml();
    const ld = extractJsonLd(html);
    const flat = JSON.stringify(ld);

    for (const forbidden of ["aggregateRating", "review", "ratingValue", "award"]) {
      expect(flat, `结构化数据里出现了无出处字段 ${forbidden}`).not.toContain(
        `"${forbidden}"`,
      );
    }
  });

  it("★ 负向断言：整个产物 HTML 不得出现评分/评价标记", () => {
    const html = jsonLdHtml();
    for (const forbidden of ["aggregateRating", "ratingValue", "reviewCount"]) {
      expect(html, `产物 HTML 里出现了 ${forbidden}`).not.toContain(forbidden);
    }
  });

  it("电话 / 邮箱 / 成立日期与材料（lib/company.ts）逐字一致", () => {
    const ld = extractJsonLd(jsonLdHtml());
    expect(ld.telephone).toBe(COMPANY.phone);
    expect(ld.email).toBe(COMPANY.email);
    expect(ld.foundingDate).toBe(COMPANY.foundedOn);
    expect(ld.name).toBe(COMPANY.name);
    expect(ld.legalName).toBe(COMPANY.name);
  });

  it("PostalAddress 完整且 addressRegion 为重庆市", () => {
    const ld = extractJsonLd(jsonLdHtml());
    const addr = ld.address as Record<string, string>;
    expect(addr["@type"]).toBe("PostalAddress");
    expect(addr.addressCountry).toBe("CN");
    expect(addr.addressRegion).toBe("重庆市");
    expect(addr.addressLocality).toBe("大足区");
    expect(addr.streetAddress.length).toBeGreaterThan(4);
    // 完整地址必须是州/区/街道三段拼接后能被 COMPANY.address 覆盖
    expect(COMPANY.address).toContain(addr.streetAddress.replace(/187号附50号$/, ""));
  });

  it("knowsAbout 里的每一条都能在经营范围原文中找到（不许自造业务）", () => {
    const ld = extractJsonLd(jsonLdHtml());
    const knows = ld.knowsAbout as string[];
    expect(knows.length).toBeGreaterThan(0);
    const bad = knows.filter((k) => !BUSINESS_SCOPE_TEXT.includes(k));
    expect(bad, `经营范围里找不到这些业务：${bad.join(" / ")}`).toEqual([]);
  });
});

describe("A7 · 产物级 SEO 标记", () => {
  it("5 个页面的产物 HTML 都真实落地了 canonical 与 og:image", () => {
    const problems: string[] = [];
    for (const p of ALL_PAGES) {
      const html = readHtml(p);
      const url = pageUrl(p);
      if (!html.includes(`rel="canonical"`) || !html.includes(url)) {
        problems.push(`${p} 缺 canonical(${url})`);
      }
      if (!html.includes("/images/og-cover.jpg")) {
        problems.push(`${p} 缺 og:image`);
      }
    }
    expect(problems, problems.join("\n")).toEqual([]);
  });

  it("每页 <title> 非空、唯一，且不含重复拼接的站名", () => {
    const titles = new Map<string, string>();
    for (const p of ALL_PAGES) {
      const html = readHtml(p);
      const m = html.match(/<title>([\s\S]*?)<\/title>/);
      expect(m, `${p} 没有 <title>`).not.toBeNull();
      const title = m![1].trim();
      expect(title.length, `${p} 的 title 为空`).toBeGreaterThan(0);

      // 站名在 title 中最多出现一次
      const occurrences = title.split(SITE_NAME).length - 1;
      expect(occurrences, `${p} 的 title 重复拼接了站名：${title}`).toBeLessThanOrEqual(1);

      titles.set(p, title);
    }
    expect(new Set(titles.values()).size, "有页面 <title> 重复").toBe(ALL_PAGES.length);
  });

  it("首页 <title> 同时包含站名与定位语", () => {
    const html = readHtml("/");
    const title = html.match(/<title>([\s\S]*?)<\/title>/)![1];
    expect(title).toContain(SITE_NAME);
    expect(title).toContain("建筑劳务分包");
  });

  it("<html lang=\"zh-CN\">", () => {
    for (const p of ALL_PAGES) {
      expect(readHtml(p), `${p} 的 lang 不是 zh-CN`).toContain('<html lang="zh-CN"');
    }
  });
});

describe("A7 · sitemap 与 robots", () => {
  it("sitemap.xml 由构建产出，且含全部 5 个绝对 URL、无重复", () => {
    const file = path.join(SERVER_APP, "sitemap.xml.body");
    expect(fs.existsSync(file), `缺少 ${path.relative(ROOT, file)}`).toBe(true);
    const xml = fs.readFileSync(file, "utf8");

    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
    expect(locs.length, `sitemap 里应有 ${ALL_PAGES.length} 条 URL`).toBe(ALL_PAGES.length);
    expect(new Set(locs).size, "sitemap 有重复 URL").toBe(locs.length);

    for (const p of ALL_PAGES) {
      expect(locs, `sitemap 缺 ${p}`).toContain(pageUrl(p));
    }
    expect(locs.every((u) => u.startsWith("http"))).toBe(true);
    expect(xml).toContain("<urlset");
  });

  it("sitemap 不包含错误页或带查询参数的 URL", () => {
    const xml = fs.readFileSync(path.join(SERVER_APP, "sitemap.xml.body"), "utf8");
    expect(xml).not.toContain("_not-found");
    expect(xml).not.toContain("404");

    // ⚠️ 只检查 <loc> 里的值，不能对整份 XML 断言不含 "?" ——
    // XML 声明 `<?xml version="1.0"?>` 本身就带一个问号，会把断言误伤。
    // 这个坑实测踩过一次（断言写着 not.toContain("?")，失败信息却是
    // 'expected "<?xml version=..." not to contain "?"'）。
    const undefinedOrQuery = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
      .map((m) => m[1].trim())
      .filter((u) => u.includes("?") || u.includes("#"));
    expect(
      undefinedOrQuery,
      `sitemap 含查询串/锚点 URL：${undefinedOrQuery.join(" / ")}`,
    ).toEqual([]);
  });

  it("robots.txt 允许全站抓取并指向 sitemap", () => {
    const file = path.join(SERVER_APP, "robots.txt.body");
    expect(fs.existsSync(file), `缺少 ${path.relative(ROOT, file)}`).toBe(true);
    const txt = fs.readFileSync(file, "utf8");

    expect(txt).toMatch(/User-Agent:\s*\*/i);
    expect(txt).toMatch(/Allow:\s*\//);
    expect(txt).not.toMatch(/Disallow:\s*\/\s*$/m);
    expect(txt).toContain(`${SITE_URL}/sitemap.xml`);
  });

  it("★ 不与 public/robots.txt 冲突（两者都产出 /robots.txt）", () => {
    const conflict = path.join(ROOT, "public", "robots.txt");
    expect(
      fs.existsSync(conflict),
      "public/robots.txt 与 app/robots.ts 会同时产出 /robots.txt，必须删除其一",
    ).toBe(false);
  });
});

describe("A7 · 静态生成确认（PRD §7.2）", () => {
  it("5 条路由的产物都是预渲染 HTML（存在对应 .html 文件）", () => {
    const missing: string[] = [];
    for (const p of ALL_PAGES) {
      const file = path.join(
        SERVER_APP,
        p === "/" ? "index.html" : `${p.slice(1)}.html`,
      );
      if (!fs.existsSync(file)) missing.push(p);
    }
    expect(missing, `未预渲染（可能是动态路由）：${missing.join(" / ")}`).toEqual([]);
  });

  it("产物中不含运行时动态标记（无 useSearchParams 导致的 bailout 提示）", () => {
    for (const p of ALL_PAGES) {
      const html = readHtml(p);
      expect(html, `${p} 出现了动态渲染兜底`).not.toContain("Bail out to client-side rendering");
    }
  });

  it("LocalBusiness JSON-LD 在全部 5 页都存在（不只首页）", () => {
    for (const p of ALL_PAGES) {
      const html = readHtml(p);
      expect(html, `${p} 缺 JSON-LD`).toContain('type="application/ld+json"');
    }
  });
});
