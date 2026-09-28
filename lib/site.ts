/**
 * 站点级配置：URL、导航、页面元数据。
 *
 * SITE_URL 是换域名时**唯一**需要改的地方（读环境变量）。部署后若忘记设置
 * NEXT_PUBLIC_SITE_URL，sitemap.xml 与 og:url 会残留 localhost，务必回填。
 */

/** 正式站点地址。部署后在平台环境变量中设置 NEXT_PUBLIC_SITE_URL。 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
).replace(/\/$/, "");

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
