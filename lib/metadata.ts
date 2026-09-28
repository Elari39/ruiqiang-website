/**
 * 逐页 metadata 构造器（PRD §7.6）
 *
 * 为什么要有这个函数，而不是每页手写一个 metadata 对象：
 *   手写时最常漏的两项是 `alternates.canonical` 与 `openGraph.url`，
 *   而它们恰恰是搜索引擎判定"这两页是不是同一篇"的依据。
 *   统一构造可以保证 5 页的元数据形状完全一致，漏项变成不可能。
 *
 * title 的处理：
 *   这里返回的是**不含站名的短标题**，交给 app/layout.tsx 的
 *   `title.template = "%s｜重庆锐强建筑劳务有限公司"` 去拼。
 *   首页例外 —— 它自己就是完整标题（模板对首页不生效的写法见 layout）。
 */
import type { Metadata } from "next";
import { PAGE_META, SITE_NAME, SITE_URL, pageUrl, type PagePath } from "@/lib/site";

export function buildMetadata(pathname: PagePath): Metadata {
  const { title, description } = PAGE_META[pathname];
  const url = pageUrl(pathname);

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      locale: "zh_CN",
      siteName: SITE_NAME,
      url,
      title,
      description,
      // 分享卡片用真实工程实拍图（A2 产出的 1280×720 裁切版）
      images: [
        {
          url: `${SITE_URL}/images/og-cover.jpg`,
          width: 1280,
          height: 720,
          alt: `${SITE_NAME}施工现场记录`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${SITE_URL}/images/og-cover.jpg`],
    },
  };
}
