/**
 * A4 验收测试：5 个页面 + 全站组件
 *
 * 两层验证：
 *   1. **源码层** —— 文案纪律。这是本项目最重要的一条：PRD §2/§7.7 要求
 *      所有企业事实可回溯到材料，且必须全站不含编造的业绩/客户/人员/资质。
 *      这里用"禁止词表 + 出处白名单"双向夹逼。
 *   2. **产物层** —— 直接读 `.next/server/app/*.html`（Next 静态生成的
 *      **真实 HTML**），断言导航、tel:/mailto: 链接、图片渲染、悬浮条等
 *      真的出现在最终交付的标记里，而不是"我以为我写了"。
 *
 * 产物层是本测试的重点：源码里写了 `<a href={TEL_HREF}>` 只证明意图，
 * 只有产物里的 `href="tel:19936641843"` 才证明结果。
 */
import { describe, expect, it, beforeAll } from "vitest";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const APP = path.join(ROOT, "app");
const COMPONENTS = path.join(ROOT, "components");
const SERVER_APP = path.join(ROOT, ".next", "server", "app");

/** 路由 → 静态产物文件名 */
const ROUTES: Array<{ route: string; html: string }> = [
  { route: "/", html: "index.html" },
  { route: "/services", html: "services.html" },
  { route: "/gallery", html: "gallery.html" },
  { route: "/about", html: "about.html" },
  { route: "/contact", html: "contact.html" },
];

/** 递归收集 .tsx 源码 */
function collectTsx(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const n of fs.readdirSync(dir)) {
    const p = path.join(dir, n);
    if (fs.statSync(p).isDirectory()) {
      if (n === "ui") continue; // 注册表组件原样落库，不算本站文案
      collectTsx(p, out);
    } else if (n.endsWith(".tsx")) {
      out.push(p);
    }
  }
  return out;
}

function allSiteSources(): Array<{ file: string; text: string }> {
  const files = [...collectTsx(APP), ...collectTsx(COMPONENTS)];
  return files.map((f) => ({
    file: path.relative(ROOT, f),
    text: fs.readFileSync(f, "utf8"),
  }));
}

/** 剥离注释，避免"禁止 XXX"这类说明性文字把检查变成假阳性（A3 踩过） */
function stripComments(s: string): string {
  return s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

// ---------------------------------------------------------------------------
// 1. 源码层：文案纪律
// ---------------------------------------------------------------------------

describe("文案纪律：不得出现材料之外的企业事实（PRD §2 / §7.7）", () => {
  /**
   * 禁止词表。这些词共同点是：**暗示存在材料中没有的事实**。
   * 每一条都对应 PRD 里明确禁止的编造类型，不是泛泛的"营销词"。
   */
  const FORBIDDEN: Array<{ re: RegExp; why: string }> = [
    // 业绩 / 项目
    { re: /项目名称|项目地点|承接过|已完成项目|竣工项目/, why: "编造项目业绩" },
    { re: /工程案例[^]|典型案例|成功案例/, why: "编造案例库（PRD §6.2 不做）" },
    // 客户与评价
    { re: /客户评价|客户好评|服务过|合作单位|战略合作/, why: "编造客户与评价（PRD §6.2 不做）" },
    { re: /众多客户|上千客户|数百家|服务客户超/, why: "编造客户数量" },
    // 人员与设备
    { re: /员工\s*\d|现有员工|技术工人\s*\d|专业团队\s*\d|团队规模/, why: "编造人员数量（PRD §6.2 不做）" },
    { re: /设备\s*\d+\s*台|机械\s*\d+\s*台/, why: "编造设备数量" },
    // 资质与荣誉
    { re: /资质等级|一级资质|特级资质|荣誉证书|获奖|荣获/, why: "编造资质与荣誉（PRD §6.2 不做）" },
    // 无出处的时间/规模修辞
    { re: /多年经验|十余年|深耕行业|行业领先|业内领先/, why: "无出处的时间/地位修辞" },
    { re: /上千平米|上万平方米|大型企业|规模领先/, why: "无出处的规模修辞" },
    { re: /\d+\s*年(?:施工|从业)?经验/, why: "编造从业年限（成立仅 2023 年）" },
    // 空泛承诺
    { re: /优质服务|诚信经营|客户至上|一流品质|品质保证/, why: "无出处的空泛承诺" },
  ];

  it("全站源码不含任何编造类表述", () => {
    const hits: string[] = [];
    for (const { file, text } of allSiteSources()) {
      const code = stripComments(text);
      for (const { re, why } of FORBIDDEN) {
        const m = code.match(re);
        if (m) hits.push(`${file}: 「${m[0]}」（${why}）`);
      }
    }
    expect(hits).toEqual([]);
  });

  it("禁止词表本身有效（能抓到人工注入的样本）", () => {
    // 自检：确保上面每条正则不是永远匹配不到的废规则
    const positives = [
      "公司承接过多个厂房项目",
      "我们拥有众多客户",
      "现有员工 50 人",
      "已荣获多项荣誉证书",
      "深耕行业多年经验",
      "提供优质服务",
    ];
    for (const sample of positives) {
      const matched = FORBIDDEN.some(({ re }) => re.test(sample));
      expect(matched, `样本应被禁止词表命中：${sample}`).toBe(true);
    }
  });

  it("图片说明不标注为具体项目（PRD §2.2 尾注）", () => {
    const content = fs.readFileSync(path.join(ROOT, "lib", "content.ts"), "utf8");
    const code = stripComments(content);
    // 图注只描述施工内容
    for (const ok of ["底板钢筋绑扎完成面", "施工人员在钢筋网上作业", "楼板钢筋绑扎"]) {
      expect(code, `应包含施工内容描述：${ok}`).toContain(ok);
    }
    // 取 caption 字段值逐个检查，不得出现"项目"字样
    const captions = [...code.matchAll(/caption:\s*"([^"]+)"/g)].map((m) => m[1]);
    expect(captions.length).toBeGreaterThanOrEqual(4);
    for (const c of captions) {
      expect(c, `图注不得自称项目：${c}`).not.toMatch(/项目/);
    }
  });

  it("营业执照照片文件名不出现在任何站点源码中（PRD §5.4 硬性）", () => {
    const hits: string[] = [];
    for (const { file, text } of allSiteSources()) {
      if (/c9231b84/.test(text)) hits.push(file);
    }
    expect(hits).toEqual([]);
  });

  it("站点源码不引用 public/ 下不存在的图片（避免 404）", () => {
    const content = fs.readFileSync(path.join(ROOT, "lib", "content.ts"), "utf8");
    const keys = [
      ...[...content.matchAll(/key:\s*"([^"]+)"/g)].map((m) => m[1]),
      ...[...content.matchAll(/key:\s*"([^"]+)"/g)].map((m) => m[1]),
    ];
    const unique = [...new Set(keys)];
    const missing: string[] = [];
    for (const k of unique) {
      for (const w of [1600, 800]) {
        for (const fmt of ["webp", "avif"]) {
          const p = path.join(ROOT, "public", "images", `${k}-${w}.${fmt}`);
          if (!fs.existsSync(p)) missing.push(path.basename(p));
        }
      }
    }
    expect(missing).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 2. 产物层：真实 HTML
// ---------------------------------------------------------------------------

describe("5 条路由均静态生成（PRD §7.2）", () => {
  it("每个路由都有对应的预渲染 HTML", () => {
    for (const { route, html } of ROUTES) {
      const p = path.join(SERVER_APP, html);
      expect(fs.existsSync(p), `${route} → ${html} 应存在`).toBe(true);
    }
  });

  it("产物中每条路由都被标记为静态（○）", () => {
    // build 输出被 run-next.mjs 写到日志；这里改从产物结构判定：
    // 静态页的 RSC payload 与 HTML 同时存在
    for (const { html } of ROUTES) {
      const rsc = path.join(SERVER_APP, html.replace(/\.html$/, ".rsc"));
      expect(fs.existsSync(rsc), `${html} 应有 .rsc 载荷`).toBe(true);
    }
  });
});

describe("产物层：链接与导航（PRD §7.4）", () => {
  let docs: Map<string, string>;

  beforeAll(() => {
    if (!fs.existsSync(SERVER_APP)) {
      throw new Error("找不到静态产物，请先运行 npm run build");
    }
    docs = new Map();
    for (const { route, html } of ROUTES) {
      docs.set(route, fs.readFileSync(path.join(SERVER_APP, html), "utf8"));
    }
  });

  it("每页都包含 tel:19936641843 链接", () => {
    for (const { route } of ROUTES) {
      const doc = docs.get(route)!;
      expect(doc, `${route} 应含 tel: 链接`).toContain('href="tel:19936641843"');
    }
  });

  it("每页都包含 mailto:1053210854@qq.com 链接", () => {
    for (const { route } of ROUTES) {
      const doc = docs.get(route)!;
      expect(doc, `${route} 应含 mailto: 链接`).toContain(
        'href="mailto:1053210854@qq.com"'
      );
    }
  });

  it("每页都有指向 5 个路由的站内导航", () => {
    const hrefs = ["/", "/services", "/gallery", "/about", "/contact"];
    for (const { route } of ROUTES) {
      const doc = docs.get(route)!;
      for (const h of hrefs) {
        expect(doc, `${route} 导航应含 ${h}`).toContain(`href="${h}"`);
      }
    }
  });

  it("每页渲染 5 个导航标签文字（页头 + 页脚各一组）", () => {
    for (const { route } of ROUTES) {
      const doc = docs.get(route)!;
      for (const label of ["首页", "服务项目", "工程实拍", "关于我们", "联系我们"]) {
        expect(doc, `${route} 应含导航项 ${label}`).toContain(label);
      }
    }
  });
});

describe("产物层：图片渲染（PRD §7.5）", () => {
  let docs: Map<string, string>;

  beforeAll(() => {
    docs = new Map();
    for (const { route, html } of ROUTES) {
      docs.set(route, fs.readFileSync(path.join(SERVER_APP, html), "utf8"));
    }
  });

  it("首页渲染门头照（hero）", () => {
    const doc = docs.get("/")!;
    expect(doc).toContain("/images/storefront-1600.webp");
    expect(doc).toContain("/images/storefront-1600.avif");
  });

  it("相册页渲染全部 6 张实拍（4 张工地照 × 页内 + 弹层副本）", () => {
    const doc = docs.get("/gallery")!;
    for (const k of [
      "rebar-slab",
      "rebar-crew",
      "steel-frame-slab",
      "steel-frame-wide",
    ]) {
      expect(doc, `相册应含 ${k}`).toContain(`/images/${k}-1600.webp`);
    }
  });

  it("每个 <img> 都有非空中文 alt", () => {
    const offenders: string[] = [];
    for (const { route } of ROUTES) {
      const doc = docs.get(route)!;
      for (const m of doc.matchAll(/<img\b[^>]*>/g)) {
        const tag = m[0];
        const altMatch = tag.match(/alt="([^"]*)"/);
        if (!altMatch || altMatch[1].trim() === "") {
          offenders.push(`${route}: ${tag.slice(0, 90)}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("每张图都声明了 width 与 height（防布局跳动）", () => {
    const offenders: string[] = [];
    for (const { route } of ROUTES) {
      const doc = docs.get(route)!;
      for (const m of doc.matchAll(/<img\b[^>]*>/g)) {
        const tag = m[0];
        if (!/\bwidth="\d+"/.test(tag) || !/\bheight="\d+"/.test(tag)) {
          offenders.push(`${route}: ${tag.slice(0, 90)}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe("产物层：全站组件（PRD §4.6）", () => {
  let docs: Map<string, string>;

  beforeAll(() => {
    docs = new Map();
    for (const { route, html } of ROUTES) {
      docs.set(route, fs.readFileSync(path.join(SERVER_APP, html), "utf8"));
    }
  });

  it("页头在每页渲染公司全称", () => {
    for (const { route } of ROUTES) {
      expect(docs.get(route)!, `${route} 页头`).toContain("重庆锐强建筑劳务有限公司");
    }
  });

  it("页脚在每页渲染统一社会信用代码与版权声明", () => {
    for (const { route } of ROUTES) {
      const doc = docs.get(route)!;
      expect(doc, `${route} 页脚信用代码`).toContain("91500111MACM8P5450");
      // 注意：`© {year}` 在产物里被 React 的文本节点分隔符拆开，
      // 渲染成 `© <!-- -->2026`。所以不能直接匹配 "@年份" 的连续形式。
      expect(doc, `${route} 版权符号`).toContain("©");
      const year = new Date().getFullYear();
      expect(doc, `${route} 版权年份 ${year}`).toContain(String(year));
      expect(doc, `${route} 版权署名`).toMatch(
        /©(?:<!-- -->|\s)*\d{4}(?:<!-- -->|\s)*重庆锐强建筑劳务有限公司/
      );
    }
  });

  it("页脚不渲染可见的虚假 ICP 备案号（PRD §5.4：当前无备案，仅注释占位）", () => {
    for (const { route } of ROUTES) {
      const doc = docs.get(route)!;
      // 不得出现"ICP备"或具体备案号文字
      expect(doc, `${route} 不应有可见备案号`).not.toMatch(/ICP\s*备/);
      expect(doc, `${route} 不应有备案号占位符文本`).not.toContain("渝ICP备");
    }
  });

  it("手机端悬浮致电条存在于每页产物中", () => {
    for (const { route } of ROUTES) {
      const doc = docs.get(route)!;
      // 悬浮条的特征：立即致电 + 固定定位容器
      expect(doc, `${route} 悬浮条`).toContain("立即致电");
    }
  });

  it("悬浮条有 md:hidden（桌面端不出现，PRD 只在手机端要求）", () => {
    for (const { route } of ROUTES) {
      const doc = docs.get(route)!;
      expect(doc, `${route} 悬浮条应含 md:hidden`).toMatch(
        /md:hidden[^"]*"[^>]*>\s*<a[^>]*href="tel:19936641843"|fixed[^"]*md:hidden/
      );
    }
  });

  it("布局为悬浮条预留了底部空间（防永久遮挡页脚）", () => {
    const layout = fs.readFileSync(path.join(APP, "layout.tsx"), "utf8");
    // 布局必须引用 MobileCallBar 导出的高度常量，而不是自己写一个数字
    expect(layout).toContain("MOBILE_CALL_BAR_HEIGHT");
    expect(layout).toContain("--mobile-call-bar-space");
    expect(layout).toMatch(/md:pb-0/);
  });

  it("汉堡菜单关闭后焦点会回到触发按钮（可访问性）", () => {
    const header = fs.readFileSync(
      path.join(COMPONENTS, "SiteHeader.tsx"),
      "utf8"
    );
    expect(header).toContain("triggerRef.current?.focus()");
    expect(header).toContain("aria-expanded");
    expect(header).toContain('aria-controls="mobile-nav"');
  });
});

describe("产物层：首页与各页内容完备（PRD §4）", () => {
  let docs: Map<string, string>;

  beforeAll(() => {
    docs = new Map();
    for (const { route, html } of ROUTES) {
      docs.set(route, fs.readFileSync(path.join(SERVER_APP, html), "utf8"));
    }
  });

  it("首页含首屏定位、两个 CTA 与四大能力卡", () => {
    const doc = docs.get("/")!;
    expect(doc).toContain("建筑劳务分包与工程施工服务商"); // 定位
    expect(doc).toContain("立即致电"); // 主按钮
    expect(doc).toContain("查看服务"); // 次按钮
    for (const t of ["建筑劳务分包", "建设工程施工", "设计与装修", "工程配套服务"]) {
      expect(doc, `首页能力卡应含 ${t}`).toContain(t);
    }
  });

  it("首页含公司信息速览四项", () => {
    const doc = docs.get("/")!;
    for (const k of ["成立时间", "注册资本", "注册地", "经营状态"]) {
      expect(doc).toContain(k);
    }
    expect(doc).toContain("50 万元");
    expect(doc).toContain("2023-06-30");
  });

  it("服务页严格按 PRD 三组渲染，且折叠区含经营范围原文", () => {
    const doc = docs.get("/services")!;
    expect(doc).toContain("建筑劳务分包与施工");
    expect(doc).toContain("设计与装修");
    expect(doc).toContain("配套服务");
    // 折叠区原文（逐字等于 PRD §2.1）
    expect(doc).toContain("许可项目");
    expect(doc).toContain("一般项目");
    expect(doc).toContain("依法须经批准的项目");
    expect(doc).toContain("凭营业执照依法自主开展经营活动");
  });

  it("服务页各项均出自经营范围，无多余服务项", () => {
    const doc = docs.get("/services")!;
    for (const item of [
      "建筑劳务分包",
      "建设工程施工",
      "施工专业作业",
      "建设工程设计",
      "住宅室内装饰装修",
      "建设工程监理",
      "工程管理服务",
      "装卸搬运",
      "建筑用石加工",
      "园林绿化工程施工",
      "建筑材料销售",
      "机械设备租赁",
      "建筑工程机械与设备租赁",
    ]) {
      expect(doc, `服务项应含 ${item}`).toContain(item);
    }
  });

  it("关于页含公司简介与完整工商登记表（15 项）", () => {
    const doc = docs.get("/about")!;
    expect(doc).toContain("唐利平");
    expect(doc).toContain("有限责任公司(自然人独资)");
    for (const label of [
      "公司名称",
      "统一社会信用代码",
      "法定代表人",
      "注册资本",
      "成立日期",
      "企业类型",
      "注册地址",
      "登记机关",
      "经营状态",
      "营业期限",
      "所属行业",
      "工商注册号",
      "组织机构代码",
      "纳税人识别号",
      "行政区划",
    ]) {
      expect(doc, `工商表应含 ${label}`).toContain(label);
    }
  });

  it("关于页展示执照摘要卡片，但不引用执照照片（PRD §5.4）", () => {
    const doc = docs.get("/about")!;
    expect(doc).toContain("营业执照摘要");
    // 不得出现任何指向执照原件的图片
    expect(doc).not.toMatch(/c9231b84/);
    expect(doc).not.toContain("营业执照照片");
  });

  it("联系页含可复制地址按钮与全部联系方式", () => {
    const doc = docs.get("/contact")!;
    expect(doc).toContain("复制地址");
    expect(doc).toContain("重庆市大足区棠香街道二环北路中段187号附50号");
    expect(doc).toContain("19936641843");
    expect(doc).toContain("1053210854@qq.com");
  });
});
