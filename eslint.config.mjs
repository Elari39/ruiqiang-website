import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    // 注意：`.next/**` 只匹配 `.next` 本身。构建包装脚本（scripts/run-next.mjs）
    // 会在删除失败时把旧构建兜底改名为 `.next.stale` / `.next.stale2` 等目录，
    // 它们是构建产物而非源码；若不显式忽略，lint 会把编译后的 chunk
    // 当成源码报一堆假错误。
    ".next/**",
    ".next*.stale*",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
