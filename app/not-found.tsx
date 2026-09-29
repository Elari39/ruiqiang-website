import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { COMPANY, TEL_HREF } from "@/lib/company";
import { NAV_ITEMS } from "@/lib/site";

/**
 * 404 页面（全站未匹配 URL）。
 *
 * ## 为什么需要自己写
 *
 * 不提供本文件时，Next 渲染它内置的默认 404：文案是英文的
 * "404 / This page could not be found."，而且 —— 这一点更关键 ——
 * 按 Next 16 文档（`01-app/03-api-reference/03-file-conventions/not-found.md`），
 * **默认 404 UI 只读操作系统的 `prefers-color-scheme`，不读应用主题**。
 * 也就是说它会绕开本项目的 neobrutalism 令牌，在一套精调过的视觉体系里
 * 插进一个系统配色的页面。对一个中文企业站点来说，这两点都算缺陷。
 *
 * ## 约定要点（Next 16，已核对文档）
 *
 *   - 放在根级 `app/not-found.tsx` 时，它会接管**整个应用**的未匹配 URL，
 *     而不只是 `notFound()` 被显式调用的场合；
 *   - 它渲染在根 layout **内部**，所以页头、页脚、字体与主题自动生效，
 *     本文件不需要（也不应该）自己写 `<html>` / `<body>`；
 *   - 组件**不接收任何 props**；
 *   - Next 会自动为 404 响应注入 `<meta name="robots" content="noindex">`，
 *     因此这里不必手写 robots 元数据；
 *   - 静态路由返回真实的 404 状态码（不是 200）。
 *
 * ## 内容纪律
 *
 * 这里只放"去哪儿"的导航与已有的联系方式，不新增任何企业事实
 * （PRD §2 / §7.7）。导航项直接复用 NAV_ITEMS，避免将来加了页面却漏改这里。
 */

/**
 * 404 的标题。
 *
 * 不写这个导出时，404 页会用 layout 的 `title.default` —— 也就是**首页标题**，
 * 一个"标题说这是首页、内容说页面不存在"的自相矛盾。
 * 给出短标题后，layout 的 `title.template` 会补上站名，
 * 于是得到「页面未找到｜重庆锐强建筑劳务有限公司」。
 *
 * ⚠️ 取证说明：Next 16 的文档只在 `global-not-found.js`（实验性）一节写明
 * 可以导出 `metadata`，`not-found.js` 一节没提。本文件在 **16.3.6 实测有效**
 * （构建产物里 `<title>` 与 `<meta name="description">` 都按这里输出，
 * 且 Next 自动注入的 `noindex` 仍在）。若将来升级后标题退回首页标题，
 * 先复核这一点，再考虑改用 `global-not-found.tsx`。
 */
export const metadata: Metadata = {
  title: "页面未找到",
  description: "您访问的地址不存在或链接已变更。",
};
export default function NotFound() {
  return (
    <section className="border-b-2 border-border">
      <div className="mx-auto w-full max-w-4xl px-4 py-16 sm:px-6 lg:py-24">
        <p className="inline-block border-2 border-border bg-brand-orange px-3 py-1 text-sm font-medium">
          404
        </p>

        <h1 className="mt-5 text-3xl sm:text-4xl">页面未找到</h1>

        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">
          您访问的地址不存在，或链接已经变更。可以从下面的入口继续浏览，
          也可以直接致电咨询。
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg" className="border-2 border-border text-base shadow-md nb-lift">
            <Link href="/">返回首页</Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="border-2 border-border text-base shadow-md nb-lift"
          >
            <a href={TEL_HREF}>致电 {COMPANY.phone}</a>
          </Button>
        </div>

        <nav aria-label="站点导航" className="mt-12">
          <h2 className="font-head text-base">站点导航</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="block border-2 border-border bg-card px-4 py-3 shadow-sm nb-lift"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </section>
  );
}
