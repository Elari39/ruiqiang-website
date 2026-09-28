import { COMPANY, TEL_HREF } from "@/lib/company";
import { SITE_TAGLINE } from "@/lib/site";

/**
 * A3 阶段的首页占位。
 *
 * 这里**不是** create-next-app 的默认模板 —— 默认模板带 `dark:` 类与 `rounded-full`，
 * 会同时违反 PRD §6.2（不做深色模式）与零圆角约定，也让 A3 的
 * `tests/theme.test.ts` 不变量失去意义（测试就成了摆设）。
 * 因此在此阶段就换成真实、合规的骨架页，A4 再补全内容与版式。
 *
 * 文案纪律：只出现 lib/company.ts 里已核实的字段（PRD §2/§5.4），
 * 此处不写业绩、客户、资质等未经核实的内容。
 */
export default function Home() {
  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-16">
      <p className="inline-block border-2 border-border bg-brand-yellow px-3 py-1 text-sm font-medium">
        {SITE_TAGLINE}
      </p>

      <h1 className="mt-6 text-4xl leading-tight sm:text-5xl">
        {COMPANY.name}
      </h1>

      <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
        成立于 {COMPANY.foundedOn}，注册于{COMPANY.administrativeDivision}
        ，经营范围涵盖{COMPANY.industry}。
      </p>

      <p className="mt-8 text-base">
        咨询电话：
        <a className="underline underline-offset-4" href={TEL_HREF}>
          {COMPANY.phone}
        </a>
      </p>
    </main>
  );
}
