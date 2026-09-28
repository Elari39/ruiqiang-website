import Link from "next/link";
import { COMPANY, MAIL_HREF, TEL_HREF } from "@/lib/company";
import { NAV_ITEMS, SITE_NAME } from "@/lib/site";

/**
 * 页脚（PRD §4.6）：工商信息摘要 + 版权声明 + ICP 备案号注释占位。
 *
 * 备案占位刻意保留为**代码注释**而非可见文本：当前站点托管在 Netlify（境外），
 * 依规无需备案；若渲染成可见的"渝ICP备xxxxxxxx号"会导致页面出现虚假备案号。
 * 将来迁移国内主机时，把下面注释换成真实备案号的 <a> 即可。
 */
export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 border-t-2 border-border bg-card">
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <div className="grid gap-8 md:grid-cols-3">
          {/* 工商信息摘要 */}
          <section aria-labelledby="footer-company">
            <h2 id="footer-company" className="font-head text-base">
              {SITE_NAME}
            </h2>
            <dl className="mt-3 space-y-1.5 text-sm text-muted-foreground">
              <div className="flex gap-2">
                <dt className="shrink-0">统一社会信用代码</dt>
                <dd className="break-all text-foreground">
                  {COMPANY.unifiedSocialCreditCode}
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="shrink-0">法定代表人</dt>
                <dd className="text-foreground">{COMPANY.legalRepresentative}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="shrink-0">成立日期</dt>
                <dd className="text-foreground">{COMPANY.foundedOn}</dd>
              </div>
            </dl>
          </section>

          {/* 导航 */}
          <nav aria-label="页脚导航">
            <h2 className="font-head text-base">网站导航</h2>
            <ul className="mt-3 space-y-1.5 text-sm">
              {NAV_ITEMS.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="underline-offset-4 hover:underline"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* 联系方式 */}
          <section aria-labelledby="footer-contact">
            <h2 id="footer-contact" className="font-head text-base">
              联系方式
            </h2>
            <ul className="mt-3 space-y-1.5 text-sm">
              <li>
                电话：{" "}
                <a href={TEL_HREF} className="underline-offset-4 hover:underline">
                  {COMPANY.phone}
                </a>
              </li>
              <li>
                邮箱：{" "}
                <a href={MAIL_HREF} className="break-all underline-offset-4 hover:underline">
                  {COMPANY.email}
                </a>
              </li>
              <li className="text-muted-foreground">地址：{COMPANY.address}</li>
            </ul>
          </section>
        </div>

        <div className="mt-8 border-t-2 border-border pt-5 text-sm text-muted-foreground">
          <p>
            © {year} {SITE_NAME}
          </p>
          {/* TODO(§4.6/§5.4): ICP 备案号占位。当前使用 Netlify 境外托管，无需备案；若迁移国内主机，在此填入 渝ICP备xxxxxxxx号 并链接 https://beian.miit.gov.cn */}
        </div>
      </div>
    </footer>
  );
}
