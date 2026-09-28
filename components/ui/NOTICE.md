# 组件来源与授权说明

本目录下的 `.tsx` 组件源码来自 **neobrutalism.com** 组件注册表（Radix UI 变体），
通过 shadcn CLI 拉取落库：

```
npx shadcn@4.21.0 add @neobrutalism/<component>
```

注册表地址模式：`https://neobrutalism.com/r/radix/<component>.json`

已拉取：`button`、`card`、`badge`、`dialog`、`accordion`

## 授权依据

neobrutalism.com 服务条款（**2026-06-26 版**）第 4 条「组件代码」明确：

> 组件是开源的，**允许商用（在个人和商业项目中使用、修改和分发），署名非强制**。
> 付费档仅提供模板、区块、Figma 套件等增值内容。

**结论：本项目使用这些组件无需付费，允许商用，无授权风险。**（对应 PRD §3.2）

## 本项目对组件源码的改动

为让组件符合本项目的设计令牌，做了以下调整（**未改变组件行为**）：

1. 在本项目 `app/globals.css` 中用 `@theme` / `:root` 覆盖 Tailwind 的
   `--radius-*` 与 `--shadow-*` 标度，使组件使用的 `rounded` / `shadow-md`
   等工具类解析为**零圆角**与**无模糊实体偏移阴影**。
   —— 采用覆盖令牌而非逐个改组件，是为了保留组件源码的原始形态，便于将来升级。

2. shadcn `init` 曾向 `app/layout.tsx` 注入 `Geist` 字体并占用 `--font-sans` 令牌。
   该注入已移除（详见 `app/layout.tsx` 顶部注释与 `tests/theme.test.ts` 的断言）。
   **若将来重跑 `shadcn init`，请重新检查 `app/layout.tsx` 与 `app/globals.css`。**

3. `components.json` 的 `tailwind.css` 已修正为 `app/globals.css`。
   （`init` 时项目内存在另一个 .css 备份文件，导致 shadcn 误改了那个文件。）
