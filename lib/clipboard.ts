/**
 * 剪贴板复制的纯逻辑（与 React 解耦，便于在 Node 里直接单测）
 *
 * 为什么不把这段逻辑写在组件里再用 jsdom 测：
 *   本项目测试环境是 node（没有 jsdom），而为了测一个 30 行的降级逻辑
 *   引入 jsdom + testing-library 是不划算的。
 *   把环境依赖（navigator / document / execCommand）作为参数注入之后，
 *   这段逻辑就是纯粹的分支判断，可以在 Node 里用假对象穷举所有路径。
 *
 * 三条路径必须都被覆盖（A6 验收要求"不静默失败"）：
 *   1. clipboard API 可用且成功         -> "ok"
 *   2. clipboard 不存在（非安全上下文） -> 走 execCommand
 *   3. clipboard 存在但 reject（被拒）  -> 走 execCommand
 *   4. 两条路都不可用/都失败            -> "manual"（由调用方给出人工指引）
 */

export type CopyResult = "ok" | "manual";

/** 临时 textarea 需要的最小接口 */
export type TempElement = {
  value: string;
  style: Record<string, string>;
  setAttribute: (k: string, v: string) => void;
};

/** 只依赖我们用到的接口，便于注入假实现 */
export type ClipboardEnv = {
  /** 形如 navigator 的对象；`clipboard` 可能不存在（非安全上下文） */
  nav?: {
    clipboard?: {
      writeText: (text: string) => Promise<void>;
    };
  };
  /** 形如 document 的对象；缺省表示无法创建临时元素 */
  doc?: {
    createElement: (tag: string) => TempElement;
    body: {
      appendChild: (el: TempElement) => void;
      removeChild: (el: TempElement) => void;
    };
  };
  /** 形如 document.execCommand 的兜底执行器 */
  execCommand?: (cmd: string) => boolean;
  /**
   * 临时元素已插入文档、即将执行 execCommand 时的回调。
   * 真实环境在这里做 focus()/select() —— 必须发生在插入文档之后，
   * 否则选区无效（这是 execCommand 兜底最常见的失败原因）。
   */
  onTempElement?: (el: TempElement, text: string) => void;
};

export async function copyText(
  text: string,
  env: ClipboardEnv = defaultEnv()
): Promise<CopyResult> {
  // 路径一：异步剪贴板 API（仅安全上下文可用）
  if (env.nav?.clipboard?.writeText) {
    try {
      await env.nav.clipboard.writeText(text);
      return "ok";
    } catch {
      // 被拒（权限/失焦/WebView）—— 继续兜底，不直接判失败
    }
  }

  // 路径二：textarea + execCommand
  if (env.doc && env.execCommand) {
    let ta: TempElement | null = null;
    try {
      ta = env.doc.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      // 必须真实存在于文档流才能被 select()，但用像素级隐藏避免页面抖动
      ta.style.position = "fixed";
      ta.style.top = "0";
      ta.style.left = "0";
      ta.style.width = "1px";
      ta.style.height = "1px";
      ta.style.opacity = "0";
      ta.style.padding = "0";
      ta.style.border = "none";

      env.doc.body.appendChild(ta);
      env.onTempElement?.(ta, text);
      const ok = env.execCommand("copy");
      return ok ? "ok" : "manual";
    } catch {
      return "manual";
    } finally {
      // 无论成功失败都要清理，避免在 DOM 里留下垃圾节点
      if (ta && env.doc) {
        try {
          env.doc.body.removeChild(ta);
        } catch {
          /* 已被移除 */
        }
      }
    }
  }

  // 路径三：环境不支持任何复制方式
  return "manual";
}

/** 浏览器里的真实环境。Node 测试中不调用它。 */
export function defaultEnv(): ClipboardEnv {
  const g = globalThis as unknown as {
    navigator?: ClipboardEnv["nav"];
    document?: {
      createElement: (t: string) => unknown;
      body: ClipboardEnv["doc"] extends undefined ? never : NonNullable<ClipboardEnv["doc"]>["body"];
      execCommand?: (c: string) => boolean;
    };
  };
  const doc = g.document;
  if (!doc) return { nav: g.navigator };

  type DomEl = TempElement & {
    focus?: () => void;
    select?: () => void;
    setSelectionRange?: (a: number, b: number) => void;
  };

  return {
    nav: g.navigator,
    doc: {
      createElement: (tag: string) => doc.createElement(tag) as DomEl,
      body: doc.body,
    },
    execCommand: doc.execCommand
      ? (c: string) => doc.execCommand!(c)
      : undefined,
    onTempElement: (el, text) => {
      const e = el as DomEl;
      e.focus?.();
      e.select?.();
      e.setSelectionRange?.(0, text.length);
    },
  };
}
