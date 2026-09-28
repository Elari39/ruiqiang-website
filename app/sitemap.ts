import type { MetadataRoute } from "next";
import { NAV_ITEMS, pageUrl } from "@/lib/site";

/**
 * sitemap.xml（PRD §6.1 / §7.6）
 *
 * 由 Next 在构建期生成为**静态文件**，不影响路由的静态性判定。
 *
 * 只收录 NAV_ITEMS 里的 5 个正式页面。
 * 不收录 `/_not-found`、也不收录任何带查询参数的地址 ——
 * sitemap 里放无效 URL 会拉低整站的可信度。
 *
 * lastModified 做法说明：
 *   这里刻意用**构建时间**而不是"内容修改时间"。本项目没有 CMS，
 *   无法逐页得知真实修改时间；而搜索引擎对"每次构建都说内容变了"
 *   会逐渐降低 lastModified 的权重。用构建时间是诚实且可解释的：
 *   它表示"这份站点产物在此时刻被重新生成过"。
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return NAV_ITEMS.map((item) => ({
    url: pageUrl(item.href),
    lastModified,
    // 首页权重最高，其余并列
    priority: item.href === "/" ? 1 : 0.8,
    changeFrequency: "monthly" as const,
  }));
}
