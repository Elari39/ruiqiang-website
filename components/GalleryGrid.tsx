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
 *
 * ⚠️ 使用滚动容器带来一个必须处理的后果：**可见的那张图不等于被点击的那张**。
 *   打开时要主动定位到被点击的索引，滑动后要把可见索引写回 state，
 *   否则图注与画面会互相矛盾。详见下方 `scrollRef` 处的注释。
 */
import { useCallback, useEffect, useRef, useState } from "react";
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

  /*
   * 记住是哪个按钮打开的弹层，关闭时把焦点还回去。
   *
   * 为什么需要手动做：本组件的 Dialog 用的是**受控 open**（`open={openIndex !== null}`），
   * 而不是 Radix 的 <DialogTrigger>。Radix 只在自己托管的 Trigger 上自动做焦点归还，
   * 受控模式下它不知道该还给谁，实测关闭后焦点落到 <body>，
   * 键盘用户会丢失位置（可访问性回退）。因此显式记录并归还。
   */
  const triggerRefs = useRef<Array<HTMLButtonElement | null>>([]);

  /*
   * 弹层内的横向滚动容器。
   *
   * ⚠️ 这里修的是一个**真实缺陷**（线上实测）：
   *   弹层把 4 张图一次性渲进一个 snap 滚动容器，最初**没有任何把容器滚到
   *   被点击那张的逻辑**。于是点第 4 张，标题写的是第 4 张的图注，
   *   画面却永远是第 1 张 —— 标题与画面互相矛盾；而且手指滑到别的图之后，
   *   标题也不会跟着变，相当于一直显示错误的图注。
   *
   *   所以需要两件事，缺一不可：
   *     ① 打开时把容器定位到被点击的索引（下面的 effect）；
   *     ② 滑动时把"当前可见索引"写回 state，让标题/描述/计数跟着走（onScroll）。
   */
  const scrollRef = useRef<HTMLDivElement | null>(null);

  /**
   * 待定位的目标索引 —— 只有**点击缩略图**引起的打开才会设置它。
   *
   * 为什么需要这个标记（不是多余的状态）：滚动容器同时受两种输入驱动 ——
   * 程序化定位与用户滑动。如果无条件把位置"纠正"到 `openIndex`，
   * 用户滑到一半时 `onScroll` 会把 openIndex 改成中间索引，随即把容器拽回
   * 那个位置，手指就会感到一到就卡（典型的 scroll hijack）。
   * 反过来，如果 `onScroll` 不加区分地跟随滚动，程序化定位自身触发的滚动
   * 又会被误当成用户滑动。
   *
   * 用"谁发起的"这一个事实把两者分开：点击设置标记 → 由定位逻辑负责滚动、
   * onScroll 让路；定位完成后清掉标记 → onScroll 负责跟随。
   */
  const pendingSnap = useRef<number | null>(null);

  /**
   * 滚动容器的 **回调 ref**：节点一挂上就把容器滚到被点击的那一张。
   *
   * ## 为什么必须是回调 ref，而不是 useEffect + useRef（实测踩过，勿改回）
   *
   * 第一版写的是"监听 openIndex 的 effect 里读 scrollRef.current"。它**从来没生效过**，
   * 而且失败得毫无声响：图注与计数都正确跳到第 3 张，画面却停在第 1 张。
   * 现场取证（CDP 读 DOM）：
   *   容器 clientWidth=1096 / scrollWidth=4384（确实可滚动）、scrollLeft=0；
   *   而从外部手动 `el.scrollLeft = 1096 * 2` **立刻生效并保持不变**。
   *   说明不是 CSS、不是 scroll-snap、也不是被浏览器截断 —— 就是**那段赋值没被执行**。
   *
   * 根因：Radix 的弹层内容带进出场动画，其 `Presence` 会**先渲染 null、再挂载真实节点**。
   * 于是"openIndex 变了"和"滚动容器进入 DOM"落在**两次不同的提交**里：
   * 监听 openIndex 的 effect 只在第一次提交后跑一次，那会儿节点还不存在，
   * `scrollRef.current` 是 null；此时的 `return` 就成了终点，之后再也不会重试。
   *
   * 回调 ref 则在节点**真正插入文档**的那一刻被调用，时机天然正确，
   * 不需要猜"要等几帧"。
   */
  const attachScroller = useCallback((el: HTMLDivElement | null) => {
    scrollRef.current = el;

    const target = pendingSnap.current;
    if (!el || target === null || target < 0 || target >= GALLERY.length) return;

    // 每张 slide 都是 `w-full shrink-0`，宽度恒等于容器的 clientWidth，
    // 所以「索引 × 宽度」就是精确的滚动位置。
    // （不用 slide.offsetLeft：DialogContent 是 fixed，会成为 offsetParent，值会错。）
    const w = el.clientWidth || Math.round(el.getBoundingClientRect().width);
    if (!w) return; // 极少数布局未就绪的情况，交给下面的 effect 兜底

    el.scrollLeft = w * target;
    if (Math.round(el.scrollLeft / w) === target) pendingSnap.current = null;
  }, []);

  /** 兜底：万一 ref 回调那一刻宽度还量不出来，提交后的 effect 再补一次 */
  useEffect(() => {
    if (openIndex === null) {
      pendingSnap.current = null;
      return;
    }
    // 这次索引变化来自用户滑动，不是点击 → 绝不改动滚动位置
    const target = pendingSnap.current;
    if (target === null || target !== openIndex) return;

    const c = scrollRef.current;
    if (!c || !c.clientWidth) return;
    if (Math.round(c.scrollLeft / c.clientWidth) === target) {
      pendingSnap.current = null;
      return;
    }
    c.scrollLeft = c.clientWidth * target;
    if (Math.round(c.scrollLeft / c.clientWidth) === target) pendingSnap.current = null;
  }, [openIndex]);

  /** 滑动时把可见索引同步回 state，避免标题与画面不一致 */
  const syncIndexFromScroll = () => {
    // 程序化定位自身也会触发 scroll 事件，那种滚动不该被当成用户滑动
    if (pendingSnap.current !== null) return;

    const c = scrollRef.current;
    if (!c || !c.clientWidth) return;
    const i = Math.round(c.scrollLeft / c.clientWidth);
    if (i !== openIndex && i >= 0 && i < GALLERY.length) setOpenIndex(i);
  };

  /** 点击缩略图：登记"这次要定位到 i"，再由上面的定位逻辑执行滚动 */
  const openAt = (i: number) => {
    pendingSnap.current = i;
    setOpenIndex(i);
  };

  return (
    <>
      {/* 缩略图网格 */}
      <ul className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
        {GALLERY.map((g, i) => (
          <li key={g.key}>
            <button
              ref={(el) => {
                triggerRefs.current[i] = el;
              }}
              type="button"
              onClick={() => openAt(i)}
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
          <DialogContent
            className="max-w-[min(96vw,1100px)] border-2 border-border bg-card p-0 shadow-xl sm:max-w-[min(92vw,1100px)]"
            onCloseAutoFocus={(e) => {
              // 接管控件的焦点归还，回到当初点开的那个按钮
              e.preventDefault();
              const i = openIndex;
              if (i !== null) triggerRefs.current[i]?.focus();
            }}
          >
            <DialogTitle className="flex items-center justify-between gap-3 border-b-2 border-border px-4 py-3 font-head text-base">
              <span>{current.caption}</span>
              {/* 计数让"现在看的是第几张"一目了然，也是上面索引同步的可见证据 */}
              <span
                className="shrink-0 border-2 border-border bg-brand-yellow px-2 py-0.5 text-xs"
                aria-hidden="true"
              >
                {(openIndex ?? 0) + 1} / {GALLERY.length}
              </span>
            </DialogTitle>
            <DialogDescription className="sr-only">
              施工现场记录照片：{current.alt}（第 {(openIndex ?? 0) + 1} 张，共{" "}
              {GALLERY.length} 张）
            </DialogDescription>

            {/* 弹层内横向滑动，手机上一指即可翻看 */}
            <div
              ref={attachScroller}
              onScroll={syncIndexFromScroll}
              aria-label="工程实拍照片，可左右滑动切换"
              className="flex snap-x snap-mandatory overflow-x-auto"
            >
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
