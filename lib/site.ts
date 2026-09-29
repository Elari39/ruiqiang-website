/**
 * 站点级配置：URL、导航、以及**逐页元数据的唯一来源**。
 *
 * SITE_URL 是换域名时唯一需要改的地方 —— 改 PRODUCTION_SITE_URL 一处即可，
 * 或用 NEXT_PUBLIC_SITE_URL 覆盖（两者都不必改别的文件）。
 *
 * ## 为什么把每页 title/description 集中在这里
 *
 * PRD §7.6 要求"每页 `<title>` 与 `description` 唯一"。如果把它们散落在
 * 5 个 page.tsx 里，靠人去比对是否重复，迟早会出现两页撞车。
 * 集中成一张表之后，"唯一性"就成了一个可以被测试直接断言的属性
 * （见 tests/seo.test.ts：把数组去重后长度必须不变）。
 */
import { COMPANY } from "@/lib/company";

/** 本地开发 / 测试用的缺省基址 */
export const LOCAL_SITE_URL = "http://localhost:3000";

/**
 * 生产站点绝对 URL。
 *
 * ## 为什么把域名写成代码常量，而不是只认平台环境变量
 *
 * 这是**真实事故的修复**（2026-09-28 线上取证）：当时 `SITE_URL` 在环境变量缺失时
 * 回落 `http://localhost:3000`，而 Netlify 侧的 `NEXT_PUBLIC_SITE_URL` 没有生效，
 * 于是线上的 canonical、og:url、og:image、sitemap.xml、robots.txt **全部**指向
 * `http://localhost:3000`：搜索引擎被指向一个不存在的域名，微信分享没有封面图，
 * sitemap 上报了 5 个死链。整站 SEO 元数据静默失效，页面却看着完全正常。
 *
 * 根因不是"某次忘了配变量"，而是**设计层面的静默失败**：
 * 一个纯靠人工配置的必填项，漏配的后果是"悄悄上线错值"而不是"构建报错"。
 * 因此改为：
 *   - 域名以常量内置 → 漏配环境变量时生产构建产出**正确**值；
 *   - 环境变量降级为可选覆盖 → 换域名、预览环境仍可覆盖；
 *   - 生产构建里出现非 https / localhost 的覆盖值 → **直接抛错终止构建**
 *     （见 resolveSiteUrl）。宁可不部署，也不要再上线一次 localhost。
 *
 * 换域名时**改这一行**即可，或设 `NEXT_PUBLIC_SITE_URL`。
 */
export const PRODUCTION_SITE_URL = "https://ruiqiang-jianzhu.netlify.app";

/**
 * 生产构建允许的基址形态：必须是「干净的 https origin」——
 * 协议为 https，且除协议+主机（+非默认端口）之外**什么都不带**
 * （不带路径、查询串、锚点、尾斜杠）。
 *
 * 为什么不写成正则：`/^https:\/\/[^/]+$/` 之类看起来够用，但 `[^/]` 放行了
 * `?` 与 `#`，于是 `https://example.com?x=1` 会被误判为合法（这正是实测踩到的）。
 * 交给 URL 解析器判断 origin 是否与整串相等，才真正等价于"干净的 origin"。
 */
function isCleanHttpsOrigin(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "https:" && u.origin === value;
  } catch {
    return false;
  }
}

/** 本机地址形态（含 `https://localhost` 这种伪装成 https 的写法） */
const LOCAL_HOST_PATTERN = /^https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i;

/**
 * 解析站点绝对 URL。抽成纯函数，使"三种运行环境 + 非法覆盖值"可被穷举单测。
 *
 * 为什么参数是拆开的两项、而不是直接吃 `process.env` 对象：
 *   Next 只对 `process.env.XXX` 这种**直接成员表达式**做构建期静态替换。
 *   一旦把 `process.env` 整个对象传进函数，客户端包里就拿不到值了
 *   （`lib/site.ts` 会被 `SiteHeader` 这类客户端组件 import，不能踩这个坑）。
 *   所以调用处逐项取值，函数本身保持纯粹。
 *
 * 规则：
 *   1. 显式给了 NEXT_PUBLIC_SITE_URL → 用它（去空格、去尾斜杠）；
 *      但生产构建里它必须是 `https://` 开头的纯 origin，否则抛错。
 *   2. 没给 + 生产构建（next build 时 NODE_ENV==="production"）→ PRODUCTION_SITE_URL
 *   3. 没给 + 开发 / 测试 → LOCAL_SITE_URL
 */
export function resolveSiteUrl(
  explicit: string | undefined,
  nodeEnv: string | undefined,
): string {
  const value = explicit?.trim();

  if (value) {
    const normalized = value.replace(/\/+$/, "");

    /*
     * 只允许「https://主机名」这一形态：不允许 http、不允许本机地址、
     * 不允许带路径或查询串。这道闸门存在的唯一理由是：
     * 错值一旦进了产物，就只会以"页面看起来正常"的方式静默泄漏到线上。
     * 让它在这里响亮地失败，是唯一可靠的防线。
     */
    if (nodeEnv === "production") {
      const reason = LOCAL_HOST_PATTERN.test(normalized)
        ? "它指向本机地址（localhost / 127.0.0.1）"
        : !isCleanHttpsOrigin(normalized)
          ? "它不是干净的 https://主机名（可能用了 http、漏了协议头，或带了路径/查询串/锚点）"
          : null;

      if (reason) {
        throw new Error(
          `NEXT_PUBLIC_SITE_URL 不能用于生产构建：「${value}」——${reason}。\n` +
            `它会决定 canonical / og:url / og:image / sitemap.xml / robots.txt 的基址，` +
            `写错就会让整站 SEO 元数据指向错误域名（本项目线上真实发生过）。\n` +
            `若不需要自定义域名，请**删除**这个环境变量 —— 构建会自动使用 ` +
            `内置的 ${PRODUCTION_SITE_URL}。`,
        );
      }
    }

    return normalized;
  }

  return nodeEnv === "production" ? PRODUCTION_SITE_URL : LOCAL_SITE_URL;
}

/**
 * 本进程实际使用的站点基址。
 *
 * ⚠️ 注意与"产物里的基址"可能不同：
 *   vitest 的 NODE_ENV 是 `test`，所以测试进程里这里是 localhost；
 *   而 `next build` 的 NODE_ENV 是 `production`，产物里是 PRODUCTION_SITE_URL。
 *   因此**读构建产物的断言不能拿 SITE_URL 去比对**，要用
 *   `resolveSiteUrl(NEXT_PUBLIC_SITE_URL, "production")`（见 tests/seo.test.ts）。
 */
export const SITE_URL = resolveSiteUrl(
  process.env.NEXT_PUBLIC_SITE_URL,
  process.env.NODE_ENV,
);

export const SITE_NAME = "重庆锐强建筑劳务有限公司";

/** 一句话定位（PRD §4.1 首屏）—— 措辞取自经营范围，不含无出处修饰 */
export const SITE_TAGLINE = "建筑劳务分包与工程施工服务商";

export const NAV_ITEMS = [
  { href: "/", label: "首页" },
  { href: "/services", label: "服务项目" },
  { href: "/gallery", label: "工程实拍" },
  { href: "/about", label: "关于我们" },
  { href: "/contact", label: "联系我们" },
] as const;

export type NavItem = (typeof NAV_ITEMS)[number];

/**
 * 逐页 SEO 元数据表（PRD §7.6）。
 *
 * 每条 description 都只包含可回溯到材料的事实（成立日期、注册地、
 * 经营范围条目、联系方式），不写"优质服务""多年经验"这类无出处修辞（PRD §7.7）。
 */
export const PAGE_META = {
  "/": {
    title: `${SITE_NAME}｜${SITE_TAGLINE}`,
    description:
      `${SITE_NAME}成立于 2023 年 6 月 30 日，注册地位于${COMPANY.address}，` +
      `经营建筑劳务分包、建设工程施工、施工专业作业、建设工程设计、` +
      `住宅室内装饰装修、园林绿化工程施工等业务。联系电话 ${COMPANY.phone}。`,
  },
  "/services": {
    title: "服务项目",
    description:
      `${SITE_NAME}服务项目：建筑劳务分包、建设工程施工、施工专业作业、` +
      `建设工程设计、住宅室内装饰装修、建设工程监理，以及工程管理服务、` +
      `装卸搬运、园林绿化工程施工、建筑材料销售、机械设备租赁等配套服务。`,
  },
  "/gallery": {
    title: "工程实拍",
    description:
      `${SITE_NAME}施工现场记录：底板钢筋绑扎完成面、施工人员在钢筋网上作业、` +
      `钢结构厂房内楼板钢筋绑扎、大面积钢筋网施工等作业面实拍照片。`,
  },
  "/about": {
    title: "关于我们",
    description:
      `${SITE_NAME}成立于 2023 年 6 月 30 日，注册地位于${COMPANY.address}，` +
      `法定代表人${COMPANY.legalRepresentative}，企业类型${COMPANY.companyType}，` +
      `注册资本 ${COMPANY.registeredCapitalWan} 万元，经营状态${COMPANY.status}。`,
  },
  "/contact": {
    title: "联系我们",
    description:
      `${SITE_NAME}联系方式：电话 ${COMPANY.phone}，邮箱 ${COMPANY.email}，` +
      `注册地址${COMPANY.address}。手机点击电话即可直接拨号。`,
  },
} as const;

export type PagePath = keyof typeof PAGE_META;

/** 拼出页面绝对 URL（sitemap 与 canonical 都用它） */
export function pageUrl(pathname: string): string {
  return pathname === "/" ? `${SITE_URL}/` : `${SITE_URL}${pathname}`;
}
