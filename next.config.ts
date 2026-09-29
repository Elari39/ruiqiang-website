import type { NextConfig } from "next";

/**
 * 平台无关的配置 —— 没有任何平台专属设置。
 *
 * 源码侧零平台锁定：仓库里唯一与平台相关的文件是 `netlify.toml`
 * （增量配置，其他平台完全忽略它），换平台只需增删那一个文件。
 * `tests/deploy.test.ts` 有断言钉住这一点
 * （不得出现 `output:"export"`、不得把 images 整体关成 unoptimized）。
 */
const nextConfig: NextConfig = {
  /**
   * 不对外暴露 `X-Powered-By: Next.js`。
   *
   * 线上实测该响应头是存在的。它不是漏洞，但属于无收益的技术栈指纹 ——
   * 攻击面探测的第一步通常就是收集这类头。既然没有任何功能依赖它，
   * 关掉即可。
   */
  poweredByHeader: false,

  /**
   * 安全响应头。
   *
   * ## 为什么放在这里，而不是 `netlify.toml`（线上实测得出的结论）
   *
   * 原本这些头写在 `netlify.toml` 的 `[[headers]] for = "/*"` 里。部署后逐项
   * 核对线上响应头，发现**它只对静态资源生效，对 HTML 页面只生效一半**：
   *
   *   资源 `/images/storefront-1600.webp`
   *     ✅ Referrer-Policy / ✅ X-Frame-Options / ✅ X-Content-Type-Options
   *   页面 `/`
   *     ❌ Referrer-Policy / ❌ X-Frame-Options / ✅ X-Content-Type-Options
   *
   * 原因是 HTML 响应由 Netlify 的 Next.js 运行时（`@netlify/plugin-nextjs`）
   * 接管，它会自带一套响应头，`/*` 规则里只有一部分能透到最终响应。
   * 结果就是**点击劫持防线（X-Frame-Options）在所有 HTML 页面上其实并不存在** ——
   * 而这类"配置写了、线上没有"的落差，正是本项目反复踩到的同一类问题。
   *
   * 改用 Next 自己的 `headers()`：它在 Next 服务端生效，静态页与动态响应都会带上。
   *
   * ## 与 netlify.toml 的分工（避免"同一个头两处配置"）
   *
   *   - 安全响应头 → 本文件（唯一来源）
   *   - 缓存策略（`/images/*` 一周、`/_next/static/*` 一年 immutable）→ netlify.toml
   *     （边缘层规则，对静态资源实测可靠）
   *
   * 即：**任何一个响应头都只有一个来源**，不会出现两边口径漂移。
   */
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
    ];
  },
};

export default nextConfig;
