"use client";

/**
 * 页头（PRD §4.6）：公司名 + 5 项导航 + 手机端汉堡菜单 + 常驻电话号码。
 *
 * 可访问性要点（PRD 计划 A4 明确要求）：
 *   - 汉堡菜单关闭后**焦点必须回到触发按钮**，否则键盘用户会丢失位置。
 *   - 展开时锁 body 滚动，避免背景跟着滑。卸载/关闭时务必还原。
 *   - Esc 关闭。
 *   - 当前页在桌面导航上有可见的选中态（aria-current）。
 */
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { COMPANY, TEL_HREF } from "@/lib/company";
import { NAV_ITEMS } from "@/lib/site";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Esc 关闭 + 焦点归位 + 锁滚动
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus(); // 焦点回到触发按钮
      }
    };

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  /*
   * 为什么"路由变化时收起菜单"写在 onClick 里，而不是 useEffect([pathname])：
   *   在 effect 里同步 setState 会触发级联渲染（lint: react-hooks/set-state-in-effect）。
   *   菜单收起本就是"用户点了导航项"这一事件的直接结果，属于事件处理，不是副作用同步，
   *   所以放在 onClick 里语义更正确，也少一次无谓渲染。
   */

  return (
    <header className="sticky top-0 z-40 border-b-2 border-border bg-background">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-4 px-4 py-3 sm:px-6">
        <Link
          href="/"
          className="font-head text-base leading-tight sm:text-lg"
          aria-label={`${COMPANY.name} 首页`}
        >
          {COMPANY.name}
        </Link>

        {/* 桌面导航 */}
        <nav aria-label="主导航" className="ml-auto hidden md:block">
          <ul className="flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "inline-block border-2 px-3 py-1.5 text-sm",
                      active
                        ? "border-border bg-brand-yellow shadow-sm"
                        : "border-transparent hover:border-border hover:bg-card hover:shadow-sm"
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* 常驻电话（桌面） */}
        <a
          href={TEL_HREF}
          className="ml-auto hidden border-2 border-border bg-brand-green px-3 py-1.5 text-sm shadow-sm nb-lift md:ml-0 md:inline-block"
        >
          电话 {COMPANY.phone}
        </a>

        {/* 手机端：电话 + 汉堡 */}
        <div className="ml-auto flex items-center gap-2 md:hidden">
          <a
            href={TEL_HREF}
            className="border-2 border-border bg-brand-green px-2.5 py-1.5 text-sm shadow-sm"
          >
            致电
          </a>
          <button
            ref={triggerRef}
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "关闭导航菜单" : "打开导航菜单"}
            className="border-2 border-border bg-card px-2.5 py-1.5 text-sm shadow-sm"
          >
            {open ? "关闭" : "菜单"}
          </button>
        </div>
      </div>

      {/* 手机端展开面板 */}
      {open && (
        <div
          id="mobile-nav"
          className="border-t-2 border-border bg-background md:hidden"
        >
          <nav aria-label="移动端导航">
            <ul className="px-4 py-3 sm:px-6">
              {NAV_ITEMS.map((item) => {
                const active = pathname === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "block border-2 px-3 py-2.5 text-base",
                        active
                          ? "border-border bg-brand-yellow shadow-sm"
                          : "border-transparent"
                      )}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      )}
    </header>
  );
}
