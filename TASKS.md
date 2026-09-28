# 执行清单 · 重庆锐强建筑劳务有限公司 官网

> 配套文档：`DEVELOPMENT_PLAN.md`（计划与决策依据）、`PLACEHOLDERS.md`（待替换值）、`DEPLOY.md`（部署手册）
> 本文件是**日常执行时的唯一清单**。每完成一项就勾掉，并在"验证输出"列写下实际命令输出摘要。
> 纪律：命令一律用绝对路径 Python / 全路径 git；不要用 bash 的 ls/cat/head/grep/sed/mkdir/sleep。

---

## 阶段 0 · 决策闸门（开工前必须关闭）

- [ ] **D1** 字体配对确认 —— 标题 = Archivo Black + Noto Sans SC 黑体；正文 = Space Grotesk + Noto Sans SC 400/500
- [ ] **D2** 地图路线确认 —— 默认「静态地图 + 外链官方地图」；若要交互地图需提供高德 AK
- [ ] **D3** OG 卡片方案确认 —— 默认用工程实拍图（保住"全静态"），不做中文自绘卡片
- [ ] **§6 冲突裁决** —— 默认「公开 5 张（门头 1 + 实拍 4），营业执照照零引用」，记录为对 PRD §7.5 的显式偏差
- [ ] 项目名确认 —— 建议 `ruiqiang-jianzhu`（决定最终 `*.vercel.app` 地址）

---

## M0 · A0 项目初始化与仓库

- [ ] A0.1 写 `.gitignore`（含 `node_modules/ .next/ out/ .vercel/ .netlify/ *.tsbuildinfo next-env.d.ts .env* !.env.example .workbuddy/ _shot/`）
- [ ] A0.2 `git init -b main`
- [ ] A0.3 `create-next-app@latest .` 就地脚手架（`--ts --tailwind --eslint --app --src-dir=false --import-alias "@/*" --turbopack --use-npm`）
- [ ] A0.4 确认 `img/`、`PRD.md`、`*.txt` 与源码同级；若脚手架拒绝非空目录，按 A0 步骤 3 的备份-移回兜底
- [ ] A0.5 首次提交，**提交前**看 `git diff --cached --stat`

**验证输出**
- `npm run build` → 退出码：____
- `npx tsc --noEmit` → 退出码：____

---

## M1 · A1 事实层与设计地基

- [ ] A1.1 `lib/company.ts` —— PRD §2 全字段，每字段带出处注释；**不含** projects/employees/clients/certificates
- [ ] A1.2 `lib/company.ts` —— 导出 `SCOPE_TEXT`（§2.1 原文逐字）
- [ ] A1.3 `lib/site.ts` —— `SITE_URL` 读环境变量、导航数组、`TEL_LINK`、`MAIL_LINK`
- [ ] A1.4 `app/layout.tsx` —— 4 个字体变量接入，中文 `preload:false`，`<html lang="zh-CN">`
- [ ] A1.5 **实测 Noto Sans SC 900 是否可取**；失败即按 D1 备选回退
- [ ] A1.6 `app/globals.css` —— `--font-head`/`--font-body`/`--brand-*`/`.nb-border`/`.nb-shadow`/`.nb-press`
- [ ] A1.7 `prefers-reduced-motion` 兜底

**验证输出**
- 中文 `<h1>` computed font-family 指向：____（须为 Noto Sans SC，非系统默认）
- `/` 首屏 woff2 总请求体积：____ KB（**须 ≤ 800**）

---

## M1 · A2 图片管线（含合规闸门）

- [ ] A2.1 文件名白名单（5 张可发布图），**默认拒绝**未列名输入
- [ ] A2.2 显式拒绝 `c9231b84a2a8285c28081548ec3cfb41.jpg`，命中即 `exit 1`
- [ ] A2.3 `scripts/build-images.mjs`（sharp）：1600 / 800 两档 × AVIF + WebP
- [ ] A2.4 派生品写 `public/images/{key}-{w}.{ext}`；命名映射：`storefront` / `rebar-slab` / `rebar-crew` / `steel-frame-slab` / `steel-frame-wide`
- [ ] A2.5 OG 卡图裁切 `public/images/og-cover.jpg`（1280×720，取自 `steel-frame-wide`）
- [ ] A2.6 **不加**任何文字水印
- [ ] A2.7 生成 `scripts/image-report.txt`（已处理 / 已跳过 / 拒绝）
- [ ] A2.8 **`public/` 全盘体积扫描**，确认 `_orig_not_published/` 零进入、无 >400 KB 的原始 jpg

**验证输出**
- 每张派生品最大体积：____ KB（**须 < 300**）
- `public/` 内是否存在 `c9231b84` 或 `storefront.jpg`：____（**须为"否"**）
- `image-report.txt` 拒绝计数：____（**须含营业执照照 1 张**）

---

## M1 · A3 neobrutalism 主题接入

- [ ] A3.1 **先验**注册表 URL 返回 200 + 合法 JSON（`https://neobrutalism.com/r/radix/button.json`）
- [ ] A3.2 `npx shadcn@4.21.0 init`（Tailwind v4 流程；**不建** `tailwind.config.js`）
- [ ] A3.3 若 `init` 覆盖 `globals.css` → 以 A1 令牌为准手工合并
- [ ] A3.4 拉取组件：button / card / dialog / accordion / badge /（可选）carousel
- [ ] A3.5 把组件内硬编码色值替换为 `--brand-*` / `--ink` 令牌
- [ ] A3.6 确认零圆角、无模糊阴影
- [ ] A3.7 `components/ui/NOTICE.md` 记录许可证依据（neobrutalism ToS 2026-06-26 §4）

**验证输出**
- `grep -r "border-radius" components/ui/` 是否有非 0 值：____（**须为"否"**）
- `npx tsc --noEmit` → 退出码：____

---

## M2 · A4 五个页面

- [ ] A4.1 `app/page.tsx` 首屏：公司全称 + 定位 + 「立即致电」+「查看服务」+ 门头图
- [ ] A4.2 `app/page.tsx` 业务能力 4 卡（劳务分包 / 工程施工 / 装饰装修 / 配套服务）
- [ ] A4.3 `app/page.tsx` 工程实拍精选 + 公司信息速览 + 联系方式
- [ ] A4.4 `app/services/page.tsx` 三组服务（严格照 PRD §4.2，不增删条目）
- [ ] A4.5 `app/services/page.tsx` 底部折叠区 = §2.1 原文逐字
- [ ] A4.6 `app/gallery/page.tsx` 响应式网格 + Dialog 放大 + Esc 关闭 + 中文 alt
- [ ] A4.7 `app/about/page.tsx` 公司简介（txt 第 13 行改官网口吻，不新增事实）
- [ ] A4.8 `app/about/page.tsx` 工商登记信息表（§2 全字段）+ 营业执照**文字**摘要卡
- [ ] A4.9 `app/contact/page.tsx` 电话 / 邮箱 / 可复制地址 / 地图（A6）
- [ ] A4.10 `components/SiteHeader.tsx`（含汉堡菜单，关闭后焦点回到触发按钮）
- [ ] A4.11 `components/SiteFooter.tsx`（含 ICP 备案号**注释**占位）
- [ ] A4.12 `components/MobileCallBar.tsx` + `app/layout.tsx` 的 `<main>` 预留等量 `pb`
- [ ] A4.13 **文案逐句回溯**：每句事实能否在 txt / PRD §2 找到出处？无出处即删

**验证输出**
- 5 条路由 HTTP 状态：____ / ____ / ____ / ____ / ____
- 电话 href：____（须 `tel:19936641843`）邮箱 href：____（须 `mailto:1053210854@qq.com`）

---

## M2 · A5 响应式与视觉收口

- [ ] A5.1 无头 Chrome 截 375 / 768 / 1440 × 5 页 = 15 张（`_shot/`，记得 `--no-proxy-server`）
- [ ] A5.2 **逐张用 Read 工具打开看**，不是"生成了就算验过"
- [ ] A5.3 三档 `document.documentElement.scrollWidth <= window.innerWidth` 全部成立
- [ ] A5.4 长中文词（"建筑工程机械与设备租赁"等）折行未截断、未溢出、未被阴影遮挡
- [ ] A5.5 悬浮致电条未遮住页面底部内容
- [ ] A5.6 hover 位移方向正确（向阴影反方向）、按下向内压、无淡入淡出

**验证输出**
- 三档 scrollWidth vs innerWidth：____ / ____ / ____
- 目视发现的溢出问题：____

---

## M2 · A6 联系方式页收口

- [ ] A6.1 取注册地址经纬度（**正常网络下**用高德/百度网页版或 geocode API），固化进 `lib/company.ts`，注明来源 + "未实地核验"
- [ ] A6.2 `components/MapEmbed.tsx` 静态地图 + 「在大地图中查看」外链
- [ ] A6.3 保留 `{/* SDK-MODE */}` 注释分支与 `.env.local` 的 `NEXT_PUBLIC_AMAP_KEY` 位置
- [ ] A6.4 外链一律 `target="_blank" rel="noopener noreferrer"`
- [ ] A6.5 地址复制：处理 `navigator.clipboard` 不存在 / 写入被拒，降级 + 可见反馈
- [ ] A6.6 手机端点击可唤起拨号盘（或确认 href 正确）

**验证输出**
- 坐标来源：____ 取值：____
- 复制在 HTTPS 与 HTTP 下的行为：____

---

## M3 · A7 SEO 与技术收口

- [ ] A7.1 5 页各自 `metadata`，`title` / `description` 两两不重复
- [ ] A7.2 `app/sitemap.ts` → `/sitemap.xml`（绝对 URL，基于 `SITE_URL`）
- [ ] A7.3 `app/robots.ts` → `/robots.txt`（**不要**同时留 `public/robots.txt`）
- [ ] A7.4 `LocalBusiness` JSON-LD 注入（字段取自 `lib/company.ts`；**禁止** rating/review/award）
- [ ] A7.5 JSON-LD 语法校验通过
- [ ] A7.6 `npm run build` 输出中 **5 条路由均为 `○ (Static)`**，无 `ƒ (Dynamic)`
- [ ] A7.7 `npm run lint` 与 `npx tsc --noEmit` 双 0

**验证输出**
- 5 条路由渲染模式：____
- `/sitemap.xml`、`/robots.txt` 状态码：____ / ____

---

## M3 · A8 部署

- [ ] A8.1 上线前最后一次提交（`git diff --cached --stat` 过一遍）
- [ ] A8.2 `npx vercel@60.1.3 login` —— **由你本人完成授权**
- [ ] A8.3 暂停确认：scope/team 与项目名（决定最终 URL）
- [ ] A8.4 `npx vercel@60.1.3 link`
- [ ] A8.5 `npx vercel@60.1.3 --prod`
- [ ] A8.6 回读线上 URL → 写入 `PLACEHOLDERS.md` → 同步设置 `NEXT_PUBLIC_SITE_URL` → **再提交一次**
- [ ] A8.7 无痕窗口 + 手机网络验证 5 条路由与联系方式
- [ ] A8.8 （备选）Netlify 路径演练：见 `DEPLOY.md`；注意 `output:"export"` 与 `images.unoptimized` 的联动

**验证输出**
- 线上 URL：____
- 无痕窗口验证结果：____

---

## 最终验收（对应 PRD §7）

| # | 项 | 通过 | 证据 |
|---|---|---|---|
| 1 | build / tsc / lint 三 0 | ⬜ | |
| 2 | 5 条路由静态生成 | ⬜ | |
| 3 | 三档无横向滚动、无溢出 | ⬜ | `_shot/` 15 张 |
| 4 | tel: / mailto: 正确 | ⬜ | |
| 5 | 5 张公开图渲染、有中文 alt、体积远低于原图 | ⬜ | `image-report.txt` |
| 6 | sitemap / robots 可访问；title·description 唯一 | ⬜ | |
| 7 | 无营业执照照片；无编造事实 | ⬜ | `public/` 扫描 + 文案回溯记录 |
| 8 | 输出可访问 https 地址 | ⬜ | 线上 URL |
| — | **偏差记录**：PRD §7.5 要求"6 张全部渲染"，本计划按 §5.4 合规约束公开 5 张 | ⬜ | 见 `DEVELOPMENT_PLAN.md` §6 |
