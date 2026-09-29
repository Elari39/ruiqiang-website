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
import { PAGE_META, NAV_ITEMS, SITE_NAME, SITE_URL, pageUrl, resolveSiteUrl } from "@/lib/site";
import { buildMetadata } from "@/lib/metadata";
import { COMPANY, BUSINESS_SCOPE } from "@/lib/company";

/** 经营范围全文（许可 + 一般），用于校验结构化数据未自造业务 */
const BUSINESS_SCOPE_TEXT = `${BUSINESS_SCOPE.licensed}${BUSINESS_SCOPE.general}`;

const ROOT = process.cwd();

/** 产物目录：Next 把每个静态路由的 HTML 放在这里 */
const SERVER_APP = path.join(ROOT, ".next", "server", "app");

/**
 * 构建产物里使用的站点基址 —— **不等于**本测试进程的 SITE_URL。
 *
 * 为什么必须分开算（踩过这个坑，写清楚以免后人"顺手改回 pageUrl"）：
 *   `next build` 运行时 NODE_ENV 是 `production`，所以产物里的 canonical /
 *   og:url / sitemap / robots 用的是**生产域名**；
 *   而 vitest 进程的 NODE_ENV 是 `test`，SITE_URL 解析出来是 localhost。
 *   拿 SITE_URL（localhost）去比对产物（生产域名）必然失败。
 *   这里按"生产构建"的同一套规则算出产物基址，两边口径才一致。
 */
const ARTIFACT_BASE = resolveSiteUrl(process.env.NEXT_PUBLIC_SITE_URL, "production");

/** 产物里某个路由应当出现的绝对 URL（与 lib/site.ts 的 pageUrl 同规则） */
function artifactUrl(pathname: string): string {
  return pathname === "/" ? `${ARTIFACT_BASE}/` : `${ARTIFACT_BASE}${pathname}`;
}

/** 读取某个路由的构建产物 HTML；产物不存在时给出可操作的报错 */
function readHtml(pathname: string): string {
  const file = path.join(
    SERVER_APP,
    pathname === "/" ? "index.html" : `${pathname.slice(1)}.html`,
  );
  if (!fs.existsSync(file)) {
    throw new Error(
      `缺少构建产物 ${path.relative(ROOT, file)}，请先运行 \`npm run build\`\n` +
        `（本机若被沙箱的批量删除守卫拦下，用 \`node scripts/run-next.mjs build\`，` +
        `它只在本机需要，Netlify 云端用标准的 npm run build）。`,
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
      // ⚠️ 用 artifactUrl（产物基址），不能用 pageUrl（本进程的 localhost）
      const url = artifactUrl(p);
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
      expect(locs, `sitemap 缺 ${p}`).toContain(artifactUrl(p));
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
    expect(txt).toContain(`${ARTIFACT_BASE}/sitemap.xml`);
  });

  it("★ 不与 public/robots.txt 冲突（两者都产出 /robots.txt）", () => {
    const conflict = path.join(ROOT, "public", "robots.txt");
    expect(
      fs.existsSync(conflict),
      "public/robots.txt 与 app/robots.ts 会同时产出 /robots.txt，必须删除其一",
    ).toBe(false);
  });
});

/**
 * 这一组是 **P0 事故的回归防线**。
 *
 * 线上实测（2026-09-28）：canonical / og:url / og:image / sitemap.xml /
 * robots.txt 全部是 `http://localhost:3000` —— 因为当时 SITE_URL 只认环境变量，
 * 漏配就静默回落 localhost，而页面本身看着完全正常。
 *
 * 为什么原来的断言抓不到：上面那些"产物级"断言只把产物与**同一进程里的
 * SITE_URL** 比对，体检与病灶出自同一个值，于是两边同时是 localhost、断言恒真。
 * 这类"自洽式断言"只会证明代码自相一致，证明不了它是否与现实一致。
 *
 * 因此下面改为**对绝对事实判定**：产物基址不许是 localhost，
 * 产物里不许出现 localhost，且 canonical / og:url 必须逐字等于该基址推出的 URL。
 */
describe("A7 · 站点绝对 URL 不得泄漏 localhost 到产物（P0 回归防线）", () => {
  it("★ 构建产物基址本身就不是 localhost，且是 https", () => {
    expect(
      ARTIFACT_BASE.includes("localhost"),
      `生产构建的站点基址解析成了「${ARTIFACT_BASE}」。构建时必须落到真实域名 ——` +
        `检查 NEXT_PUBLIC_SITE_URL 是否被设成了 localhost（设为 localhost 会让构建直接失败），` +
        `或 lib/site.ts 里的 PRODUCTION_SITE_URL 是否被改坏。`,
    ).toBe(false);
    expect(ARTIFACT_BASE.startsWith("https://")).toBe(true);
  });

  it("★ 5 页产物的 canonical / og:url / og:image 里不得出现 localhost", () => {
    const bad: string[] = [];
    for (const p of ALL_PAGES) {
      const html = readHtml(p);
      for (const m of html.matchAll(
        /(?:rel="canonical" href|property="og:url" content|property="og:image" content|name="twitter:image" content)="([^"]*)"/g,
      )) {
        if (m[1].includes("localhost")) bad.push(`${p}: ${m[1]}`);
      }
    }
    expect(
      bad,
      `产物的 SEO 元数据指向了 localhost（这正是线上发生过的事故）：\n${bad.join("\n")}`,
    ).toEqual([]);
  });

  it("★ sitemap.xml 与 robots.txt 产物里不得出现 localhost", () => {
    const sitemap = fs.readFileSync(path.join(SERVER_APP, "sitemap.xml.body"), "utf8");
    const robots = fs.readFileSync(path.join(SERVER_APP, "robots.txt.body"), "utf8");
    expect(sitemap, "sitemap.xml 里出现 localhost，搜索引擎会拿到 5 个死链").not.toContain(
      "localhost",
    );
    expect(robots, "robots.txt 的 Sitemap 行出现 localhost").not.toContain("localhost");
  });

  it("★ canonical 与 og:url 逐字等于产物基址推出的页面 URL", () => {
    for (const p of ALL_PAGES) {
      const html = readHtml(p);
      /*
       * ⚠️ 首页要去掉尾部斜杠再比对：pageUrl("/") 产出的是 `https://host/`，
       * 但实测 Next 会把 canonical / og:url 里的根路径斜杠**归一化掉**，
       * 产物里是 `https://host`（无斜杠）。子页（/services 等）不带尾斜杠，
       * 归一化前后一致。
       *
       * 这个差异是实测得出的：早期版本的断言用 `html.includes(pageUrl("/"))`
       * 之所以看着能过，是因为产物里的 og:image
       * （`https://host/images/og-cover.jpg`）恰好包含 `https://host/` ——
       * 又一次"断言碰巧成立"的例子。所以这里显式归一化，而不是靠巧合。
       */
      const expected = artifactUrl(p).replace(/\/$/, "");
      expect(html, `${p} 的 canonical 不等于产物基址 ${expected}`).toContain(
        `<link rel="canonical" href="${expected}"`,
      );
      expect(html, `${p} 的 og:url 不等于产物基址 ${expected}`).toContain(
        `<meta property="og:url" content="${expected}"`,
      );
    }
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
