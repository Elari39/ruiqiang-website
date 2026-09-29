import type { Metadata } from "next";
import { Archivo_Black, Space_Grotesk, Noto_Sans_SC } from "next/font/google";
import "./globals.css";
import { SITE_NAME, SITE_TAGLINE, SITE_URL, PAGE_META } from "@/lib/site";
import { COMPANY } from "@/lib/company";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { MobileCallBar, MOBILE_CALL_BAR_HEIGHT } from "@/components/MobileCallBar";

/*
 * 注意：shadcn init 会自动往本文件注入一个 `Geist` 字体并给它 `--font-sans`。
 * 本项目不需要 Geist（字体方案见下），已移除。若将来重跑 `shadcn init`，
 * 请再次检查本文件，勿让 Geist 覆盖 `--font-sans` 令牌。
 */
/*
 * 中英双字体配对（PRD §5.2）
 *
 * 拉丁字形：Archivo Black（标题）/ Space Grotesk（正文）—— 只含拉丁，体积小，全站常驻。
 * 汉字字形：Noto Sans SC —— 单个字重约 1 MB，**必须**依赖 next/font 自托管的
 *          unicode-range 子集化（实测每个字重被切成 101 个 @font-face 分片），
 *          浏览器只下载页面实际用到的那几片。因此这里给中文面设 preload:false，
 *          避免把上百个分片全部预加载。
 *
 * 已实测结论（勿凭印象推翻）：
 *   - `Noto_Sans_SC` 的 weight "900" 在 Google Fonts 上**存在**，next/font 接受并成功自托管，
 *     无需回退为 Black/100。
 *   - display:"swap" 保证字体未就绪时先用兜底字体渲染文字，不会出现隐形文字；
 *     globals.css 中 --font-cjk-fallback 提供 PingFang SC / Microsoft YaHei 兜底链。
 */
const archivoBlack = Archivo_Black({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-latin-head",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-latin-body",
  display: "swap",
});

/** 汉字正文 400 / 500 */
const notoSansScBody = Noto_Sans_SC({
  weight: ["400", "500"],
  variable: "--font-sc-body",
  display: "swap",
  preload: false,
});

/** 汉字标题 900 —— 承担 neobrutalism 的视觉重量 */
const notoSansScHead = Noto_Sans_SC({
  weight: "900",
  variable: "--font-sc-head",
  display: "swap",
  preload: false,
});

/**
 * 站点级默认 metadata。
 *
 * `title.template` 只对**未显式给出完整标题**的子页生效。
 * 本项目所有 5 页都通过 lib/metadata.ts 的 buildMetadata() 显式给出 title，
 * 因此模板实际上是兜底（例如将来新增页面忘了写 title 时，
 * 至少还会带上站名，而不是只显示一个页面名）。
 *
 * 首页的 title 已含站名，而 Next 的 template 不会对"自身"再套一层，
 * 这点由 tests/seo.test.ts 的产物断言把关（确认没出现「…｜站名｜站名」）。
 */
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME}｜${SITE_TAGLINE}`,
    template: `%s｜${SITE_NAME}`,
  },
  description: PAGE_META["/"].description,
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME }],
  icons: {
    icon: [{ url: "/brand/ruiqiang-mark.svg", type: "image/svg+xml", sizes: "any" }],
    apple: [{ url: "/brand/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    type: "website",
    locale: "zh_CN",
    siteName: SITE_NAME,
    url: SITE_URL,
    images: [
      {
        url: `${SITE_URL}/images/og-cover.jpg`,
        width: 1280,
        height: 720,
        alt: `${SITE_NAME}施工现场记录`,
      },
    ],
  },
  robots: { index: true, follow: true },
};

/**
 * LocalBusiness 结构化数据（PRD §7.6 / 开发计划 A7）。
 *
 * ## 字段来源纪律
 * 每个字段都取自 lib/company.ts（即材料），**不得**出现：
 *   - `aggregateRating`：没有任何评分来源
 *   - `review`：没有任何客户评价
 *   - `award` / `hasCredential`：材料里没有资质证书
 * 这三类是最常见的"结构化数据造假"入口，写进去会被搜索引擎当作虚假标记，
 * 且直接违反 PRD §7.7。
 *
 * ## 为什么 type 用数组
 * `["LocalBusiness","GeneralContractor"]` 同时声明了"本地商家"与"
 * 总承包/专业承包"两层语义，抓取方能更准确归到建筑行业。
 */
const ORGANIZATION_JSON_LD = {
  "@context": "https://schema.org",
  "@type": ["LocalBusiness", "GeneralContractor"],
  "@id": `${SITE_URL}/#organization`,
  name: COMPANY.name,
  legalName: COMPANY.name,
  url: SITE_URL,
  description: PAGE_META["/"].description,
  telephone: COMPANY.phone,
  email: COMPANY.email,
  foundingDate: COMPANY.foundedOn,
  taxID: COMPANY.unifiedSocialCreditCode,
  identifier: COMPANY.unifiedSocialCreditCode,
  address: {
    "@type": "PostalAddress",
    addressCountry: "CN",
    addressRegion: "重庆市",
    addressLocality: "大足区",
    streetAddress: "棠香街道二环北路中段187号附50号",
  },
  areaServed: {
    "@type": "AdministrativeArea",
    name: "重庆市大足区",
  },
  knowsAbout: [
    "建筑劳务分包",
    "建设工程施工",
    "施工专业作业",
    "建设工程设计",
    "住宅室内装饰装修",
    "园林绿化工程施工",
  ],
} as const;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const fontVars = [
    archivoBlack.variable,
    spaceGrotesk.variable,
    notoSansScBody.variable,
    notoSansScHead.variable,
  ].join(" ");

  return (
    <html lang="zh-CN" className={`${fontVars} h-full antialiased font-sans`}>
      {/*
       * 底部内边距为手机悬浮致电条预留。
       *
       * ⚠️ 必须加在 <body>（也就是**页脚之后仍属于文档流的那一层**），
       *    而不是只加在包裹 {children} 的 div 上 —— 因为 <footer> 是那个 div 的
       *    **兄弟节点**，给它前面的 div 加 pb 对页脚毫无作用，版权行会被悬浮条盖住。
       *    （这是实测发现的真实缺陷：截图里页脚最后一行被绿色条压住。）
       *
       * 数值直接引用 MobileCallBar 导出的常量，避免两处各写一个数字后走偏。
       * md 断点起悬浮条隐藏，内边距随之归零。
       */}
      <body
        className="min-h-full flex flex-col bg-background text-foreground pb-[calc(var(--mobile-call-bar-space)+var(--mobile-call-bar-offset,0px))] md:pb-0"
        style={
          {
            "--mobile-call-bar-space": `${MOBILE_CALL_BAR_HEIGHT}px`,
          } as React.CSSProperties
        }
      >
        <SiteHeader />
        <div className="flex flex-1 flex-col">{children}</div>
        <SiteFooter />
        <MobileCallBar />

        {/*
         * LocalBusiness 结构化数据。放在 <body> 末尾而非 <head>：
         * 两种位置搜索引擎都能识别，放末尾可以避免阻塞首屏解析。
         * 内容为构建期常量（见上方 ORGANIZATION_JSON_LD 的来源纪律说明）。
         */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(ORGANIZATION_JSON_LD),
          }}
        />
      </body>
    </html>
  );
}
