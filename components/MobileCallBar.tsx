import { COMPANY, TEL_HREF } from "@/lib/company";

/**
 * 手机端底部悬浮「立即致电」条（PRD §4.6）。
 *
 * 这是建筑行业访客在手机上转化率最高的元素，因此常驻显示。
 *
 * ⚠️ 真实缺陷防线：`fixed bottom-0` 的悬浮条会**永久遮住页面最底部内容**。
 *   因此必须由布局层预留等高内边距。这里把高度定义成常量并导出，
 *   `app/layout.tsx` 直接引用它给 <main> 加 `pb`，两边不会各写一个数字后走偏。
 *   （对应 DEVELOPMENT_PLAN A4 的注意事项。）
 */
export const MOBILE_CALL_BAR_HEIGHT = 60;

export function MobileCallBar() {
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 border-t-2 border-border bg-brand-green md:hidden"
      style={{ height: MOBILE_CALL_BAR_HEIGHT }}
    >
      <a
        href={TEL_HREF}
        className="flex h-full w-full items-center justify-center text-base font-medium"
      >
        立即致电 {COMPANY.phone}
      </a>
    </div>
  );
}
