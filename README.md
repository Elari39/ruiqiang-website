<div align="center">

# 重庆锐强建筑劳务有限公司 · 官网

**以静态生成页面为主、无需业务后端的 Next.js 企业官网**
建筑劳务分包 · 建设工程施工 · 施工专业作业

[![Next.js](https://img.shields.io/badge/Next.js-16.3.6-000000?logo=next.js&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19.3-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Verify](https://github.com/Elari39/ruiqiang-website/actions/workflows/verify.yml/badge.svg)](https://github.com/Elari39/ruiqiang-website/actions/workflows/verify.yml)
[![License](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)

**🌐 在线访问 · [https://ruiqiang-jianzhu.netlify.app](https://ruiqiang-jianzhu.netlify.app/)**

[源码仓库](https://github.com/Elari39/ruiqiang-website) · [项目详解](https://elari39.github.io/projects/ruiqiang-website/) · [灰烬女巫的魔典](https://elari39.github.io/)

</div>

---

五个页面在构建时生成，无数据库、后台管理或表单接收服务。浏览器端保留导航菜单、相册灯箱和地址复制等交互；托管使用 **Next.js 运行时**，产物是 `.next/`，不能当成 `output: "export"` 的静态目录直接上传。

## 目录

- [线上实拍](#线上实拍)
- [这个项目有什么不一样](#这个项目有什么不一样)
- [设计](#设计)
- [页面](#页面)
- [快速开始](#快速开始)
- [目录与维护入口](#目录与维护入口)
- [测试](#测试)
- [图片管线](#图片管线)
- [部署](#部署)
- [项目文档](#项目文档)
- [已知边界](#已知边界)
- [许可](#许可)

## 线上实拍

线上地址：**[https://ruiqiang-jianzhu.netlify.app](https://ruiqiang-jianzhu.netlify.app/)** —— 下列截图即该地址的真实页面。

<div align="center">
  <a href="https://ruiqiang-jianzhu.netlify.app/">
    <img src="docs/screenshots/desktop-home.png" alt="首页 · 桌面 1440px — https://ruiqiang-jianzhu.netlify.app/" width="100%">
  </a>
  <br>
  <sub><b>首页 · 桌面 1440px</b> —— 点图直达 <a href="https://ruiqiang-jianzhu.netlify.app/">ruiqiang-jianzhu.netlify.app</a></sub>
</div>

<div align="center">
  <a href="https://ruiqiang-jianzhu.netlify.app/">
    <img src="docs/screenshots/mobile-home.png" alt="首页 · 手机 390px — https://ruiqiang-jianzhu.netlify.app/" width="330">
  </a>
  <br>
  <sub><b>首页 · 手机 390px</b> —— 汉堡菜单 + 底部悬浮致电条</sub>
</div>

<div align="center">
  <a href="https://ruiqiang-jianzhu.netlify.app/">
    <img src="docs/screenshots/pages-grid.png" alt="内页：服务项目 / 工程实拍 / 关于我们 / 联系我们 — https://ruiqiang-jianzhu.netlify.app/" width="100%">
  </a>
  <br>
  <sub><b>内页 4 张</b> —— /services · /gallery · /about · /contact</sub>
</div>

截图由本机 headless Chrome **实际访问线上地址逐页拍摄**
（脚本 [`scripts/capture-readme-shots.mjs`](./scripts/capture-readme-shots.mjs)，
随时可用 `npm run shots:readme` 重拍），页面内容为原始截图，未做任何美化。

两处需要说清楚的边界：

- **窗口外框与地址栏是合成的。** CDP 截图只能拿到页面内容，拿不到浏览器自身的
  标签栏/地址栏，所以外框由脚本按本站设计令牌（`--border: #000`、`--radius: 0`、
  硬偏移阴影、品牌黄）用 HTML 渲染合成。截图脚本默认访问上面的线上域名，
  可用 `SITE_URL` 环境变量覆盖；它有自己的默认地址，换域名后需同步核对截图目标。
- **图右下角的 `Powered by Netlify` 角标是真的。** 那是 Netlify 免费套餐按访客所见
  注入的角标，不是后期贴上去的——这里选择保留它，而不是修图抹掉。

> 只截首屏（桌面 1440×900 / 手机 390×844，与 `npm run test:probes` 的探测视口一致），
> 不做整页长图：README 里的图应该能被一眼看完，而不是让人滚一分钟。

## 这个项目有什么不一样

这不是一个套模板改文案的官网。「内容真实性」和「合规」在本项目里是被**测试强制守住**的硬约束，
而不是写在文档里靠自觉的君子协定：

- **不编造任何企业事实。** 全站文案的每一个事实都必须能回溯到工商登记材料或项目原始素材。
  测试里有一张禁止词表（`承接过` / `已完成项目` / `众多客户` / `深耕多年` 之类），
  命中即删，且这张表**自身也有自检测试**（确保每条规则不是永远匹配不到的废规则）。
- **证件照永不发布。** 营业执照照含统一社会信用代码与法定代表人姓名。
  它不仅在 `public/` 下不存在，在构建管线的 `BLOCKED` 名单里被**显式拒绝并 `exit 2`**——
  即使有人把它塞进派生白名单，构建也会主动终止。
- **自动化测试覆盖到「产物层」。** 不只测组件渲染，还测构建产物里的
  `<img>` 是否真的带上了 `fetchpriority`、每个页面是否静态生成，
  以及 `canonical` / `og:url` / `og:image` / `sitemap.xml` / `robots.txt`
  里的 URL 是否是**线上域名而不是 `localhost`**。
  最后这条不是修辞：本站上线后曾经整站 SEO 元数据都指向 `http://localhost:3000`
  （canonical、og:url、sitemap、robots 全中），而页面看起来完全正常。
  当时的断言之所以没抓到，是因为它只把产物与"同一进程里算出的 `SITE_URL`"
  比对 —— 体检与病灶出自同一个值，于是恒真。现在的断言改为对**绝对事实**判定。
- **业务页面与托管配置分开。** `next.config.ts` 配置 Next 的安全响应头，
  `netlify.toml` 声明 Netlify 插件与边缘缓存；没有业务 Route Handler。
  仓库另有 Netlify 构建验收入口和角标适配，迁移平台时需要一并检查，
  目标平台必须支持当前 Next.js 运行时。

## 设计

站点图标是「戴安全帽的 R」：用锐强拼音首字母构成钢梁般的粗体轮廓，配以安全帽、品牌黄和硬阴影。SVG 源稿位于 `public/brand/ruiqiang-mark.svg`；运行 `npm run icons` 可重建 16/32/48px favicon、512px 品牌图与 180px Apple 主屏幕图标。

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
# 推荐 Node.js 22（与 CI 一致），使用 npm 与已提交的 package-lock.json
npm ci
npm run dev          # http://localhost:3000
```

`next/font/google` 会在首次构建时下载字体，再随站点自托管；构建机需要能访问字体服务。仓库已包含公开图片派生品，普通开发无需重新生成图片或获取证件原图。

### 常用脚本

```bash
npm run dev              # 开发服务器
npm run build            # 生产构建
npm run start            # 跑生产构建（需先 build）
npm test                 # 复核当前构建及其报告；缺失、旧报告均失败
npm run verify           # 发布门禁：lint + 构建 + 类型检查 + 三组浏览器探测 + 全部断言
npm run typecheck        # tsc --noEmit
npm run lint             # eslint
npm run images           # 重建 public/images/ 派生品（见下方说明）
npm run icons            # 从品牌 SVG 重建 favicon / Apple 图标
npm run shots:readme     # 重拍 README 的线上实拍图（headless Chrome 访问线上地址）
```

## 目录与维护入口

```text
app/                         页面、根布局、样式、404、robots 与 sitemap
components/                  导航、致电条、灯箱、地图外链与图片组件
lib/company.ts               企业事实、联系方式、经营范围与出处
lib/content.ts               服务分组、相册 key、图片说明与首页内容
lib/site.ts                  正式域名、导航和逐页 SEO 文案
lib/metadata.ts              canonical / Open Graph / Twitter 元数据
public/brand/                品牌 SVG 与生成的图标
public/images/               已生成的 AVIF / WebP 与 OG 图片
img/                         允许入库的公开素材原图
scripts/                     图片和图标生成、截图、浏览器验收
tests/                       源码、图片、SEO、构建与探针报告断言
.github/workflows/verify.yml  系统浏览器 / 打包浏览器两种 CI 环境
netlify.toml                 Netlify 构建、运行时插件及缓存配置
```

修改企业资料先更新 `lib/company.ts` 并保留事实出处；修改服务或相册内容核对 `lib/content.ts`。新增图片需要同步 `scripts/build-images.mjs` 的白名单和相册 key，生成派生品后验收。新增页面还需更新导航、`PAGE_META`、sitemap 和相关测试，不能只添加 `page.tsx`。

## 测试

```bash
npm run verify
```

测试文件位于 `tests/`，数量与通过情况以本次运行输出为准：

| 层 | 文件 | 职责 |
| --- | --- | --- |
| 企业事实层 | `tests/company.test.ts` | 工商字段、联系方式、经营范围与地图配置 |
| 源码层 | `tests/pages.test.ts` | 文案纪律、禁止词表自检、图片键与产物对应 |
| 元数据层 | `tests/seo.test.ts` | 逐页 title/description 唯一性、canonical/og、JSON-LD 负向断言 |
| 环境契约层 | `tests/deploy.test.ts` | 站点绝对 URL 的解析契约、平台锁定、合规闸门 |
| 产物层 | `tests/theme.test.ts`、`tests/images.test.ts` | 编译后 CSS 的圆角/阴影真实数值、图片派生管线幂等 |
| 浏览器探测层 | `tests/responsive.test.ts`、`tests/map.test.ts` | 三档响应式、交互态（灯箱/汉堡菜单/悬浮条）、地图外链 |
| 验收身份层 | `tests/probe-contract.test.ts` | 拒绝旧报告、错构建、源码变化、空报告；强制覆盖新增回归场景 |

> `tests/deploy.test.ts`、`tests/pages.test.ts`、`tests/seo.test.ts`、`tests/theme.test.ts`
> 的部分断言读 `.next/` 下的构建产物；完整验收请运行 **`npm run verify`**，它会重新构建并生成三份浏览器报告。
> 测试读的是构建结果而不是重新编译的源码——这正是它们能抓到
> 「源码写了但产物里没有」这类静默回归的原因。

### 关于浏览器探测（`npm run test:probes`）

`tests/responsive.test.ts` 读的是 `tests/probe-out/` 下的探测报告，而那个目录靠
**真的启动 headless Chrome 去点、去滑、去量**才会产出，且已被 `.gitignore` 排除。

因此：

- **`npm test`** —— 复核当前源码、构建与报告；缺报告、身份不匹配、空报告均失败，不跳过浏览器套件。
- **`npm run verify`** —— lint → 标准生产构建 → 类型检查 → 启动服务 → 三组浏览器探测 → 全部断言。报告绑定源码指纹、BUILD_ID、运行 ID 和目标地址；任一步失败阻止发布。
- 浏览器可用本机 Chrome / Edge（`CHROME_PATH`），或先执行 `npx playwright install --with-deps chromium`。GitHub Actions 和 Netlify 均运行完整门禁。
- Netlify 使用 `npm run verify:netlify`：在临时目录解压 Chromium 及其运行库，无需 root 或 apt；然后调用同一个 `npm run verify`。GitHub 同时验证系统浏览器与打包浏览器两种环境。
- 新回归测试覆盖 375/390/767px × 五页的致电入口实际命中、延迟注入角标后的布局、页脚可见性，以及 768→1024→768px 菜单与滚动恢复。独立线上检查使用真实角标，不注入测试夹具。

完整门禁默认在回环端口 **3311** 启动并清理自己的生产服务，可用 `PROBE_PORT` 修改。证据写入 `tests/probe-out/`、`_shot/` 和 `.next/probe-run.json`。本地独立探测与线上报告不具备同一份构建身份，不能替代 `npm run verify`。

## 图片管线

`public/images/` 下的派生品由 `scripts/build-images.mjs` 从 `img/` 生成，
不是手工放进去的。白名单式设计：只有登记过的语义 key 会产出派生品，
且 `BLOCKED` 名单**优先于**白名单。

`components/SiteImage.tsx` 使用原生 `<picture>` 与 `srcset` 选择预生成的 AVIF / WebP，**没有使用 `next/image`**。首屏图显式设置 `fetchPriority="high"`，其余图懒加载；每张图片都声明尺寸和中文 alt。

```bash
npm run images           # webp + avif，各 1600/800 两档，单图 < 300 KB
```

> ⚠️ **本仓库不含营业执照照与工商登记摘要源文件**（含敏感工商信息，见
> [`PLACEHOLDERS.md`](./PLACEHOLDERS.md) §7）。图片管线只读取公开白名单源图，不依赖证件原图。
> 可公开的 4 张工程实拍与门头原图保留入库，派生链可在全新克隆中重建。图片禁发测试使用临时合成素材，不需要真实证件原图。

## 部署

线上地址：**[https://ruiqiang-jianzhu.netlify.app](https://ruiqiang-jianzhu.netlify.app/)**（Netlify + Git 集成）。

`netlify.toml` 声明 Next 运行时插件、完整发布验收和静态资源缓存策略；
`next.config.ts` 配置安全响应头。移动端样式仅在 Netlify 角标实际存在时为其预留空间，换托管平台不会留下空白：

```toml
[build]
  command = "npm run verify:netlify"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

在 Netlify 中连接 GitHub 仓库并完成所需授权，构建时会读取 `netlify.toml`。使用 Node.js 22；托管构建入口为 `npm run verify:netlify`，本地 Windows 使用 `npm run verify`。

> 当前发布与验收契约使用 `.next` 和 Netlify Next 插件，`tests/deploy.test.ts` 拒绝 `output: "export"`。迁移到纯静态导出需要重新设计并验证托管、路由及响应头配置，不能只改一个开关。

Next 运行时响应的 `X-Content-Type-Options`、`Referrer-Policy`、`X-Frame-Options` 来自 `next.config.ts`；Netlify 直接服务的 `/images/*` 和 `/_next/static/*` 由 `netlify.toml` 补充 `nosniff` 及缓存规则。发布后需要分别核对页面与静态资源的响应头。

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
| 生产构建中显式设了，但**不是干净的 https origin**（http / localhost / 带路径或查询串） | **构建直接失败** |

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
| [`docs/screenshots/`](./docs/screenshots/) | README 线上实拍图与拍摄清单（`npm run shots:readme` 重拍） |

## 已知边界

- **地图不含精确坐标。** 注册地址的经纬度在现有材料中无出处，因此**刻意留空**，
  走的是「把完整地址交给图商做关键词检索」的路线——标点位置由图商解析，
  实际定位仍需在地图服务中核对。页面不加载地图 SDK，也无需地图 API Key。
- **ICP 备案号未展示。** 当前材料没有可展示的备案信息；托管或业务范围变化时需重新核对要求。
- **无客户评价 / 项目业绩 / 资质荣誉模块。** 材料中没有这些事实，按纪律不建模块、不编造。
- **没有在线提交表单或管理后台。** 联系入口为电话、邮箱、地址复制及地图外链；更新内容需要修改源码并重新发布。
- **截图是拍摄时的页面记录。** 线上版本、托管角标与截图可能随发布变化，重新拍摄使用 `npm run shots:readme`。

## 许可

[MIT](./LICENSE)

