import Image from "next/image";

/** Decorative beside the company name; the same SVG is used by the favicon. */
export function BrandMark({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <Image
      src="/brand/ruiqiang-mark.svg"
      alt="戴安全帽的 R，锐强建筑标志"
      aria-hidden="true"
      width={size}
      height={size}
      loading="eager"
      className={`shrink-0 ${className}`}
    />
  );
}
