"use client";

/**
 * 相册网格（PRD §4.3）
 *
 * 交互：点击缩略图放大查看；Radix Dialog 自带 Esc 关闭、焦点陷阱与
 * 关闭后焦点归位，比自写弹层更可靠（这是选 Radix 变体的主要原因之一）。
 *
 * 「移动端左右滑动浏览」的实现说明：
 *   移动端采用**横向滚动容器**（scroll-snap）而非手势库 —— 浏览器原生的
 *   横向滚动本身就支持左右滑动，且不引入任何依赖，还能被键盘与读屏软件识别。
 *   弹层内部同样可横向滑动，让手机上不用返回就能看下一张。
 */
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { SiteImage } from "@/components/SiteImage";
import { GALLERY } from "@/lib/content";

export function GalleryGrid() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const current = openIndex === null ? null : GALLERY[openIndex];

  return (
    <>
      {/* 缩略图网格 */}
      <ul className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
        {GALLERY.map((g, i) => (
          <li key={g.key}>
            <button
              type="button"
              onClick={() => setOpenIndex(i)}
              aria-label={`放大查看：${g.caption}`}
              className="block w-full border-2 border-border text-left shadow-md nb-lift"
            >
              <SiteImage
                imgKey={g.key}
                alt={g.alt}
                width={1600}
                height={900}
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 280px"
              />
              <span className="block border-t-2 border-border bg-card px-2.5 py-2 text-xs sm:px-3 sm:text-sm">
                {g.caption}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {/* 放大查看弹层 */}
      <Dialog
        open={openIndex !== null}
        onOpenChange={(v) => {
          if (!v) setOpenIndex(null);
        }}
      >
        {current && (
          <DialogContent className="max-w-[min(96vw,1100px)] border-2 border-border bg-card p-0 shadow-xl sm:max-w-[min(92vw,1100px)]">
            <DialogTitle className="border-b-2 border-border px-4 py-3 font-head text-base">
              {current.caption}
            </DialogTitle>
            <DialogDescription className="sr-only">
              施工现场记录照片：{current.alt}
            </DialogDescription>

            {/* 弹层内横向滑动，手机上一指即可翻看 */}
            <div className="flex snap-x snap-mandatory overflow-x-auto">
              {GALLERY.map((g) => (
                <div key={g.key} className="w-full shrink-0 snap-center">
                  <SiteImage
                    imgKey={g.key}
                    alt={g.alt}
                    width={1600}
                    height={900}
                    sizes="(max-width: 1100px) 96vw, 1100px"
                  />
                </div>
              ))}
            </div>

            <p className="border-t-2 border-border bg-muted px-4 py-2.5 text-sm text-muted-foreground">
              图片为施工现场记录，仅展示施工内容。
            </p>
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}
