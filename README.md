<div align="center">

# 重庆锐强建筑劳务有限公司 · 官网

**一个纯静态、零后端的 Next.js 企业官网**
建筑劳务分包 · 建设工程施工 · 施工专业作业

[![Next.js](https://img.shields.io/badge/Next.js-16.3.6-000000?logo=next.js&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19.3-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Tests](https://img.shields.io/badge/tests-154_passing-3fb950)](#测试)
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
- **154 条测试覆盖到「产物层」。** 不只测组件渲染，还测构建产物里的
  `<img>` 是否真的带上了 `fetchpriority`、每个页面是否静态生成、
  `sitemap.xml` 里的 URL 是否是线上域名。
- **零平台锁定。** 没有 `vercel.json` / `netlify.toml`，没有 `output: "export"`，
  没有 Route Handler。Vercel 与 Netlify 都能直接部署，切换不改一行配置。

## 设计

**Neobrutalism** —— 粗黑描边、硬阴影、高饱和撞色。建筑劳务是个重体力的行当，
界面不做玻璃拟态那套轻飘飘的东西，用实心的块与线，信息层级靠边框和留白拉出来。

字体走中文优先：标题用自托管的中文黑体（`local()` 兜底链完整），避免中文环境下的字体闪烁。

## 页面

| 路由 | 内容 |
| --- | --- |
| `/` | 首屏、业务概览、工程实拍、联系方式 |
| `/services` | 经营范围（许可项目 / 一般项目逐字展示）+ 营业执照摘要 |
| `/gallery` | 工程实拍相册，含键盘可操作的灯箱 |
| `/about` | 公司简介、工商登记信息表（15 个字段） |
| `/contact` | 电话 / 邮箱 / 地址、可复制地址、地图外链 |
| `/sitemap.xml` `/robots.txt` | 构建期生成的静态文件 |

响应式三档：≤375px（底部悬浮致电条）、900px 断点（汉堡菜单）、桌面全展开。

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
npm test                 # 运行全部测试（154 条）
npm run typecheck        # tsc --noEmit
npm run lint             # eslint
npm run images           # 重建 public/images/ 派生品（见下方说明）
```

## 测试

```bash
npm test
```

8 个测试文件、154 条断言，分三层：

| 层 | 文件 | 职责 |
| --- | --- | --- |
| 源码层 | `tests/pages.test.ts`、`tests/seo.test.ts` | 文案纪律、禁止词表、元数据唯一性 |
| 组件层 | `tests/components.test.ts` | 交互组件行为（灯箱、汉堡菜单、复制地址） |
| 产物层 | `tests/deploy.test.ts`、`tests/images.test.ts` | 构建产物真实 DOM、静态生成、平台锁定、合规闸门 |

> `tests/deploy.test.ts` 与 `tests/pages.test.ts` 的部分断言读 `.next/server/app/*.html`，
> 因此完整的产物层验证需要**先 `npm run build` 再 `npm test`**。
> 测试产物用的是构建结果，不是重新编译的源码——这正是它们能抓到
> 「源码写了但产物里没有」这类静默回归的原因。

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

零平台专属配置，两家平台都能直接接。

**Vercel**

```bash
npx vercel@latest link      # 项目名建议 ruiqiang-jianzhu
npx vercel@latest --prod
```

**Netlify**

```bash
npx netlify-cli@latest init
npx netlify-cli@latest deploy --prod
```

> **不要**为了 Netlify 给 `next.config.ts` 加 `output: "export"`。那会连带关掉
> `next/image` 的服务端优化并要求 `images.unoptimized: true`，属于为了备选平台
> 削弱主路径。走 Netlify 的 Next.js 运行时（默认行为）即可。

### 唯一的部署环境变量

```bash
NEXT_PUBLIC_SITE_URL=https://your-domain.example   # 末尾不要带 /
```

不设它，`sitemap.xml` 和分享卡片里会写 `localhost:3000`。
设置后**必须重新部署**才会生效。验收方式：访问 `/sitemap.xml`，
`<loc>` 里应当是线上域名。

完整部署手册见 [`DEPLOY.md`](./DEPLOY.md)，A8 构建侧验收报告见 [`VERIFY_DEPLOY.md`](./VERIFY_DEPLOY.md)。

## 项目文档

| 文件 | 内容 |
| --- | --- |
| [`PRD.md`](./PRD.md) | 产品需求，含合规硬约束与素材清单 |
| [`DEVELOPMENT_PLAN.md`](./DEVELOPMENT_PLAN.md) | A0–A8 开发计划与每阶段出口判据 |
| [`TASKS.md`](./TASKS.md) | 任务清单与逐项验收记录 |
| [`DEPLOY.md`](./DEPLOY.md) | Vercel / Netlify 部署手册与故障排查 |
| [`PLACEHOLDERS.md`](./PLACEHOLDERS.md) | 待替换值台账、不进库文件清单、规格偏差记录 |

## 已知边界

- **地图不含精确坐标。** 注册地址的经纬度在现有材料中无出处，因此**刻意留空**，
  走的是「把完整地址交给图商做关键词检索」的路线——标点位置由图商解析，
  不存在「我们标错了」的风险。一个错误的地图标点比没有标点更糟。
- **ICP 备案号未展示。** 境外托管无需备案，当前也无备案信息，故不渲染空模块。
- **无客户评价 / 项目业绩 / 资质荣誉模块。** 材料中没有这些事实，按纪律不建模块、不编造。

## 许可

[MIT](./LICENSE)

