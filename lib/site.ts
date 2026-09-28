/**
 * 站点级配置：URL、导航、以及**逐页元数据的唯一来源**。
 *
 * SITE_URL 是换域名时唯一需要改的地方（读环境变量）。部署后若忘记设置
 * NEXT_PUBLIC_SITE_URL，sitemap.xml 与 og:url 会残留 localhost，务必回填。
 *
 * ## 为什么把每页 title/description 集中在这里
 *
 * PRD §7.6 要求"每页 `<title>` 与 `description` 唯一"。如果把它们散落在
 * 5 个 page.tsx 里，靠人去比对是否重复，迟早会出现两页撞车。
 * 集中成一张表之后，"唯一性"就成了一个可以被测试直接断言的属性
 * （见 tests/seo.test.ts：把数组去重后长度必须不变）。
 */
import { COMPANY } from "@/lib/company";

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
