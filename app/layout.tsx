import type { Metadata } from "next";
import { Archivo_Black, Space_Grotesk, Noto_Sans_SC } from "next/font/google";
import "./globals.css";
import { SITE_NAME, SITE_TAGLINE, SITE_URL } from "@/lib/site";
import { COMPANY } from "@/lib/company";

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

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME}｜${SITE_TAGLINE}`,
    template: `%s｜${SITE_NAME}`,
  },
  description: `${SITE_NAME}成立于 2023 年，注册于重庆市大足区，经营建筑劳务分包、建设工程施工、施工专业作业、建设工程设计、住宅室内装饰装修、园林绿化工程施工等业务。联系电话 ${COMPANY.phone}。`,
  applicationName: SITE_NAME,
  openGraph: {
    type: "website",
    locale: "zh_CN",
    siteName: SITE_NAME,
    url: SITE_URL,
  },
  robots: { index: true, follow: true },
};

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
    <html lang="zh-CN" className={`${fontVars} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
