"use client";

/**
 * 可复制的地址（PRD §4.5）
 *
 * ## 为什么这个组件比看起来复杂
 *
 * `navigator.clipboard.writeText` 有两个真实边界，生产上都会遇到：
 *   1. **只在安全上下文可用**（https / localhost）。落到 http、或用局域网 IP
 *      访问时 `navigator.clipboard` 是 `undefined` —— 直接调用会抛 TypeError。
 *   2. **即便存在也可能被拒**：用户拒绝剪贴板权限、页面不在焦点、或某些
 *      内嵌 WebView，`writeText` 会 reject。
 *
 * 降级策略本身写在 `lib/clipboard.ts`（纯逻辑，可在 Node 里穷举测试），
 * 本组件只负责：调用它、给出**可见反馈**、并在自动复制不可用时
 * 帮用户选中文字 + 给出明确的手动指引。
 *
 * ## 反馈要求（A6 验收）
 * 成功与失败都必须有可见反馈，且要能被读屏软件播报（role="status"）。
 * 反馈文案放在按钮下方而非 alert，避免打断用户、也不阻塞截图验证。
 */
import { useEffect, useRef, useState } from "react";
import { copyText } from "@/lib/clipboard";

type CopyState = "idle" | "ok" | "manual";

export function CopyAddress({ address }: { address: string }) {
  const [state, setState] = useState<CopyState>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const onCopy = async () => {
    const result = await copyText(address);
    setState(result);

    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("idle"), 4000);

    // 手动路径下顺手帮用户选中文字，少一步操作
    if (result === "manual") {
      try {
        const sel = window.getSelection();
        if (textRef.current && sel) {
          const range = document.createRange();
          range.selectNodeContents(textRef.current);
          sel.removeAllRanges();
          sel.addRange(range);
        }
      } catch {
        // 选区失败不影响已给出的手动指引
      }
    }
  };

  return (
    <div className="mt-2">
      <p ref={textRef} className="break-all select-all">
        {address}
      </p>

      <button
        type="button"
        onClick={onCopy}
        className="mt-3 border-2 border-border bg-brand-yellow px-3 py-1.5 text-sm shadow-sm nb-lift"
      >
        复制地址
      </button>

      {/* 反馈区：成功与失败都有可见文案，且可被读屏播报 */}
      <p role="status" aria-live="polite" className="mt-2 min-h-10 text-sm">
        {state === "ok" && (
          <span className="inline-block border-2 border-border bg-brand-green px-2 py-1">
            已复制到剪贴板
          </span>
        )}
        {state === "manual" && (
          <span className="inline-block border-2 border-border bg-brand-orange px-2 py-1">
            自动复制不可用，已为你选中地址文字，请按 Ctrl/Cmd + C 复制
          </span>
        )}
      </p>
    </div>
  );
}
