import type { Metadata } from "next";
import { GalleryGrid } from "@/components/GalleryGrid";
import { buildMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildMetadata("/gallery");

/**
 * 工程实拍（PRD §4.3）
 *
 * 合规纪律（PRD §2.2 尾注）：图片只作为"施工现场记录"呈现，
 * 不标注为任何具体项目 —— 材料中没有项目名称、地点与甲方信息。
 */
export default function GalleryPage() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:py-16">
      <h1 className="text-3xl sm:text-4xl">工程实拍</h1>
      <p className="mt-4 max-w-3xl text-lg leading-relaxed text-muted-foreground">
        以下为公司施工现场作业记录。图片用于展示施工内容与作业面情况，
        不代表特定项目。
      </p>

      <div className="mt-10">
        <GalleryGrid />
      </div>

      <p className="mt-8 border-2 border-border bg-muted px-4 py-3 text-sm text-muted-foreground">
        点击任意图片可放大查看；手机上可在放大视图内左右滑动切换。
      </p>
    </section>
  );
}
