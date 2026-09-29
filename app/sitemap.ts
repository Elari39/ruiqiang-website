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
 * ## 为什么不写 lastModified（改动过，勿"顺手加回来"）
 *
 * 原先用的是 `new Date()`（构建时间）。它的注释当时辩称"用构建时间是诚实的，
 * 表示这份产物在此刻被重新生成过"—— 但那个论证站不住：
 *   - `lastModified` 的语义是**内容**最后修改时间，不是"构建发生过"；
 *   - 本项目没有 CMS，逐页拿不到真实内容修改时间；
 *   - 后果是每次重新部署都宣称 5 个页面全部变了，而实际上文案可能一行没动。
 *     搜索引擎对"每次构建都说变了"的站点会逐渐**降低该字段的权重**，
 *     于是这个字段不但没带来信息，还把信号稀释掉了。
 *
 * 该字段在 sitemap 协议里是可选的，省略是合法且诚实的做法：
 * 与其给一个自己都知道不准的日期，不如不给。
 * 将来若接入按内容记录的日期，再加回来即可。
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return NAV_ITEMS.map((item) => ({
    url: pageUrl(item.href),
    // 首页权重最高，其余并列
    priority: item.href === "/" ? 1 : 0.8,
    changeFrequency: "monthly" as const,
  }));
}
