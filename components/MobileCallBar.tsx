import { COMPANY, TEL_HREF } from "@/lib/company";

/**
 * 手机端底部悬浮「立即致电」条（PRD §4.6）。
 *
 * 这是建筑行业访客在手机上转化率最高的元素，因此常驻显示。
 * 显示范围严格限定 `md` 以下（<768px，即手机）：平板与桌面已有页头常驻电话号码，
 * 再挂一条悬浮条会无故遮挡内容。
 *
 * ⚠️ 真实缺陷防线：`fixed bottom-0` 的悬浮条会**永久遮住页面最底部内容**。
 *   因此必须由布局层预留等高内边距 —— **且预留必须加在 <body> 上**。
 *   实测踩过的坑：最初把 pb 加在包裹 {children} 的 div 上，但 <footer> 那个 div 的
 *   兄弟节点，于是页脚完全没被保护，版权行被悬浮条压住（截图可见）。
 *
 *   高度在此定义成常量并导出，layout 直接引用，两边不会各写一个数字后走偏。
 *   断点也必须与这里的 `md:hidden` 保持一致：layout 用 `md:pb-0`。
 */
export const MOBILE_CALL_BAR_HEIGHT = 60;

export function MobileCallBar() {
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 border-t-2 border-border bg-brand-green md:hidden"
      style={{ height: MOBILE_CALL_BAR_HEIGHT, bottom: "var(--mobile-call-bar-offset, 0px)" }}
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
