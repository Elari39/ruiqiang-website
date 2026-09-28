# 重庆锐强建筑劳务有限公司 官网 · 开发计划

> 版本：v1.0
> 依据：`PRD.md` v1.0
> 部署目标：**Vercel 为首选**（PRD 指定），**Netlify 为等效备选**（本计划的部署层设计对两者同时成立）
> 计划性质：可直接执行 —— 每个任务都给出目标路径、关键内容、验证命令
> 日期：2026-09-28

---

## 0. 计划前置：三处必须先补齐的规格缺口

PRD 在信息架构、合规、验收上已经足够严。但**按 PRD 字面直接开工，会在第 3 步卡住**——因为以下三件事 PRD 没有给出可执行值。本计划已给出建议值，其中 D1、D2 **建议在动键盘前用一分钟确认**。

### D1（阻塞）字体具体版本与文件体积 —— 决定站点是否"打开即白屏"

PRD §5.2 要求"中英双字体配对"并自托管，但未指定字重文件。

- 现状事实：Google Fonts 上 **`Noto Sans SC` 的 900 字重不存在**，最高为 **`Noto Sans SC Black`（字重 100）** —— 900 会直接取字失败。
- 体积风险：单份 Noto Sans SC 简体中文 woff2 约 **1.1–1.4 MB**。若按 PRD 每页无脑加载两个中文字重，首屏字体体积超过 **2.5 MB**，与 PRD §6.1"图片优化（WebP/AVIF）"的节流意图直接冲突，且移动端体验会显著劣化。

**本计划采用的方案（A1 已按此设计）：**

| 令牌 | 拉丁/数字 | 汉字 | 加载策略 |
|---|---|---|---|
| `--font-head` | Archivo Black（固定） | `Noto Sans SC Black`（黑体 100，视觉等价于 900） | 仅首页 + 各页 `<h1>` 场景加载；`display: swap` |
| `--font-body` | Space Grotesk | `Noto Sans SC`（400 + 500，且 500 用于强调） | 全站加载；400 必载，500 按需 |

- Archivo Black（≈24 KB）与 Space Grotesk（2 份 ≈60 KB）**只含拉丁字形**，体积可忽略，全站常驻。
- 中文两份 **按 `unicode-range` 由 `next/font` 自动切成子集并 `preload: false`**，浏览器只取页面真正用到的子集。
- 兜底：任何方案下都必须给 `--font-head` / `--font-body` 配 `local()` 兜底链（`PingFang SC` / `Microsoft YaHei`），保证字体加载失败时版式不崩、文字永不隐形。

> **需你确认**：接受"标题黑体 100 + 正文 400/500"这一配对？若你希望标题用**思源黑体 Heavy 的替代**或改成 Noto Serif SC，本节 A1/A2 的字体清单需同步替换（工作量约 15 分钟）。

### D2（阻塞）"在线地图"具体形式 —— PRD §4.5 只写了"在线地图"四个字

这直接决定 A6 怎么写，且**两条路线的失败模式完全不同**：

| 路线 | 成本 | 风险 |
|---|---|---|
| **A. 高德/百度 JS SDK 嵌入** | 需申请并持有 AK 密钥 | 站点是纯静态、无后端，密钥必然打在客户端包里。高德 JS API 的 AK 必须配**域名白名单**；PRD §9 承诺无自有域名、用 `*.vercel.app`，**白名单需填 `*.vercel.app`，高德控制台对通配符的支持并不稳定**。密钥泄露或配置错会显示"地图加载失败"灰块 |
| **B. 静态地图图片 + 外链图商官方地图页**（推荐） | 零配置、零密钥、零配额 | 无交互拖拽；但本场景"找过来"的需求用不到拖拽 |

**本计划采用 B 路线**作为 A6 的默认实现，并把它写成"可被用户一键替换成 A 路线"的结构：`components/MapEmbed.tsx` 中保留一个被注释的 `// SDK-MODE` 分支，将来要切交互地图只改这一个文件。

> **需你确认**：接受"静态地图 + 一键跳转官方地图页"？若必须有可拖拽交互地图，请提供高德 AK，我改走 A 路线。

**地理编码状态说明（必须诚实标注）**：注册地址"重庆市大足区棠香街道二环北路中段187号附50号"的精确经纬度，**本机在本次会话中未能通过公开地理编码服务取到** —— 无头环境下 `nominatim.openstreetmap.org` 直连超时、走代理返回 `502`。因此：

- A6 的第一步是**在正常网络下取一次坐标**，取到后固化进 `lib/company.ts`，并标注 `// 坐标来源：<服务名> 查询结果，未人工实地核验`。
- **验收时不得宣称地图标点"精确到门牌"**。用户在浏览器中打开官方地图核对一次即可定稿。
- 高德/百度 API 端点在本机可达（已验证连通，仅因无有效密钥而拒绝），所以**在真实开发时段用你自己的浏览器完成这一步是可行的**。

### D3（非阻塞）分享卡片（OG 图）—— 有意不在本项目内做

PRD §6.1 列了 "Open Graph 分享卡片"，§10 第 7 条提出中文卡片方案。本计划决定：

- **做**：`og:title` / `og:description` / `og:url` / `og:type` / `og:image` / `og:locale=zh_CN` 全部元数据，且 `og:image` 指向一张**真实工程实拍图**（1280×720 裁切版，由 A2 产出）。
- **不做**：用中文字体在构建期渲染生成"纯色块+重边框+中文"的自绘 OG 图。

理由：`@vercel/og` / `satori` 渲染中文需把 **≥1.1 MB 的中文 ttf 打进 Serverless 函数**，逼近函数体积上限，且会把站点从"**全静态**（PRD §7.2 硬验收）"变成含运行时函数。用实拍图做卡片既符合合规（实拍图本就是可公开素材），又保住纯静态。

> **需你确认**：接受用实拍图做分享卡片？若坚持中文自绘卡片，需接受新增一个 `/api/og` 边缘函数，且 PRD §7.2 的"静态生成"验收措辞要放宽。

---

## 1. 执行前的环境事实（已在本机核实）

| 项 | 实测值 | 结论 |
|---|---|---|
| Node（managed） | `C:\Users\Elaina\.workbuddy\binaries\node\versions\22.22.2-3\node.exe` → **v22.22.2** | Next 16.3.6 要求 `node >=20.9.0` → **满足** |
| npm | **10.9.7** | 可用 |
| git | **2.55.0.windows.3**，二进制在 `C:\Program Files\Git\cmd\git.exe` | 可用（注意：bash 里 `git` 是坏的 shim，**须写全路径**） |
| Vercel CLI | **未安装** | A8 需 `npx vercel@60.1.3` |
| 本机 bash | 缺 coreutils（`ls`/`cat`/`head`/`grep`/`sed`/`mkdir`/`sleep` 全不可用） | **所有命令用绝对路径 Python 执行**；输出重定向到文件再读 |
| 仓库状态 | **尚未 `git init`**，`fatal: not a git repository` | A0 第一步就是初始化 |

### 1.1 PRD 依赖版本复核（逐个查 npm registry，**全部为真实存在的最新版**）

```
next        = 16.3.6   ← dist-tags.latest 一致
react       = 19.3.0   ← latest 一致
tailwindcss = 4.3.3    ← latest 一致
shadcn      = 4.21.0   ← latest 一致
vercel      = 60.1.3   ← latest 一致
```

> PRD 中所有版本号**无需修正**。唯一要留意：Next 16 与 React 19.3 属同代，`create-next-app` 默认即可对齐；但 **Tailwind v4 与 shadcn CLI 4.x 的初始化流程与 v3 时代差异较大**（v4 走 CSS-first 配置、无 `tailwind.config.js`），A1 必须按 v4 方式落配置，不要照搬老教程。

### 1.2 素材现状（已核实）

```
img/6b47f2f3832295f939ea301d097b2f6a.jpg   1,233,392 B  工程实拍
img/7643475e202712baf7d1b475fccaf030.jpg   1,401,283 B  工程实拍
img/98f59ef534ca3d54027df8e1ee09956b.jpg   1,455,266 B  工程实拍
img/c23bea8ddb08abbda4e419ea2bd5a17a.jpg   1,530,027 B  工程实拍
img/c9231b84a2a8285c28081548ec3cfb41.jpg     693,623 B  营业执照照（**不得发布**）
img/_orig_not_published/storefront.jpg        236,164 B  门头照（复用图，见下）
```

**已执行的一处保护性调整**：门头照 `c656bb41….jpg` 被 PRD 同时用作"首页首屏"和"关于我们"两个位置，属**跨页面复用**。而 A2 的图片管线会为每张图产出"内容哈希命名"的副本，届时 `img/` 会同时存在原始与派生两份文件，存在**误发布原始大图**的风险。为消除该风险，我已把这张图的原始文件移入 `img/_orig_not_published/storefront.jpg`，A2 将从归档目录读它、把派生品写进 `public/`。**`_orig_not_published/` 目录在整个计划中一律不进 `public/`。**

> 注：PRD 中该文件原名为 `c656bb41de0b1c32ce9286aee54289ce.jpg`，已归档为 `storefront.jpg`。这是本计划唯一一处对既有文件的改动，可随时改回。

---

## 2. 交付物总表

| # | 文件 | 内容 |
|---|---|---|
| 1 | `DEVELOPMENT_PLAN.md` | 本文件，可执行开发计划 |
| 2 | `TASKS.md` | 逐任务清单，含验收命令与勾选框（**日常执行看这份**） |
| 3 | `PLACEHOLDERS.md` | 待替换值台账（部署 URL、地图坐标、备案号等） |
| 4 | `DEPLOY.md` | Vercel 主路径 + Netlify 备选路径操作手册 |
| 5 | 完整 Next.js 源码 | A0–A8 产出 |
| 6 | 线上 `https://` 地址 | A8 产出 |

---

## 3. 里程碑总览

| 里程碑 | 任务 | 一句话目标 | 出口判据 |
|---|---|---|---|
| **M0 骨架** | A0 | 干净可跑的空壳 | `npm run dev` 打开 `http://localhost:3000` 显示页面，`tsc --noEmit` = 0 |
| **M1 地基** | A1–A3 | 事实、字体、主题、图片四件地基 | 字体令牌生效；6 图派生完成且 <300 KB；`img/` 原始大图零发布 |
| **M2 页面** | A4–A6 | 5 页 + 视觉 + 地图 | 5 条路由静态生成；三档宽度无横向滚动 |
| **M3 上线** | A7–A8 | SEO + 部署 | `sitemap.xml`/`robots.txt` 可访问；线上 URL 打开正常 |

**关键路径**：A0 → A1 → A2 → {A3, A4} → A5 → A6 → A7 → A8。A2 与 A3 可并行；A4 的页面骨架可与 A5 视觉打磨交替进行。

---

## 4. 任务卡（A0–A8）

> 每个任务包含：**目标 / 动作 / 验证 / 交付物 / 注意**。命令一律给出可直接粘贴的形式。

### A0 · 项目初始化与仓库

**目标**：拿到一个能跑、能提交的空 Next.js 项目，且在开始写代码前就锁死 git 边界。

1. **先写 `.gitignore`（在 `create-next-app` 之前）**
   必须包含：
   ```
   node_modules/
   .next/
   out/
   .vercel/
   .netlify/
   *.tsbuildinfo
   next-env.d.ts
   _ver_probe.txt
   _geo.txt
   .env*
   !.env.example
   .workbuddy/
   ```
   > 注意 `.env*` 与 `!.env.example` 的顺序 —— 没有第二行，将来 `NEXT_PUBLIC_SITE_URL` 无法进库。

2. **`git init`**
   ```bash
   "/c/Program Files/Git/cmd/git.exe" init -b main
   ```
   然后按你的机器约定，`git branch --unset-upstream main` 不必现在做（尚无远端）。

3. **脚手架**
   ```bash
   cd /f/WorkSpace/Coding/AI/ruiqiang-website
   "/c/Users/Elaina/.workbuddy/binaries/node/versions/22.22.2-3/node.exe" \
     "C:/Users/Elaina/AppData/Roaming/npm/node_modules/npm/bin/npm-cli.js" \
     create-next-app@latest . \
     --ts --tailwind --eslint --app --src-dir=false \
     --import-alias "@/*" --turbopack --use-npm
   ```
   - **必须在项目根目录"就地"创建**（`.`），使 `img/`、`PRD.md`、`.txt` 与源码同级，图片管线才能相对引用。
   - `--src-dir=false`：源码直接落根目录（`app/`、`components/`、`lib/`），减少一层无意义的 `src`。若你偏好 `src/`，全计划中的路径前缀相应加 `src/`。
   - `create-next-app` 可能因目录非空而拒绝。若拒绝，先备份 `PRD.md`/`img/`/`.txt` 到临时目录，脚手架完成后再移回，并**确认移动回来的是文件内容而非快捷方式**。

4. **提交**
   ```bash
   "/c/Program Files/Git/cmd/git.exe" add -A
   "/c/Program Files/Git/cmd/git.exe" commit -m "chore: Next.js 16.3.6 脚手架初始化"
   ```
   ⚠️ **提交前必看** `git diff --cached --stat`，确认 `img/` 下 5 个原始 jpg 与 `.txt`（含法定代表人姓名）**都已入库但未进 `public/`**。

**验证**
```bash
npm run build        # 退出码 0
npx tsc --noEmit     # 退出码 0
```
**交付物**：可运行的 Next 16 + React 19 + Tailwind 4 + TS 骨架。

---

### A1 · 事实层与设计地基

**目标**：把"企业事实"与"设计令牌"分别收进单一可信源，之后任何页面都只读这两处。

1. **`lib/company.ts`** —— 全站唯一事实源，字段照抄 PRD §2 表格，一个不漏：
   `name` / `uscc` / `legalPerson` / `registeredCapital`(=50) / `foundedAt`(=2023-06-30) / `companyType` / `address` / `registryAuthority` / `status`(开业) / `businessTerm` / `industry` / `registrationNo` / `orgCode` / `taxpayerId` / `district` / `phone`(=19936641843) / `email` / `businessScopeLicensed` / `businessScopeGeneral`。
   - 每字段**必须**带 `// 出处: 营业执照/txt` 注释。
   - 刻意**不**放任何 `projects[]`、`employees`、`clients`、`certificates` 字段 —— 用类型系统的"无字段"来防止后续有人顺手编造（PRD §7.7）。
   - 同步导出 `SCOPE_TEXT`（PRD §2.1 原文，逐字照抄，用于折叠区）。

2. **`lib/site.ts`** —— 站点级配置：`SITE_URL`（读 `process.env.NEXT_PUBLIC_SITE_URL`，缺省回退 `http://localhost:3000`）、导航数组、`TEL_LINK = "tel:19936641843"`、`MAIL_LINK = "mailto:1053210854@qq.com"`。
   > `SITE_URL` 做成环境变量，是 A8 换域名时**唯一**要改的地方。

3. **`app/layout.tsx`** —— 字体接入，严格按 §0/D1：
   ```ts
   import { Archivo_Black, Space_Grotesk, Noto_Sans_SC } from "next/font/google";
   const archivo = Archivo_Black({ subsets:["latin"], weight:"400", variable:"--font-latin-head", display:"swap" });
   const grotesk = Space_Grotesk({ subsets:["latin"], weight:["400","500"], variable:"--font-latin-body", display:"swap" });
   const noto = Noto_Sans_SC({ weight:["400","500"], variable:"--font-sc-body", display:"swap" });        // 正文
   const notoBlack = Noto_Sans_SC({ weight:"900", variable:"--font-sc-head", display:"swap", preload:false });
   ```
   > **注意**：`preload:false` 是给中文体的性能阀门；拉丁字体保持 `true`。若 `Noto_Sans_SC` 的 `900` 在 `next/font` 中报"字重不存在"，**回退为 `Black` 等价写法**（见 D1，必要时改用 `Noto_Sans_SC` 的 `weight:"900"` → 若仍失败则用 `Noto_Serif_SC` 或本地 ttf；这一步 A1 有实测确认义务）。

   `<html lang="zh-CN">` —— 中文站点**必须**是 `zh-CN`，否则部分浏览器会错误选择日文字形。

4. **`app/globals.css`** —— 令牌与 neobrutalism 原子类：
   ```css
   @import "tailwindcss";           /* Tailwind v4 CSS-first，不要建 tailwind.config.js */
   :root{
     --font-head: var(--font-latin-head), var(--font-sc-head), "PingFang SC","Microsoft YaHei",sans-serif;
     --font-body: var(--font-latin-body), var(--font-sc-body), "PingFang SC","Microsoft YaHei",sans-serif;
     --ink:#000; --paper:#fff;
     --brand-yellow:#FFD84D; --brand-blue:#4D7CFF; --brand-pink:#FF8FC7; --brand-green:#5FE07A; --brand-orange:#FFA24D;
   }
   .nb-border{ border:3px solid var(--ink); border-radius:0; }
   .nb-shadow{ box-shadow:6px 6px 0 0 var(--ink); }          /* 零模糊 */
   .nb-shadow-lg{ box-shadow:10px 10px 0 0 var(--ink); }
   .nb-press{ transition:transform .08s linear, box-shadow .08s linear; }
   .nb-press:hover{ transform:translate(-3px,-3px); box-shadow:9px 9px 0 0 var(--ink); }
   .nb-press:active{ transform:translate(2px,2px); box-shadow:3px 3px 0 0 var(--ink); }
   @media (prefers-reduced-motion: reduce){ .nb-press{ transition:none } }
   ```
   - 交互反馈**只做位移**，严禁淡入淡出（PRD §5.1）。
   - 零圆角通过 `border-radius:0` 与"不写 `rounded-*` 类"双向保证。

**验证**
- `npm run dev` 后，DevTools → Elements 里 `--font-head` 解析链包含 `--font-latin-head` 与中文字体变量。
- Elements 面板中中文 `<h1>` 的 computed `font-family` 指向 Noto Sans SC 而非系统默认。
- `/` 首屏 Network 面板中 **woff2 总请求体积不超 800 KB**（超标即 D1 的 `preload` 策略未生效）。

**交付物**：`lib/company.ts`、`lib/site.ts`、`app/layout.tsx`、`app/globals.css`。

---

### A2 · 图片管线（含合规闸门）

**目标**：6 张图产出"内容哈希命名 + 多尺寸 + WebP/AVIF"的派生品，且**技术上不可能**误发布营业执照照。

1. **建立派生品命名映射**（哈希名 → 语义名，避免文件名泄露出处与顺序）：

   | 原始文件 | 语义 key |
   |---|---|
   | `img/_orig_not_published/storefront.jpg` | `storefront`（门头，首页首屏 / 关于我们复用） |
   | `img/98f59ef534ca3d54027df8e1ee09956b.jpg` | `rebar-slab`（底板钢筋绑扎完成面） |
   | `img/7643475e202712baf7d1b475fccaf030.jpg` | `rebar-crew`（多名工人钢筋网作业） |
   | `img/6b47f2f3832295f939ea301d097b2f6a.jpg` | `steel-frame-slab`（钢结构厂房内楼板钢筋） |
   | `img/c23bea8ddb08abbda4e419ea2bd5a17a.jpg` | `steel-frame-wide`（大面积钢筋网施工） |
   | `img/c9231b84a2a8285c28081548ec3cfb41.jpg` | **不生成任何派生品** |

2. **合规闸门（硬性，写在脚本里）**
   脚本必须：
   - 以**文件名白名单**驱动，而不是"遍历 `img/`"。**默认拒绝**任何未列入白名单的输入。
   - 显式拒绝 `c9231b84a2a8285c28081548ec3cfb41.jpg`（营业执照照），命中即 `exit 1`。
   - 脚本末尾打印"已处理 N 张 / 已跳过 M 张 / 拒绝 K 张"，写入 `scripts/image-report.txt` 供 A2 验收留档。

3. **产出规格**
   - 尺寸：`1600`（桌面 hero/相册大图）与 `800`（卡片/缩略）两档。
   - 格式：`avif` + `webp`（Next `<Image>` 会自行在运行时按 `Accept` 挑选，**但**为满足"单图传输体积显著低于原图"的验收，仍需落盘多尺寸源）。
   - 派生品写入 `public/images/`，命名 `{key}-{w}.{ext}`。
   - **不含任何文字水印** —— 未经用户确认不得在实拍图上加公司名。

4. **实现方式**：用 `sharp`（Next 已内置依赖）写 `scripts/build-images.mjs`，或直接调本机 Python `Pillow`。**推荐 sharp**，避免额外依赖。
   ```bash
   node scripts/build-images.mjs
   ```

5. **OG 卡图**：从 `steel-frame-wide` 额外裁出 `1280×720` → `public/images/og-cover.jpg`（D3 结论）。

6. **发布隔离复核（这一步不能省）**
   ```bash
   # 用 Python 绝对路径执行，bash 的 ls/find 在本机不可用
   "C:/Users/Elaina/.workbuddy/binaries/python/versions/3.13.12/python.exe" -c "
   import os
   for root,d,f in os.walk('public'):
       for n in f: print(os.path.join(root,n), os.path.getsize(os.path.join(root,n)))
   "
   ```
   逐行确认：**没有任何条目来自 `img/_orig_not_published/`，也没有体积 >400 KB 的 jpg 直接躺在 `public/`**。

**验证**
- `public/images/` 内每张图 < 300 KB（AFTER 契约）。
- 用 Python 全盘 grep 确认 `public/` 下不存在 `c9231b84` 或 `storefront.jpg` 源文件。
- `scripts/image-report.txt` 中"拒绝 K 张"包含营业执照照 1 张。

**交付物**：`scripts/build-images.mjs`、`public/images/*`、`scripts/image-report.txt`。

---

### A3 · neobrutalism 主题接入

**目标**：把 neobrutalism 组件源码拉进仓库，并按本项目令牌改造，不含运行时依赖。

1. **初始化 shadcn（v4 注意）**
   ```bash
   npx shadcn@4.21.0 init
   ```
   - Tailwind v4 下 shadcn 的行為是**直接改 `app/globals.css` 注入 CSS 变量**、不生成 `components.json` 之外的 JS 配置。**不要**手工再建 `tailwind.config.js`（会与 v4 冲突）。
   - 若 `init` 覆盖了 A1 写好的 `globals.css`：**以 A1 的令牌为准手工合并回去**，`shadcn` 注入的色板变量保留但重命名为 `--nb-*` 前缀，避免与 `--brand-*` 混淆。

2. **拉组件（Radix 变体）**
   ```bash
   npx shadcn@4.21.0 add https://neobrutalism.com/r/radix/button.json
   npx shadcn@4.21.0 add https://neobrutalism.com/r/radix/card.json
   npx shadcn@4.21.0 add https://neobrutalism.com/r/radix/dialog.json      # 相册放大用
   npx shadcn@4.21.0 add https://neobrutalism.com/r/radix/accordion.json   # 经营范围折叠用
   npx shadcn@4.21.0 add https://neobrutalism.com/r/radix/badge.json
   npx shadcn@4.21.0 add https://neobrutalism.com/r/radix/carousel.json    # 相册移动端滑动（可选）
   ```
   ⚠️ **两个必须实测的点**：
   - 注册表地址以 `https://neobrutalism.com/r/radix/<name>.json` 为准（非 Radix 变体是 `/r/<name>.json`）。**A3 第一步先 `curl`/浏览器打开其中一个 URL 确认 200 且返回合法 JSON**。若注册表 URL 结构与预期不符，改为从其站点复制源码手工落 `components/ui/`，**逻辑不变、只是获取方式变**。
   - 每个组件拉下来后**把硬编码色值替换成 `--brand-*` / `--ink` 令牌**，并确认 `border-radius` 全为 0、阴影为无模糊实体偏移。

3. **许可证留痕**：`components/ui/` 目录下放 `NOTICE.md`，写明"组件源码来自 neobrutalism.com，其服务条款（2026-06-26）第 4 条允许商用与修改，署名非强制"（PRD §3.2 的结论落成仓库内可查的证据）。

**验证**
- `grep -r "border-radius" components/ui/` 结果中**无**非 0 值。
- `grep -rn "shadow-\(sm\|md\|lg\|xl\)" components/ui/` 应无命中（Tailwind 默认阴影都带模糊）。
- `npx tsc --noEmit` 退出码 0（组件为 TS，类型必须过）。

**交付物**：`components/ui/*`、`components/ui/NOTICE.md`、合并后的 `globals.css`。

---

### A4 · 5 个页面

**目标**：PRD §4 全部页面，逐节实现，**不渲染空模块**。

| 文件 | 对应 PRD | 硬性要点 |
|---|---|---|
| `app/page.tsx` | §4.1 首页 | 首屏含公司全称 + 一句话定位 + 「立即致电」主按钮 + 「查看服务」次按钮 + 门头图；业务能力 4 卡；工程实拍精选；公司信息速览；联系方式 |
| `app/services/page.tsx` | §4.2 | **严格按 PRD 的三分组，不自行增删条目**；底部折叠区内容逐字等于 PRD §2.1 |
| `app/gallery/page.tsx` | §4.3 | 6 图响应式网格；点开 Dialog 放大；**Esc 关闭**；移动端可左右滑；每图中文说明 + `alt` |
| `app/about/page.tsx` | §4.4 | 公司简介（基于 txt 第 13 行改为官网口吻，**不新增事实**）；工商登记信息表（PRD §2 全字段）；营业执照**摘要卡片（纯文字）** |
| `app/contact/page.tsx` | §4.5 | `tel:` / `mailto:` / 可复制地址 / 地图（A6） |

**文案纪律（本节最重要的一条）**：所有段落写完，逐句自查 → 这句话的每个事实是否都能在 `重庆锐强建筑劳务有限公司.txt` 或 PRD §2 找到出处？**找不到就删掉**。
- 禁止出现："多年经验""专业团队""上千平米""众多客户""优质服务"这类无出处的修辞。
- 允许出现：经营范围原文、工商登记数据、"成立于 2023 年 6 月"等有出处的表述。
- 工程实拍区图注只能写施工内容（如"底板钢筋绑扎完成面"），**不得**写成"某某项目"（PRD §2.2 尾注）。

**全站组件**（PRD §4.6）
- `components/SiteHeader.tsx`：公司名 + 5 项导航 + 手机端汉堡菜单 + 常驻电话号码。
  - 汉堡菜单用 Radix Dialog 或自写 `useState` 均可；**关闭后焦点必须回到触发按钮**（可访问性）。
- `components/SiteFooter.tsx`：工商信息摘要 + 版权 + **ICP 备案号注释占位**：
  ```tsx
  {/* TODO(§4.6/§5.4): ICP 备案号占位。当前使用 Vercel 境外托管，无需备案；若迁移国内主机，在此填入 渝ICP备xxxxxxxx号 并链接 https://beian.miit.gov.cn */}
  ```
- `components/MobileCallBar.tsx`：手机端底部悬浮「立即致电」。
  - **实现要点**：`fixed bottom-0` + `md:hidden`（PRD 只在手机端要求）；高度约 56–64px；**必须在 `app/layout.tsx` 的 `<main>` 上预留等量 `pb`**，否则页面底部内容会被永久遮住（这是这类悬浮条最常见的真实缺陷）。

**验证**
- 5 条路由均返回 200。
- 电话/邮箱链接的实际 `href` 用 DOM 检查确认为 `tel:19936641843` / `mailto:1053210854@qq.com`（PRD §7.4）。

**交付物**：5 个页面 + 3 个全站组件。

---

### A5 · 响应式与视觉收口

**目标**：375 / 768 / 1440 三档逐一过（PRD §5.3、§7.3），这一节是"看起来做完了"和"真的能上线"的分界线。

1. **本机可直接用无头 Chrome 截图验证**（无需安装任何浏览器依赖）：
   ```bash
   "/c/Program Files/Google/Chrome/Application/chrome.exe" \
     --headless=new --disable-gpu --no-proxy-server --hide-scrollbars \
     --force-device-scale-factor=1 --virtual-time-budget=3000 \
     --window-size=375,2000 \
     --screenshot=F:/WorkSpace/Coding/AI/ruiqiang-website/_shot/375-home.png \
     http://localhost:3000/
   ```
   - **`--no-proxy-server` 不能省**：本机配了系统代理，无头 Chrome 访问非回环域名会走代理；虽然 localhost 通常不受影响，但省略此项在部分环境下会得到 502 白屏。
   - 三档 × 5 页面 = 15 张，逐张**用 Read 工具打开看**，不是"生成了就算验过"。
2. **横向滚动条判定（不能靠肉眼）**：
   ```bash
   chrome --headless=new --disable-gpu --no-proxy-server --dump-dom \
     http://localhost:3000/services   # 或用一段注入脚本读 document.scrollWidth vs innerWidth
   ```
   判据：`document.documentElement.scrollWidth <= window.innerWidth`，三档全部成立。**只要有一档差 1px 就是失败**。
3. **文案溢出**：中文无空格、长词（如"建筑工程机械与设备租赁""建设工程监理"）在卡片内会如何折行，必须逐张看图确认未截断、未溢出、未被阴影遮挡。
4. **交互态位移检查**：hover 时向阴影反方向平移（`translate(-3px,-3px)`），按下时向内压（`translate(2px,2px)`）。截图无法体现，用 `--dump-dom` 或人工在真实浏览器过一次。

**交付物**：`_shot/` 下 15 张三档截图（作为 PRD §7.3 的验证记录留档；`_shot/` 需进 `.gitignore`）。

---

### A6 · 联系方式页：地图与可复制地址

1. **取坐标**（见 D2 说明，本机未能取到，需在正常网络下完成一次）：
   - 方法一：在高德/百度地图网页版搜索完整地址，从 URL 或"分享"中读出经纬度。
   - 方法二：用 `restapi.amap.com/v3/geocode/geo`（**已验证本机可达**）配你自己的免费 AK。
   - 结果固化进 `lib/company.ts` 的 `geo: { lat, lng }`，并注明来源与"未实地核验"。
2. **`components/MapEmbed.tsx`**
   - 默认路线 B：一张静态地图（`public/images/map-*.png`，**由你在浏览器地图上截图取得**，或走高德静态图 API）+「在大地图中查看」外链按钮，链接到高德/百度官方地图页。
   - 保留 `{/* SDK-MODE: 若改用交互地图，在此渲染高德 JS API 容器，并在 .env.local 注入 NEXT_PUBLIC_AMAP_KEY */}` 注释分支。
   - 外链一律 `target="_blank" rel="noopener noreferrer"`。
3. **可复制地址**：`navigator.clipboard.writeText(address)`。
   - **必须**处理两个真实边界：非 HTTPS/localhost 环境下 `navigator.clipboard` 为 `undefined`；写入被拒时抛异常。
   - 要求：降级到"选中文本 + `document.execCommand('copy')`"或至少给出可手动选中的文本域，**且复制成功/失败都要有可见反馈**（按钮文案变化）。

**验证**
- 手机端浏览器点击 `tel:` 唤起拨号盘（或桌面端确认 `href` 正确）。
- 复制按钮在 HTTPS 与 HTTP 两种情形下都有反馈，不静默失败。

---

### A7 · SEO 与技术收口

1. **每页 `metadata`**：`app/{page,services,gallery,about,contact}/page.tsx` 各自导出 `metadata`，`title` 与 `description` **两两不重复**（PRD §7.6）。建议：`title` 模板 `${页面名} | 重庆锐强建筑劳务有限公司`。
2. **`app/sitemap.ts`** → 输出 `/sitemap.xml`，含绝对 URL（基于 `SITE_URL`）。
3. **`app/robots.ts`** → 输出 `/robots.txt`，允许全站抓取并声明 sitemap 地址。
   > 注意：`app/robots.ts` 与 `public/robots.txt` **不可共存**，会冲突。只保留其一。
4. **`LocalBusiness` 结构化数据**：在 `app/layout.tsx` 以 `<script type="application/ld+json">` 注入，字段取自 `lib/company.ts`。
   - 类型建议 `["LocalBusiness","GeneralContractor"]`；`address` 用 `PostalAddress`（`addressRegion: "重庆市"`, `addressLocality: "大足区"`, `streetAddress: "棠香街道二环北路中段187号附50号"`）；`telephone`、`email`、`foundingDate`、`legalName`、`taxID`。
   - **严禁**写入 `aggregateRating`、`review`、`award` —— 无出处数据（PRD §7.7）。
   - 用 Rich Results 测试工具或本地 JSON 解析确认语法合法。
5. **静态生成确认**（PRD §7.2）：`npm run build` 输出中 5 条路由应标 `○ (Static)`，**不得**出现 `ƒ (Dynamic)`。
6. **`npm run lint`** 与 `npx tsc --noEmit` 双 0。

---

### A8 · 部署（Vercel 主路径 / Netlify 备选）

> 详细操作手册见 `DEPLOY.md`。此处为执行摘要与决策点。

**共同前置**
```bash
git add -A && git commit -m "chore: 上线前收口"
```
（用全路径 `git`）

**路径一：Vercel（PRD §9 指定）**
```bash
npx vercel@60.1.3 login     # ← 交互步骤，必须由你本人完成，我不代登录、不索取密码
npx vercel@60.1.3 link
npx vercel@60.1.3 --prod
```
- `login` 后 CLI 会写 `~/.vercel`，**不需要**把 token 交给任何人。
- **待你确认项**：`login` 与本项目 `link` 之间建议暂停一次，由你确认要绑定的 scope/team 与项目名（项目名会决定 `<project>.vercel.app` 的最终地址，**一旦部署后再改名会换 URL**，PRD §9 未规定项目名，本计划建议用 `ruiqiang-jianzhu`）。
- 部署后：把回读到的 URL 写进 `PLACEHOLDERS.md`，然后**再提交一次**。

**路径二：Netlify（等效备选，本项目不需要任何额外配置）**

由于 A0–A7 产出的站点是**纯静态、无运行时函数、无 `vercel.json` 依赖**，Netlify 可直接承接：
```bash
npx netlify-cli@latest deploy --prod --dir=out
```
- 需先在 `next.config.ts` 设 `output: "export"`（纯静态导出）—— **注意**：一旦设了 `output:"export"`，`next/image` 的默认优化服务（运行时）会失效，需改 `images: { unoptimized: true }`，或保留默认写法并走 Netlify 的 Next 运行时插件。**这是 Netlify 与 Vercel 在本项目上唯一的实质差异**，详见 `DEPLOY.md`。
- 备选交互路径：`netlify-cli login` → `netlify-cli init` → `netlify-cli deploy --prod`，同样由你本人授权。

**A8 出口判据**：线上 `https://` 地址在**无痕窗口 + 手机网络**下均打开正常，5 条路由可达，联系方式可点。

---

## 5. 验收映射表（PRD §7 → 本计划）

| PRD §7 | 验收项 | 对应任务 | 验证命令 / 手段 | 状态 |
|---|---|---|---|---|
| 1 | `build` 与 `tsc --noEmit` 退出码 0，无 lint 错误 | A0, A7 | `npm run build` / `npx tsc --noEmit` / `npm run lint` | ⬜ |
| 2 | 5 条路由可访问**且静态生成** | A4, A7 | `npm run build` 输出中 5 条均为 `○` | ⬜ |
| 3 | 375/768/1440 无横向滚动、无溢出 | A5 | 无头 Chrome 三档截图 + `scrollWidth <= innerWidth` | ⬜ |
| 4 | `tel:` / `mailto:` 链接正确 | A4 | DOM 检查 `href` | ⬜ |
| 5 | 6 图渲染、均有中文 `alt`、体积显著低于原图 | A2, A4 | 图片报告 + `public/` 体积清单 | ⬜ |
| 6 | `sitemap.xml`/`robots.txt` 可访问；title/description 唯一 | A7 | 本地访问 `/sitemap.xml`、`/robots.txt` | ⬜ |
| 7 | **不含**营业执照照片；**不含**编造的项目名/业绩/评价/人数 | A2, A4, A7 | A2 合规闸门 + 文案逐句回溯 + `public/` 全盘扫描 | ⬜ |
| 8 | 部署成功并输出可访问 `https://` 网址 | A8 | 无痕窗口 + 手机网络访问 | ⬜ |

---

## 6. ⚠️ 需要你裁决的一个真实冲突：§7.5 与 §5.4

**这是本计划发现的最重要的一处规格矛盾，必须由你定调。**

- **PRD §7.5**（验收标准）："**6 张**工程实拍全部渲染，均有中文 `alt`……"
- **PRD §5.4**（合规硬性）："营业执照照片……**不得出现在网站上**"
- **PRD §2.2**（素材清单）：6 张图中，**5 张是施工现场/门头，1 张（`c9231b84….jpg`）是营业执照照，已明确标注"不对外发布"**

即：§7.5 要求的"6 张全部渲染"，与 §5.4 的合规禁令**指向同一张图的相反结论**。

**本计划采取的处理**（请确认或推翻）：

> **公开渲染 5 张** —— 门头照 1 张 + 工程实拍 4 张；营业执照照**零派生品、零引用**。
> 在 `PLACEHOLDERS.md` 与验收记录中显式记录该偏差，理由为"§5.4 是合规硬约束，其优先级高于 §7.5 的计数表述"。

网页上不存在"第 6 张"。如果你希望相册页在视觉上凑满 6 格，**唯一合规的做法是重复使用其中一张实拍图并标注不同角度说明**，但我不建议——重复图会给访客"素材很少"的观感，反而削弱 PRD §1 第 2 条"建立信任"的目标。

**同时提示另一个执行陷阱**：PRD §2 表格中"统一社会信用代码 91500111MACM8P5450"与"法定代表人 唐利平"将在 `/about` 页以**纯文字**公开。这是 PRD 明确要求的（§4.4 工商登记信息表要求 §2 全字段），且与"不放证件照片"的初衷（防证件图被直接冒用）在逻辑上自洽。但请知悉：**文字公开这两项信息，仍会被自动化手段采集**。若你希望进一步降低暴露面，可在 `/about` 中对信用代码做中间位掩码（`91500111MACM****0`）——这会使 §7 的"工商登记信息表（§2 全部字段）"不再逐字满足，需要你在"信息完整度"与"信息暴露面"之间做一次取舍。**本计划默认按 PRD 原文完整展示，不做掩码。**

---

## 7. 风险登记册

| # | 风险 | 概率 | 影响 | 应对 |
|---|---|---|---|---|
| 1 | 中文字体导致首屏空白 / 体积爆炸 | 高 | 高 | D1 的 `preload:false` + 子集化；`display:swap`；`local()` 兜底链。A1 验收含 Network 体积 ≤800 KB 硬指标 |
| 2 | `Noto Sans SC` 的 900 字重在 `next/font` 取字失败 | 中 | 中 | A1 必须实测；失败即回退 §0/D1 备选清单 |
| 3 | neobrutalism 注册表 URL 结构与预期不符 | 中 | 中 | A3 第一步先验 URL 返回 200 + 合法 JSON；不符则手工复制源码，逻辑不变 |
| 4 | Tailwind v4 与 shadcn 4.x 初始化互相覆盖 CSS | 中 | 中 | A3 以 A1 令牌为准手工合并；不在 v4 项目里创建 `tailwind.config.js` |
| 5 | `create-next-app` 因目录非空拒绝就地创建 | 中 | 低 | A0 步骤 3 的备份-移回兜底，并核对移回的是真实文件 |
| 6 | 地图密钥暴露 / 白名单不匹配导致灰块 | 高（若走 SDK 路线） | 中 | **默认走路线 B（静态图 + 外链）**，从根上规避 |
| 7 | 地图坐标取不到或取错 | 已发生（本机） | 低 | 标注"未实地核验"；由你在浏览器核对一次；不得宣称"精确到门牌" |
| 8 | 误发布营业执照照或原始大图 | 低 | **极高** | A2 白名单式管线 + 显式拒绝 + `_orig_not_published/` 隔离 + `public/` 全盘体积扫描（四重） |
| 9 | 悬浮致电条遮住页面底部内容 | 高 | 低 | A4 要求 `<main>` 预留等量 `pb`；A5 截图中专门目视底部 |
| 10 | 文案不知不觉写出无出处的事实 | 中 | **高（虚假宣传）** | A4 的"逐句回溯"自查；`lib/company.ts` 用类型系统的"无字段"堵死后路 |
| 11 | `vercel login` 交互步骤阻塞 | 高 | 低 | A8 明确暂停点，由你本人授权；不代登录、不索取密码 |
| 12 | Vercel 改动后需重部署，忘记改 `SITE_URL` | 中 | 低 | `SITE_URL` 单点环境变量；`PLACEHOLDERS.md` 台账 |
| 13 | 本机 bash 缺 coreutils 导致验证命令静默失败 | **确定为真** | 中 | 全计划验证命令一律走绝对路径 Python / PowerShell；输出重定向到文件再 Read |

---

## 8. 任务与依赖图

```
A0 骨架
 └─> A1 事实层+设计地基 ──┬─> A2 图片管线(合规闸门) ──┐
                          ├─> A3 主题组件             ├─> A4 五页面 ──> A5 响应式收口 ──> A6 地图/复制 ──> A7 SEO/静态 ──> A8 部署
                          └───────────────────────────┘
      (A2 与 A3 可并行；A4 可与 A5 交替，但 A5 必须在 A7 之前完成)
```

---

## 9. 执行纪律（本机环境的硬约束，务必遵守）

1. **不要用 bash 的 `ls` / `cat` / `head` / `grep` / `sed` / `mkdir` / `sleep`** —— 本机 Git Bash 缺 coreutils，这些命令会以 127 失败，**且会静默吞掉整条管道前面的输出**，症状酷似"命令没执行"。
2. **读取命令输出**：把结果写到文件，再用 Read 工具读；或直接用绝对路径 Python `print()`。
3. **`git` 必须写全路径** `/c/Program Files/Git/cmd/git.exe`（bash 里的 `git` 是坏 shim）。
4. **`git add <path>` 会带上该文件的所有未提交改动**，不区分批次。分批提交时 **`commit` 前务必看 `git diff --cached --stat`**。
5. **不要递归删除大量文件**（如无头 Chrome 的临时 profile）—— 本机批量删除守卫会终止整个进程，症状像"代码崩了"。
6. **无头 Chrome 记得加 `--no-proxy-server`**（本机有系统代理，会让非回环请求拿到 502）。

---

## 10. 下一步

1. **请裁决 §0 的 D1（字体配对）、D2（地图路线）、D3（OG 方案）与 §6 的冲突（5 张 vs 6 张）。** 四项都有明确建议值，直接回"按建议执行"即可全部采信。
2. 裁决后即可从 **A0** 开工。逐任务清单见 `TASKS.md`。
3. 任何一步卡住（尤其 A1 字体重、A3 注册表 URL、A8 登录），停下来记录现象再决定替代路线——这三处的替代方案都已在风险表里备好。
