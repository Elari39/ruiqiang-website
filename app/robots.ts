import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/**
 * robots.txt（PRD §6.1 / §7.6）
 *
 * ⚠️ 与 `public/robots.txt` **不可共存**：两者都产出 /robots.txt，会冲突。
 *   本文件是唯一来源，`public/robots.txt` 不存在。
 *   （tests/seo.test.ts 有一条断言专门盯这个问题。）
 *
 * 策略：全站允许抓取。这是对外展示型官网，没有需要保护的内容 ——
 * 唯一的禁发项（营业执照照片）根本不在产物里，无需靠 robots 隐藏。
 * 用 robots 去"藏"已经在网上的东西是无效的，真正的防线是 A2 的发布白名单。
 *
 * ⚠️ 不输出 `host` 字段：那是 Yandex 专用指令，其余主流引擎都不读；
 *    而 Next 会把它渲染成 `Host:` 行。少写一个没人消费的字段，
 *    比写一个"看着专业但实际无效"的字段更诚实。
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
