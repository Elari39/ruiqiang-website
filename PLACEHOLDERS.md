# 待替换值台账（PLACEHOLDERS）

> 规则：本文件中每一项在**取得真实值之前**，代码里都不得写死占位内容。
> 每取得一项，就在两列都记录下来，并同步改代码，然后提交一次。

---

## 1. 部署与域名

| 项 | 代码位置 | 当前值 | 取得后填入 | 状态 |
|---|---|---|---|---|
| 站点绝对 URL | `lib/site.ts` → `SITE_URL`；环境变量 `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` | | ⬜ 待 A8 |
| 线上地址 | `DEVELOPMENT_PLAN.md` / `TASKS.md` 验证输出 | — | | ⬜ 待 A8 |
| Vercel 项目名 | Vercel 控制台 / `vercel link` | 建议 `ruiqiang-jianzhu` | | ⬜ 待确认 |
| Netlify 站点名（备选） | Netlify 控制台 | — | | ⬜ 备选 |

> ⚠️ 取得线上 URL 后，**必须**回头设置 `NEXT_PUBLIC_SITE_URL` 并重新部署，否则 `sitemap.xml` 与 OG 标签里仍是 `localhost:3000`。

---

## 2. 地图

| 项 | 代码位置 | 状态 |
|---|---|---|
| 注册地址经纬度 `geo.lat` / `geo.lng` | `lib/company.ts` | ⬜ 待 A6（**本机未能取到，见 DEVELOPMENT_PLAN §0/D2**） |
| 坐标来源服务名 | `lib/company.ts` 注释 | ⬜ 待 A6 |
| 实地核验状态 | 建议注释写"未人工实地核验" | ⬜ 待 A6 |
| 静态地图图片 `public/images/map-*.png` | `components/MapEmbed.tsx` | ⬜ 待 A6 |
| 高德 AK（仅 SDK-MODE 需要） | `.env.local` → `NEXT_PUBLIC_AMAP_KEY` | ⬜ 默认不需要 |

> 地址原文（**勿改**）：`重庆市大足区棠香街道二环北路中段187号附50号`
> ⚠️ 未经实地核验前，不得对外宣称地图标点"精确到门牌"。

---

## 3. 备案与资质（PRD §8 待补项，第一版不渲染空模块）

| 项 | 代码位置 | 状态 |
|---|---|---|
| ICP 备案号 | `components/SiteFooter.tsx` 注释占位 | ⬜ 当前无备案（Vercel 境外托管无需备案） |
| 施工劳务资质 / 安全生产许可证 | 未建模块 | ⬜ 材料中无 |
| 真实项目业绩（名称/地点/规模/甲方） | 未建模块 | ⬜ 材料中无，**不得编造** |
| 人员与设备规模 | 未建模块 | ⬜ 材料中无，**不得编造** |
| 服务区域（是否覆盖重庆全市） | 未建模块 | ⬜ 待用户提供 |
| 官方微信 / 公众号 | 未建模块 | ⬜ 待用户提供 |

---

## 4. 图片资产

| 语义 key | 原始文件 | 用途 | 公开 | 状态 |
|---|---|---|---|---|
| `storefront` | `img/_orig_not_published/storefront.jpg` | 首页首屏 / 关于我们（复用） | ✅ | ⬜ 待 A2 派生 |
| `rebar-slab` | `img/98f59ef534ca3d54027df8e1ee09956b.jpg` | 工程实拍 | ✅ | ⬜ 待 A2 派生 |
| `rebar-crew` | `img/7643475e202712baf7d1b475fccaf030.jpg` | 工程实拍 | ✅ | ⬜ 待 A2 派生 |
| `steel-frame-slab` | `img/6b47f2f3832295f939ea301d097b2f6a.jpg` | 工程实拍 | ✅ | ⬜ 待 A2 派生 |
| `steel-frame-wide` | `img/c23bea8ddb08abbda4e419ea2bd5a17a.jpg` | 工程实拍 + OG 卡图源 | ✅ | ⬜ 待 A2 派生 |
| （无 key） | `img/c9231b84a2a8285c28081548ec3cfb41.jpg` | **营业执照照** | ❌ **禁止发布** | ⛔ 永不派生 |

---

## 5. 已记录的规格偏差

| # | 偏差 | 依据 | 记录时间 |
|---|---|---|---|
| 1 | PRD §7.5 要求"6 张工程实拍全部渲染"，实际公开 **5 张**（门头 1 + 实拍 4）；营业执照照零派生品、零引用 | §5.4 为合规硬约束，优先级高于 §7.5 的计数表述；§2.2 已自标该图"不对外发布" | 2026-09-28 计划阶段 |
| 2 | OG 分享卡片使用工程实拍图，**不做**中文自绘卡片 | 中文自绘需 ≥1.1 MB 字体进 Serverless 函数，会破坏"全静态"（PRD §7.2） | 2026-09-28 计划阶段 |
| 3 | 地图默认采用静态图 + 外链，**不做**站内交互地图 | 静态站无后端，SDK 密钥必然暴露；无自有域名导致白名单配置不稳 | 2026-09-28 计划阶段 |
| 4 | 门头照原始文件已从 `img/c656bb41…jpg` 归档为 `img/_orig_not_published/storefront.jpg` | 该图跨页复用，需与派生管线隔离以防误发布原始大图。**可随时改回** | 2026-09-28 计划阶段 |
| 5 | PRD §2 的"统一社会信用代码""法定代表人"按原文在 `/about` 完整展示 | §4.4 要求展示 §2 全字段；与"不放证件照片"逻辑自洽，但文字仍可被采集。若需降低暴露面可做掩码，会破 §2 全字段要求 | 2026-09-28 计划阶段 |

---

## 6. 环境变量清单

| 变量 | 必填 | 用途 | 本地 | 线上 |
|---|---|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | ✅ | sitemap / OG / canonical 的绝对 URL 基址 | `http://localhost:3000` | ⬜ 待 A8 |
| `NEXT_PUBLIC_AMAP_KEY` | ⬜ 仅 SDK-MODE | 高德 JS API 密钥 | 不设 | 不设 |

> 本地放 `.env.local`（已被 `.gitignore` 覆盖）；线上在 Vercel / Netlify 控制台的 Environment Variables 中配置。
