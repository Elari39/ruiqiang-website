<div align="center">

# 重庆锐强建筑劳务有限公司 · 官网

**一个纯静态、零后端的 Next.js 企业官网**
建筑劳务分包 · 建设工程施工 · 施工专业作业

[![Next.js](https://img.shields.io/badge/Next.js-16.3.6-000000?logo=next.js&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19.3-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Tests](https://img.shields.io/badge/tests-167_passing-3fb950)](#测试)
[![License](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)

</div>

---

## 这个项目有什么不一样

这不是一个套模板改文案的官网。「内容真实性」和「合规」在本项目里是被**测试强制守住**的硬约束，
而不是写在文档里靠自觉的君子协定：

- **不编造任何企业事实。** 全站文案的每一个事实都必须能回溯到工商登记材料或项目原始素材。
  测试里有一张禁止词表（`承接过` / `已完成项目` / `众多客户` / `深耕多年` 之类），
  命中即删，且这张表**自身也有自检测试**（确保每条规则不是永远匹配不到的废规则）。
- **证件照永不发布。** 营业执照照含统一社会信用代码与法定代表人姓名。
  它不仅在 `public/` 下不存在，在构建管线的 `BLOCKED` 名单里被**显式拒绝并 `exit 2`**——
  即使有人把它塞进派生白名单，构建也会主动终止。
- **167 条测试覆盖到「产物层」。** 不只测组件渲染，还测构建产物里的
  `<img>` 是否真的带上了 `fetchpriority`、每个页面是否静态生成，
  以及 `canonical` / `og:url` / `og:image` / `sitemap.xml` / `robots.txt`
  里的 URL 是否是**线上域名而不是 `localhost`**。
  最后这条不是修辞：本站上线后曾经整站 SEO 元数据都指向 `http://localhost:3000`
  （canonical、og:url、sitemap、robots 全中），而页面看起来完全正常。
  当时的断言之所以没抓到，是因为它只把产物与"同一进程里算出的 `SITE_URL`"
  比对 —— 体检与病灶出自同一个值，于是恒真。现在的断言改为对**绝对事实**判定。
- **源码层零平台锁定。** `next.config.ts` 不绑定任何平台，没有 `output: "export"`，
  没有 Route Handler，没有平台专属环境变量。仓库里只有一份 `netlify.toml`
  声明 Next 运行时插件（增量配置，不绑定源码）——换平台只需增删这一个文件。

## 设计

**Neobrutalism** —— 粗黑描边、硬阴影、高饱和撞色。建筑劳务是个重体力的行当，
界面不做玻璃拟态那套轻飘飘的东西，用实心的块与线，信息层级靠边框和留白拉出来。

字体走中文优先：拉丁字形用 Archivo Black（标题）/ Space Grotesk（正文），
汉字用 Noto Sans SC 的 400 / 500 / 900 三个字重，全部由 `next/font` 在**构建期**
自托管到本站（不外链 Google 的 CDN），并靠 `unicode-range` 子集化把每个字重切成
上百个分片 —— 浏览器只下载页面实际用到的那几片，所以中文面设了 `preload: false`。
字体未就绪时由 `display: "swap"` + `globals.css` 里的 CJK 兜底链
（PingFang SC / Microsoft YaHei 等）先顶上，不会出现隐形文字。

## 页面

| 路由 | 内容 |
| --- | --- |
| `/` | 首屏、业务概览、工程实拍、联系方式 |
| `/services` | 经营范围（许可项目 / 一般项目逐字展示）+ 营业执照摘要 |
| `/gallery` | 工程实拍相册，含键盘可操作的灯箱 |
| `/about` | 公司简介、工商登记信息表（15 个字段） |
| `/contact` | 电话 / 邮箱 / 地址、可复制地址、地图外链 |
| `/sitemap.xml` `/robots.txt` | 构建期生成的静态文件 |
| `/_not-found` | 中文 404（含站内导航；Next 自动注入 `noindex`，返回真实 404 状态码） |

响应式三档（与探测脚本的实测数值一致）：

| 宽度 | 表现 |
| --- | --- |
| `<768px`（手机） | 底部悬浮致电条 + 汉堡菜单 |
| `768–1023px`（平板） | 无悬浮条；仍是汉堡菜单（公司全称 + 5 项导航 + 电话在 768px 下会拆行，故导航到 `lg` 才展开） |
| `≥1024px`（桌面） | 导航与电话全部展开，无悬浮条 |

## 快速开始

```bash
# 需要 Node.js 20.9+（本项目在 Node 22 上开发）
npm install
npm run dev          # http://localhost:3000
```

### 常用脚本

```bash
npm run dev              # 开发服务器
npm run build            # 生产构建
npm run start            # 跑生产构建（需先 build）
npm test                 # 运行全部测试（167 条；探针相关套件缺产物时会响亮跳过）
npm run test:probes      # 一键跑完整 A5 验收：构建 + 起服务 + 浏览器探测 + 断言
npm run typecheck        # tsc --noEmit
npm run lint             # eslint
npm run images           # 重建 public/images/ 派生品（见下方说明）
```

## 测试

```bash
npm test
```

8 个测试文件、167 条断言，分四层：

| 层 | 文件 | 职责 |
| --- | --- | --- |
| 源码层 | `tests/pages.test.ts` | 文案纪律、禁止词表自检、图片键与产物对应 |
| 元数据层 | `tests/seo.test.ts` | 逐页 title/description 唯一性、canonical/og、JSON-LD 负向断言 |
| 环境契约层 | `tests/deploy.test.ts` | 站点绝对 URL 的解析契约、平台锁定、合规闸门 |
| 产物层 | `tests/theme.test.ts`、`tests/images.test.ts` | 编译后 CSS 的圆角/阴影真实数值、图片派生管线幂等 |
| 浏览器探测层 | `tests/responsive.test.ts`、`tests/map.test.ts` | 三档响应式、交互态（灯箱/汉堡菜单/悬浮条）、地图外链 |

> `tests/deploy.test.ts`、`tests/pages.test.ts`、`tests/seo.test.ts`、`tests/theme.test.ts`
> 的部分断言读 `.next/` 下的构建产物，因此完整的产物层验证需要**先 `npm run build` 再 `npm test`**。
> 测试读的是构建结果而不是重新编译的源码——这正是它们能抓到
> 「源码写了但产物里没有」这类静默回归的原因。

### 关于浏览器探测（`npm run test:probes`）

`tests/responsive.test.ts` 读的是 `tests/probe-out/` 下的探测报告，而那个目录靠
**真的启动 headless Chrome 去点、去滑、去量**才会产出，且已被 `.gitignore` 排除。

因此：

- **`npm test`** —— 缺报告时打印醒目横幅并跳过探针套件，其余断言照常跑。
  这样新克隆的仓库也能一键跑绿，而不是"新环境必然红"。
- **`npm run test:probes`** —— 自动完成 `build → next start → 两个探针脚本 → vitest`，
  并以 `REQUIRE_PROBES=1` 跑最后一步，使"探针没产出报告"直接失败而不是被跳过掩盖。
  需要本机有 Chrome / Chromium / Edge（可用 `CHROME_PATH` 指定）。

## 图片管线

`public/images/` 下的派生品由 `scripts/build-images.mjs` 从 `img/` 生成，
不是手工放进去的。白名单式设计：只有登记过的语义 key 会产出派生品，
且 `BLOCKED` 名单**优先于**白名单。

```bash
npm run images           # webp + avif，各 1600/800 两档，单图 < 300 KB
```

> ⚠️ **本仓库不含营业执照照与工商登记摘要源文件**（含敏感工商信息，见
> [`PLACEHOLDERS.md`](./PLACEHOLDERS.md) §7）。在一台全新克隆的机器上直接跑
> `npm run images` 会因缺源图而终止 —— 那是合规闸门在按设计工作，不是坏了。
> 可公开的 4 张工程实拍与门头原图保留入库，所以除此之外的派生链都能重建。

## 部署

线上地址：**https://ruiqiang-jianzhu.netlify.app**（Netlify + Git 集成）。

源码层零平台专属配置。仓库里唯一与平台相关的文件是 `netlify.toml`，
它声明 Next 运行时插件并设置响应头缓存策略；`next.config.ts` 里只有一条
平台无关的 `poweredByHeader: false`：

```toml
[build]
  command = "npm run build"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

接站只需把 GitHub 仓库连到 Netlify（需在浏览器完成 GitHub App 授权，
这是 CLI/API 绕不过的一步），`netlify.toml` 会被自动读取。

> **不要**给 `next.config.ts` 加 `output: "export"`。那会让 App Router 的
> 路由分发退化成静态直传，并要求 `images.unoptimized: true`。
> `tests/deploy.test.ts` 里有断言钉住这一点。
>
> ⚠️ 本机 `netlify deploy --build` 会撞上沙箱的 safe-delete 守卫，**不要用**。
> Next.js 项目走 Git 集成（云端构建）才是正路。

### 部署环境变量：**不需要设置任何变量**

站点绝对 URL 以常量内置在 `lib/site.ts` 的 `PRODUCTION_SITE_URL`：

```ts
export const PRODUCTION_SITE_URL = "https://ruiqiang-jianzhu.netlify.app";
```

解析规则（`resolveSiteUrl`，见 `lib/site.ts`）：

| 情况 | 结果 |
| --- | --- |
| 未设 `NEXT_PUBLIC_SITE_URL` + 生产构建 | 用 `PRODUCTION_SITE_URL` |
| 未设 + 开发 / 测试 | `http://localhost:3000` |
| 显式设了 | 用它（去空格、去尾斜杠） |
| 显式设了，但**不是干净的 https 主机名**（http / localhost / 带路径或查询串） | **构建直接失败** |

> **为什么改成这样（这是一次真实事故的修复）。** 早先 `SITE_URL` 只认环境变量、
> 缺失时静默回落 `localhost`。上线后 Netlify 侧没配上，于是线上的
> `canonical`、`og:url`、`og:image`、`sitemap.xml`、`robots.txt` **全部**指向
> `http://localhost:3000` —— 搜索引擎被指向一个不存在的域名，微信分享没有封面图，
> sitemap 上报了 5 个死链，而页面本身看起来完全正常。
>
> 所以现在的策略是"漏配也正确、配错就报错"：换域名只改 `PRODUCTION_SITE_URL` 一处；
> 确有需要（如 staging）时才设 `NEXT_PUBLIC_SITE_URL`，且必须是 https 绝对地址。
>
> **验收方式**：访问 `/sitemap.xml`，`<loc>` 必须是线上域名而非 `localhost`。
> 完整的部署手册见 [`DEPLOY.md`](./DEPLOY.md)，构建侧验收报告见 [`VERIFY_DEPLOY.md`](./VERIFY_DEPLOY.md)。

## 项目文档

| 文件 | 内容 |
| --- | --- |
| [`PRD.md`](./PRD.md) | 产品需求，含合规硬约束与素材清单 |
| [`DEVELOPMENT_PLAN.md`](./DEVELOPMENT_PLAN.md) | A0–A8 开发计划与每阶段出口判据 |
| [`TASKS.md`](./TASKS.md) | 任务清单与逐项验收记录 |
| [`DEPLOY.md`](./DEPLOY.md) | Netlify 部署手册与故障排查 |
| [`PLACEHOLDERS.md`](./PLACEHOLDERS.md) | 待替换值台账、不进库文件清单、规格偏差记录 |

## 已知边界

- **地图不含精确坐标。** 注册地址的经纬度在现有材料中无出处，因此**刻意留空**，
  走的是「把完整地址交给图商做关键词检索」的路线——标点位置由图商解析，
  不存在「我们标错了」的风险。一个错误的地图标点比没有标点更糟。
- **ICP 备案号未展示。** 境外托管无需备案，当前也无备案信息，故不渲染空模块。
- **无客户评价 / 项目业绩 / 资质荣誉模块。** 材料中没有这些事实，按纪律不建模块、不编造。

## 许可

[MIT](./LICENSE)

