import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  COMPANY,
  COMPANY_INTRO,
  REGISTRATION_FIELDS,
  TEL_HREF,
} from "@/lib/company";

export const metadata: Metadata = {
  title: "关于我们",
  description: `${COMPANY.name}成立于 2023 年 6 月 30 日，注册地位于${COMPANY.address}，法定代表人${COMPANY.legalRepresentative}，企业类型${COMPANY.companyType}，经营状态${COMPANY.status}。`,
};

/**
 * 关于我们（PRD §4.4）
 *
 * 执照摘要卡片为**纯文字**排版。营业执照照片（含统一社会信用代码与法定代表人姓名）
 * 按 PRD §5.4 属硬性禁止发布项，全站任何位置都不得引用该图片文件。
 */
export default function AboutPage() {
  // 摘要卡只摘录执照票面上的关键项，不含任何推导信息
  const licenseSummary = [
    { label: "名称", value: COMPANY.name },
    { label: "类型", value: COMPANY.companyType },
    { label: "法定代表人", value: COMPANY.legalRepresentative },
    { label: "注册资本", value: `${COMPANY.registeredCapitalWan} 万元` },
    { label: "成立日期", value: COMPANY.foundedOn },
    { label: "营业期限", value: COMPANY.businessTerm },
    { label: "住所", value: COMPANY.address },
    { label: "登记机关", value: COMPANY.registryAuthority },
  ];

  return (
    <>
      <section className="border-b-2 border-border">
        <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:py-16">
          <h1 className="text-3xl sm:text-4xl">关于我们</h1>

          <div className="mt-6 max-w-3xl space-y-4 text-lg leading-relaxed">
            {COMPANY_INTRO.map((p) => (
              <p key={p.slice(0, 16)}>{p}</p>
            ))}
          </div>
        </div>
      </section>

      {/* 营业执照摘要卡片（纯文字） */}
      <section aria-labelledby="license-card" className="border-b-2 border-border">
        <div className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 lg:py-16">
          <h2 id="license-card" className="text-2xl sm:text-3xl">
            营业执照摘要
          </h2>
          <p className="mt-3 text-muted-foreground">
            以下信息摘录自营业执照登记内容。出于信息安全考虑，
            本站以文字形式展示，不公开证件照片。
          </p>

          <div className="mt-6 border-2 border-border bg-brand-yellow p-5 shadow-md sm:p-6">
            <p className="font-head text-lg">{COMPANY.name}</p>
            <p className="mt-1 text-sm">营业执照（摘要）</p>

            <dl className="mt-5 space-y-2.5">
              {licenseSummary.map((row) => (
                <div
                  key={row.label}
                  className="flex flex-col gap-0.5 border-b border-border/40 pb-2 last:border-b-0 sm:flex-row sm:gap-3"
                >
                  <dt className="w-32 shrink-0 text-sm text-muted-foreground">
                    {row.label}
                  </dt>
                  <dd className="break-all">{row.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* 工商登记信息表（PRD §2 全部字段） */}
      <section aria-labelledby="registration" className="border-b-2 border-border">
        <div className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 lg:py-16">
          <h2 id="registration" className="text-2xl sm:text-3xl">
            工商登记信息
          </h2>
          <p className="mt-3 text-muted-foreground">
            数据来源为公司登记信息，共 {REGISTRATION_FIELDS.length} 项。
          </p>

          <div className="mt-6 overflow-x-auto border-2 border-border shadow-md">
            <table className="w-full border-collapse text-left">
              <caption className="sr-only">重庆锐强建筑劳务有限公司工商登记信息表</caption>
              <tbody>
                {REGISTRATION_FIELDS.map((row, i) => (
                  <tr
                    key={row.label}
                    className={i % 2 === 0 ? "bg-card" : "bg-muted"}
                  >
                    <th
                      scope="row"
                      className="w-40 border-b-2 border-border px-4 py-3 align-top text-sm font-medium sm:w-56"
                    >
                      {row.label}
                    </th>
                    <td className="border-b-2 border-border px-4 py-3 align-top break-all">
                      {row.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="border-b-2 border-border bg-brand-blue">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-5 px-4 py-10 sm:px-6">
          <p className="text-lg font-medium">
            如需核实登记信息或了解业务承接条件，欢迎来电。
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg" className="border-2 border-border text-base shadow-md nb-lift">
              <a href={TEL_HREF}>致电 {COMPANY.phone}</a>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="border-2 border-border bg-card text-base shadow-md nb-lift"
            >
              <Link href="/contact">联系我们</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
