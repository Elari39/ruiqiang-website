import type { Metadata } from "next";
import Link from "next/link";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BUSINESS_SCOPE, COMPANY, TEL_HREF } from "@/lib/company";
import { SERVICE_GROUPS } from "@/lib/content";

export const metadata: Metadata = {
  title: "服务项目",
  description: `${COMPANY.name}服务项目：建筑劳务分包、建设工程施工、施工专业作业、建设工程设计、住宅室内装饰装修、建设工程监理，以及工程管理服务、装卸搬运、园林绿化工程施工、建筑材料销售、机械设备租赁等配套服务。`,
};

/**
 * 服务项目（PRD §4.2）
 *
 * 三组划分严格照 PRD，不自行增删条目。底部折叠区内容逐字等于 PRD §2.1，
 * 直接引用 BUSINESS_SCOPE 常量，避免手抄产生偏差。
 */
export default function ServicesPage() {
  return (
    <>
      <section className="border-b-2 border-border">
        <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:py-16">
          <h1 className="text-3xl sm:text-4xl">服务项目</h1>
          <p className="mt-4 max-w-3xl text-lg leading-relaxed text-muted-foreground">
            公司经营范围分为许可项目与一般项目，对应下列三类服务方向。
            具体项目的承接范围以营业执照登记及相关部门批准文件为准。
          </p>
        </div>
      </section>

      <section aria-labelledby="service-groups">
        <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:py-16">
          <h2 id="service-groups" className="sr-only">
            服务分组
          </h2>

          <ul className="grid gap-6 lg:grid-cols-3">
            {SERVICE_GROUPS.map((group, i) => (
              <li key={group.title}>
                <Card className="h-full border-2 shadow-md">
                  <CardHeader className="border-b-2 border-border">
                    <span className="font-head text-sm text-muted-foreground">
                      0{i + 1}
                    </span>
                    <CardTitle className="mt-1 font-head text-xl">
                      {group.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <ul className="space-y-2.5">
                      {group.items.map((item) => (
                        <li key={item} className="flex gap-2.5 leading-relaxed">
                          <span
                            aria-hidden="true"
                            className="mt-2 inline-block h-2 w-2 shrink-0 border border-border bg-brand-yellow"
                          />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 营业执照原文折叠区 */}
      <section aria-labelledby="full-scope" className="border-t-2 border-border">
        <div className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 lg:py-16">
          <h2 id="full-scope" className="text-2xl sm:text-3xl">
            完整经营范围
          </h2>
          <p className="mt-3 text-muted-foreground">
            以下为营业执照登记的完整表述，原文照录。
          </p>

          <Accordion type="single" collapsible className="mt-6">
            <AccordionItem
              value="scope"
              className="border-2 border-border bg-card shadow-sm"
            >
              <AccordionTrigger className="px-4 text-left text-base">
                查看完整经营范围（营业执照原文）
              </AccordionTrigger>
              <AccordionContent className="px-4">
                <div className="space-y-4 pb-2">
                  <div>
                    <h3 className="font-head text-sm">许可项目</h3>
                    <p className="mt-2 leading-relaxed">{BUSINESS_SCOPE.licensed}</p>
                  </div>
                  <div>
                    <h3 className="font-head text-sm">一般项目</h3>
                    <p className="mt-2 leading-relaxed">{BUSINESS_SCOPE.general}</p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* 转化区 */}
      <section className="border-t-2 border-border bg-brand-yellow">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-5 px-4 py-10 sm:px-6">
          <p className="text-lg font-medium">
            需要咨询具体业务范围与承接条件？请直接来电。
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg" className="border-2 border-border text-base shadow-md nb-lift">
              <a href={TEL_HREF}>致电 {COMPANY.phone}</a>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="border-2 border-border text-base shadow-md nb-lift"
            >
              <Link href="/contact">联系方式</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
