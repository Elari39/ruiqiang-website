import type { NextConfig } from "next";

/**
 * 默认空配置 —— 这是**刻意的**，不是还没配。
 *
 * 保持默认意味着源码侧零平台锁定：仓库里唯一与平台相关的文件是 `netlify.toml`
 * （增量配置，其他平台完全忽略它），换平台只需增删那一个文件，
 * 源码一行都不用改。`tests/deploy.test.ts` 有断言钉住这一点
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
};

export default nextConfig;
