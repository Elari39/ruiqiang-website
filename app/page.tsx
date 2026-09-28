import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SiteImage } from "@/components/SiteImage";
import { COMPANY, MAIL_HREF, TEL_HREF } from "@/lib/company";
import { SITE_TAGLINE } from "@/lib/site";
import { CAPABILITIES, GALLERY, HERO_IMAGE } from "@/lib/content";

/**
 * 首页（PRD §4.1）
 *
 * 文案纪律：本页所有事实性表述都能在 lib/company.ts（源自 txt / 营业执照）
 * 或 PRD §2 找到出处。未出现业绩、客户、人员、资质类内容（PRD §6.2 不做项）。
 */

const TONE_CLASS: Record<string, string> = {
  yellow: "bg-brand-yellow",
  blue: "bg-brand-blue",
  pink: "bg-brand-pink",
  green: "bg-brand-green",
};

export default function Home() {
  return (
    <>
      {/* ---------- 首屏 ---------- */}
      <section className="border-b-2 border-border bg-background">
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:items-center lg:py-16">
          <div>
            <p className="inline-block border-2 border-border bg-brand-yellow px-3 py-1 text-sm font-medium">
              {SITE_TAGLINE}
            </p>

            <h1 className="mt-5 text-3xl leading-tight sm:text-4xl lg:text-5xl">
              {COMPANY.name}
            </h1>

            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              公司成立于 {COMPANY.foundedOn}，注册地位于{COMPANY.address}
              。经营建筑劳务分包、建设工程施工、施工专业作业、建设工程设计、
              住宅室内装饰装修、园林绿化工程施工等业务。
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="border-2 border-border text-base shadow-md nb-lift">
                <a href={TEL_HREF}>立即致电 {COMPANY.phone}</a>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="border-2 border-border text-base shadow-md nb-lift"
              >
                <Link href="/services">查看服务</Link>
              </Button>
            </div>
          </div>

          {/* 门头照片作为视觉锚点 */}
          <div className="border-2 border-border shadow-lg">
            <SiteImage
              imgKey={HERO_IMAGE.key}
              alt={HERO_IMAGE.alt}
              width={1600}
              height={1073}
              priority
              sizes="(max-width: 1024px) 100vw, 560px"
            />
          </div>
        </div>
      </section>

      {/* ---------- 业务能力 ---------- */}
      <section aria-labelledby="capabilities" className="border-b-2 border-border">
        <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:py-16">
          <h2 id="capabilities" className="text-2xl sm:text-3xl">
            业务能力
          </h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            以下方向均来自营业执照登记的经营范围。
          </p>

          <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {CAPABILITIES.map((c) => (
              <li key={c.title}>
                <Card className="h-full border-2 shadow-md">
                  <CardHeader className="border-b-2 border-border">
                    <span
                      aria-hidden="true"
                      className={`inline-block h-3 w-10 border-2 border-border ${
                        TONE_CLASS[c.tone] ?? "bg-card"
                      }`}
                    />
                    <CardTitle className="mt-2 font-head text-lg">
                      {c.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <p className="leading-relaxed text-muted-foreground">
                      {c.body}
                    </p>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---------- 工程实拍精选 ---------- */}
      <section aria-labelledby="gallery-preview" className="border-b-2 border-border">
        <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:py-16">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 id="gallery-preview" className="text-2xl sm:text-3xl">
                工程实拍
              </h2>
              <p className="mt-3 text-muted-foreground">
                施工现场记录（钢筋绑扎作业面）。
              </p>
            </div>
            <Link
              href="/gallery"
              className="border-2 border-border bg-card px-3 py-1.5 text-sm shadow-sm nb-lift"
            >
              查看全部
            </Link>
          </div>

          <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {GALLERY.map((g) => (
              <li key={g.key} className="border-2 border-border shadow-md">
                <SiteImage
                  imgKey={g.key}
                  alt={g.alt}
                  width={1600}
                  height={900}
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 280px"
                />
                <p className="border-t-2 border-border bg-card px-3 py-2 text-sm">
                  {g.caption}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---------- 公司信息速览 ---------- */}
      <section aria-labelledby="factsheet" className="border-b-2 border-border">
        <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:py-16">
          <h2 id="factsheet" className="text-2xl sm:text-3xl">
            公司信息速览
          </h2>

          <dl className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { k: "成立时间", v: COMPANY.foundedOn },
              { k: "注册资本", v: `${COMPANY.registeredCapitalWan} 万元` },
              { k: "注册地", v: COMPANY.administrativeDivision },
              { k: "经营状态", v: COMPANY.status },
            ].map((row) => (
              <div
                key={row.k}
                className="border-2 border-border bg-card p-4 shadow-sm"
              >
                <dt className="text-sm text-muted-foreground">{row.k}</dt>
                <dd className="mt-1.5 font-head text-lg">{row.v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ---------- 联系方式 ---------- */}
      <section aria-labelledby="contact-cta">
        <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:py-16">
          <h2 id="contact-cta" className="text-2xl sm:text-3xl">
            联系方式
          </h2>

          <div className="mt-8 grid gap-5 sm:grid-cols-3">
            <div className="border-2 border-border bg-brand-green p-4 shadow-sm">
              <p className="text-sm">联系电话</p>
              <a
                href={TEL_HREF}
                className="mt-1.5 block font-head text-lg break-all underline-offset-4 hover:underline"
              >
                {COMPANY.phone}
              </a>
            </div>
            <div className="border-2 border-border bg-card p-4 shadow-sm">
              <p className="text-sm text-muted-foreground">电子邮箱</p>
              <a
                href={MAIL_HREF}
                className="mt-1.5 block break-all underline-offset-4 hover:underline"
              >
                {COMPANY.email}
              </a>
            </div>
            <div className="border-2 border-border bg-card p-4 shadow-sm">
              <p className="text-sm text-muted-foreground">注册地址</p>
              <p className="mt-1.5 break-all">{COMPANY.address}</p>
            </div>
          </div>

          <div className="mt-8">
            <Button asChild size="lg" className="border-2 border-border text-base shadow-md nb-lift">
              <Link href="/contact">查看联系页面</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
