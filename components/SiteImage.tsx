/**
 * 站点图片组件：把 A2 产出的「两档宽度 × 两种格式」派生品包成
 * 一个 `<picture>`，让浏览器按容器宽度与格式支持自行择优。
 *
 * 为什么手写 `<picture>` 而不是用 `next/image`：
 *   A2 管线已经生成了固定宽度的 AVIF/WebP 成品（1600 / 800），
 *   它们就是最终交付物。next/image 会在运行时再走一次优化端点，
 *   既有额外开销，也让"发布的到底是哪几个文件"变得不可验证。
 *   这里直接引用实体文件，构建产物里的 `<source srcSet>` 可被测试逐字断言。
 *
 * 尺寸纪律：必须给出 width/height，否则图片加载前容器高度为 0，
 *   会在中文长页面上造成明显的布局跳动（CLS）。
 */
import { cn } from "@/lib/utils";

const WIDTHS = [1600, 800] as const;

type SiteImageProps = {
  /** 对应 public/images/{imgKey}-{width}.{webp,avif} 的文件名前缀 */
  imgKey: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  /** 首屏图设 true：浏览器会提前发现并加载 */
  priority?: boolean;
  sizes?: string;
};

export function SiteImage({
  imgKey,
  alt,
  width,
  height,
  className,
  priority = false,
  sizes = "(max-width: 768px) 100vw, 800px",
}: SiteImageProps) {
  return (
    <picture>
      <source
        type="image/avif"
        srcSet={WIDTHS.map((w) => `/images/${imgKey}-${w}.avif ${w}w`).join(", ")}
        sizes={sizes}
      />
      <source
        type="image/webp"
        srcSet={WIDTHS.map((w) => `/images/${imgKey}-${w}.webp ${w}w`).join(", ")}
        sizes={sizes}
      />
      {/*
       * 兜底：不支持 <picture> / <source> 的旧环境取 WebP 大图。
       *
       * ⚠️ 属性名必须是 **fetchPriority（首字母大写 P）**，不能写成全小写的 `fetchpriority`。
       *
       * 这条注释是踩坑记录，请勿"顺手改回小写"：
       *   小写 `fetchpriority` 是浏览器最终认的 **HTML 属性名**，但它不是 React 的属性名。
       *   写成小写时 React 19 会：
       *     ① 在开发控制台报 `Invalid DOM property \`fetchpriority\`. Did you mean \`fetchPriority\`?`
       *     ② 关键：**不会**把该属性写进 DOM —— 于是"提前加载首屏图"这个优化静默失效，
       *        页面看着完全正常，只有性能变差，属于最难发现的一类回归。
       *   React 19 的 @types 已收录 `fetchPriority?: "high" | "low" | "auto"`，
       *   所以用小写还要额外加 @ts-expect-error 才能过类型检查 —— 那个抑制本身
       *   就是"属性名写错了"的信号，而不是"类型定义不全"。
       *   React 会把 camelCase 正确落到 DOM 的小写属性上，无需我们手动写小写。
       */}
      <img
        src={`/images/${imgKey}-1600.webp`}
        alt={alt}
        width={width}
        height={height}
        loading={priority ? "eager" : "lazy"}
        decoding={priority ? "sync" : "async"}
        fetchPriority={priority ? "high" : undefined}
        className={cn("h-auto w-full object-cover", className)}
      />
    </picture>
  );
}
