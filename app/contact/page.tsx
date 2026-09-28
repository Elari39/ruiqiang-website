import type { Metadata } from "next";
import { CopyAddress } from "@/components/CopyAddress";
import { MapEmbed } from "@/components/MapEmbed";
import { COMPANY, MAIL_HREF, TEL_HREF } from "@/lib/company";

export const metadata: Metadata = {
  title: "联系我们",
  description: `${COMPANY.name}联系方式：电话 ${COMPANY.phone}，邮箱 ${COMPANY.email}，注册地址${COMPANY.address}。`,
};

/**
 * 联系我们（PRD §4.5）
 *
 * 电话与邮箱均使用可点击的 tel: / mailto: 链接（PRD §7.4 验收项）。
 * 在线地图在 A6 接入，此处保留锚点位置。
 */
export default function ContactPage() {
  return (
    <>
      <section className="border-b-2 border-border">
        <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:py-16">
          <h1 className="text-3xl sm:text-4xl">联系我们</h1>
          <p className="mt-4 max-w-3xl text-lg leading-relaxed text-muted-foreground">
            业务咨询请优先致电，工作时间内可直接沟通承接范围与作业安排。
          </p>
        </div>
      </section>

      <section aria-labelledby="contact-methods">
        <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:py-16">
          <h2 id="contact-methods" className="sr-only">
            联系方式
          </h2>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* 电话 */}
            <div className="border-2 border-border bg-brand-green p-5 shadow-md sm:p-6">
              <h3 className="font-head text-xl">联系电话</h3>
              <a
                href={TEL_HREF}
                className="mt-3 block font-head text-2xl break-all underline-offset-4 hover:underline sm:text-3xl"
              >
                {COMPANY.phone}
              </a>
              <p className="mt-3 text-sm text-muted-foreground">
                手机点击号码即可直接拨号。
              </p>
            </div>

            {/* 邮箱 */}
            <div className="border-2 border-border bg-card p-5 shadow-md sm:p-6">
              <h3 className="font-head text-xl">电子邮箱</h3>
              <a
                href={MAIL_HREF}
                className="mt-3 block text-xl break-all underline-offset-4 hover:underline sm:text-2xl"
              >
                {COMPANY.email}
              </a>
              <p className="mt-3 text-sm text-muted-foreground">
                可用于发送资料与报价需求。
              </p>
            </div>

            {/* 地址（可复制） */}
            <div className="border-2 border-border bg-card p-5 shadow-md sm:p-6 lg:col-span-2">
              <h3 className="font-head text-xl">注册地址</h3>
              <CopyAddress address={COMPANY.address} />
              <dl className="mt-5 grid gap-3 border-t-2 border-border pt-5 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">行政区划</dt>
                  <dd className="mt-0.5">{COMPANY.administrativeDivision}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">登记机关</dt>
                  <dd className="mt-0.5">{COMPANY.registryAuthority}</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </section>

      {/* 在线地图（PRD §4.5，实现路线见 MapEmbed 顶部说明） */}
      <section aria-labelledby="map-section" className="border-t-2 border-border">
        <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:py-16">
          <h2 id="map-section" className="text-2xl sm:text-3xl">
            位置地图
          </h2>
          <p className="mt-3 max-w-3xl text-muted-foreground">
            公司注册地址见下方。点击按钮可在官方地图中查看并直接导航。
          </p>

          <div className="mt-6">
            <MapEmbed />
          </div>
        </div>
      </section>
    </>
  );
}
