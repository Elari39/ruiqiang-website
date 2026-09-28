"use client";

/**
 * 可复制的地址（PRD §4.5）。
 *
 * 剪贴板 API 的实际坑：
 *   `navigator.clipboard` 只在**安全上下文**（https 或 localhost）可用。
 *   部署到 Vercel 后是 https，没问题；但本地用 IP 访问、或将来落到 http 环境时
 *   它会是 undefined，直接调用会抛 TypeError。
 *   因此这里保留 `document.execCommand("copy")` 兜底路径 —— 它虽已废弃，
 *   但在不安全上下文里仍是唯一可用方案。
 *
 * 提示语必须用 text 节点渲染（而不是 alert），且要能被读屏软件播报（role="status"）。
 */
import { useEffect, useRef, useState } from "react";

async function copyText(text: string): Promise<boolean> {
  // 首选：异步剪贴板 API
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // 权限被拒或非安全上下文，落到兜底
    }
  }

  // 兜底：textarea + execCommand
  if (typeof document === "undefined") return false;
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "-1000px";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

export function CopyAddress({ address }: { address: string }) {
  const [state, setState] = useState<"idle" | "ok" | "fail">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const onCopy = async () => {
    const ok = await copyText(address);
    setState(ok ? "ok" : "fail");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("idle"), 2200);
  };

  return (
    <div className="mt-2">
      <p className="break-all">{address}</p>
      <button
        type="button"
        onClick={onCopy}
        className="mt-3 border-2 border-border bg-brand-yellow px-3 py-1.5 text-sm shadow-sm nb-lift"
      >
        复制地址
      </button>
      <p role="status" aria-live="polite" className="mt-2 min-h-5 text-sm">
        {state === "ok" && "已复制到剪贴板"}
        {state === "fail" && "复制失败，请手动选择文字复制"}
      </p>
    </div>
  );
}
