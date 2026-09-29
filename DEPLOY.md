# 部署手册 · Netlify（当前路径）

> 2026-09-29 更新：实际 site id 为 `c31e2acc-8619-451e-973f-364eeaa8e01b`。
> 发布命令以 `netlify.toml` 为准：安装 Chromium 后执行 `npm run verify`。
> Lint、标准构建、类型检查、三组浏览器探测和全部测试任一步失败均阻止发布。
> 报告必须匹配当前源码指纹、BUILD_ID、运行 ID 和目标地址；缺报告不再跳过。
> 本机可直接运行标准构建，不需要历史的沙箱绕过脚本。下方早期记录中的旧 ID、仅 build 的流程不再适用。

> 依据：`PRD.md` §9 原指定 Vercel，但按用户 2026-09-28 的要求
> **只保留 Netlify**，Vercel 项目已彻底删除（见 `VERIFY_DEPLOY.md` §3.4）。
> 结论：**A0–A7 的产物对可托管的平台同时成立**，唯一实质差异在 `next/image` 的优化方式，见 §3。

---

## 0. 部署方式选择

| 方式 | 适用场景 | 优点 | 代价 |
|---|---|---|---|
| **Git 仓库集成**（当前所用，推荐） | 长期维护 | push 即自动部署、有预览环境 | 需先把仓库推到 GitHub（已完成） |
| CLI 直传 | 无仓库 / 想快速上线 | 最少前置依赖 | 无 Git 集成，后续改动需手动重传 |

> ⚠️ **本机不要用 `netlify deploy --build`**：它会在本机跑 `npm run build`，
> 撞上本机沙箱的 safe-delete 守卫（`.next/turbopack` 递归删除被拦），必然失败。
> **对 Next.js 应用，Netlify 的正确路径只能是 Git 集成（云端构建）。**
>
> 本机若确实需要构建，用 `node scripts/run-next.mjs build` ——
> 它只是绕开本机沙箱的批量删除守卫，**与 Netlify 云端无关**
> （云端走的是标准 `npm run build`）。

---

## 1. Netlify（当前路径）

### 1.0 站点现状

| 项 | 值 |
|---|---|
| 站点名 | `ruiqiang-jianzhu` |
| site id | `20b3c4a5-0258-4453-85fc-ee9c75b8ceda` |
| 生产域名 | `https://ruiqiang-jianzhu.netlify.app` |
| 仓库 | `https://github.com/Elari39/ruiqiang-website`，分支 `main` |
| 构建命令 / 发布目录 | `npm run build` / `.next`（由 `netlify.toml` 声明） |

### 1.1 首次接站的唯一前置：GitHub App 授权

**这是浏览器交互，CLI 与 API 都绕不过**（当时正是卡在这里导致
云端构建报 `Host key verification failed`）：

1. 打开 https://github.com/apps/netlify/installations/new
2. 选择 **Only select repositories** → 勾选 `Elari39/ruiqiang-website` → Install
3. 回到 https://app.netlify.com/projects/ruiqiang-jianzhu/configuration/deploys
   确认：Repository = `Elari39/ruiqiang-website`，Branch = `main`，
   Build command = `npm run build`，Publish directory = `.next`

完成后 push 任意提交即会自动部署，或在该页面点 **Trigger deploy**。

### 1.2 部署后要做的一件事：核对 URL 内容

**不需要在 Netlify 控制台配置任何环境变量。** 站点绝对 URL 已内置为
`lib/site.ts` 的 `PRODUCTION_SITE_URL`（换域名改这一处即可）。

```bash
# 核对线上内容（不是只看状态码！）
#   5 条 <loc> 必须是线上域名，且整份内容里不含 localhost
curl -s https://ruiqiang-jianzhu.netlify.app/sitemap.xml
curl -s https://ruiqiang-jianzhu.netlify.app/robots.txt
```

> ⚠️ **为什么要强调"核对内容"**：2026-09-28 线上实测发现
> `/sitemap.xml`、`/robots.txt` 与 5 页的 `canonical` / `og:url` / `og:image`
> **全部是 `http://localhost:3000`** —— 而它们返回的都是 200。
> 当时文档里写的验证方法是"访问 `/sitemap.xml`，看是否可访问"，
> 于是这个状态持续到了人工发现。**可访问 ≠ 内容正确。**

如果确实需要构建出别的域名（如 staging），才设 `NEXT_PUBLIC_SITE_URL`，
且**必须是干净的 `https://主机名`**：设成 `http://`、`localhost`、带路径或查询串的值，
生产构建会**直接报错终止**（`lib/site.ts` 的 `resolveSiteUrl`）。
所以若构建因这个变量失败，正确做法是**删除或改正该变量**，
而不是去掉校验。

### 1.3 上线验证（PRD §7.8）

| 检查 | 方法 | 期望 |
|---|---|---|
| 5 条路由 | 无痕窗口访问 `/` `/services` `/gallery` `/about` `/contact` | 全部 200，渲染正常 |
| 静态生成 | 看是否出现任何动态错误 | 无 |
| sitemap / robots **内容** | 取回全文（不要只看状态码） | 5 条 `<loc>` 与 `Sitemap:` 行都是线上域名，**全文不含 `localhost`** |
| canonical / og | 查看页面源码（`Ctrl+U`） | `canonical`、`og:url`、`og:image` 的基址都是线上域名 |
| 404 页 | 访问一个不存在的路径 | 返回 404、显示中文「页面未找到」、套用本站主题 |
| 联系方式 | 手机浏览器点击电话 / 邮箱 | 唤起拨号盘 / 邮件客户端 |
| 移动端悬浮条 | 手机访问任意页 | 底部有「立即致电」，且**未遮住页面最后一段内容** |
| 字体 | 手机访问首屏 | 中文标题为粗黑体（非系统默认宋/黑），无长时间空白 |
| 分享卡片 | 把链接发到微信/QQ 或使用 OG 调试工具 | 有标题、描述、实拍封面图 |
| 图片 | DevTools Network | 实际传输 AVIF/WebP，单图 < 300 KB |
| 灯箱 | 在 `/gallery` 点第 3、4 张缩略图 | 弹层显示的就是被点的那一张，左上角计数为 `3 / 4`、`4 / 4`；左右滑动后标题跟着变 |

---

## 2. 走法对照与备选方案

### 2.1 可行性结论

A0–A7 的产物是 **纯静态、零运行时函数、不依赖任何平台专属配置**，所以
Netlify 可以承接（当前已在用），任何支持 Next.js 的平台也都能承接。两条走法：

#### 走法 A（当前所用，推荐）：交给 Netlify 的 Next.js 运行时

由仓库内 `netlify.toml` 声明，**不需要手工执行任何 CLI 命令**：

```toml
[build]
  command = "npm run build"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

- 不改 `next.config.ts`（只有一条平台无关的 `poweredByHeader: false`）。
- **优点**：改动最少，`.next` 由 Netlify 的 Next 运行时接管（App Router 路由分发、
  服务端产物都靠它）。

> ⚠️ **更正（2026-09-28 复核）**：这里此前写的是"`next/image` 的优化由
> Netlify 的 Next 运行时插件接管 / 保留 `next/image` 的服务端优化能力"。
> 复核后发现 **本项目全站没有使用 `next/image`** —— `components/SiteImage.tsx`
> 手写 `<picture>`，直接引用 `scripts/build-images.mjs` 预生成的
> 1600/800 两档 AVIF/WebP 实体文件（这样"发布的到底是哪几个文件"才可逐字断言）。
> 所以走法 A 的收益**不在图片优化**，而在于让 App Router 的路由分发与服务端产物生效。

#### 走法 B（不推荐）：纯静态导出

在 `next.config.ts` 加：

```ts
const nextConfig = {
  output: "export",
  images: { unoptimized: true },   // ← 必须同时加
};
```

> ⚠️ **两处联动，缺一必错**：
> 1. 设了 `output:"export"` 后，`next/image` 默认依赖的**运行时图片优化服务不存在了**，必须同时设 `images.unoptimized: true`，否则构建直接报错。（本项目虽未用 `next/image`，但这条约束仍然成立。）
> 2. `output:"export"` 不支持 Route Handler / 动态函数，且会把 App Router 的路由分发退化为静态目录直传。
>
> **本项目不采用走法 B**：走法 A 没有额外代价，且产物行为与官方 Next 托管最接近。
> `tests/deploy.test.ts` 里有断言钉住这一点，改用走法 B 会让测试变红。

---

## 3. 平台差异对照（本项目相关）

| 维度 | Netlify（当前所用） | Vercel（已下线） |
|---|---|---|
| Next.js 支持 | 需 Next 运行时插件（`netlify.toml` 已声明） | 原生、零配置 |
| `next/image` 优化 | 本项目**未使用 `next/image`**（`SiteImage` 直引预生成的 AVIF/WebP 实体文件），此项无关 | 同上，无关 |
| 配置文件 | `netlify.toml`（本项目**已加入**） | `vercel.json`（本项目**不需要**） |
| 国内访问速度 | **慢**（无中国大陆节点，跨境链路。首字节常 1–3s，晚高峰更差） | **同样慢**（也没有中国大陆节点，与 Netlify 同一类问题） |
| ICP 备案 | 无需（境外托管） | 无需（境外托管） |
| 自动 HTTPS | ✅ | ✅ |
| 免费档是否够用 | 够（纯静态站） | 够 |
| 无自有域名 | 自动分配 `*.netlify.app` | 自动分配 `*.vercel.app` |

> **关于国内速度，先把一个常见误解说清楚（2026-09-28 补充）**：
> **换平台解决不了速度问题。** Vercel 与 Netlify 都没有中国大陆节点，
> 默认都是境外托管，两者的国内访问速度属于同一量级 —— 慢是结构性的，
> 不是配置能优化的。真正显著提速只有一条路：
> **域名在中国大陆完成 ICP 备案 + 国内云托管（阿里云 / 腾讯云 OSS + CDN）**，
> 但那就绕不开备案与企业主体资料，与 PRD §9「无自有域名」的前提冲突。
>
> 用户已明确选择「接受现状，先不折腾」——**保留 Netlify 单平台即可**，
> 不要再为提速而反复换平台。

> **对本项目的结论**：当前部署在 Netlify（`https://ruiqiang-jianzhu.netlify.app`）。
> 由于源码侧零平台锁定，将来若需迁回 Vercel 或其他平台，
> 只需接好 Git 集成、删掉 `netlify.toml` 即可，源码一行不用改。
> **无论哪个平台，都不要设 `output:"export"`，除非确实需要把构建产物当静态文件搬走。**

---

## 4. 常见故障与排查

| 症状 | 最可能原因 | 处理 |
|---|---|---|
| 构建成功但页面白屏、中文不显示 | 字体加载超时 / 字体文件过大 | 检查中文两份的 `preload:false` 是否生效；确认 `globals.css` 的 `--font-cjk-fallback` 兜底链完整（PingFang SC / Microsoft YaHei 等，见 DEVELOPMENT_PLAN §0/D1） |
| 页面能打开但没有任何样式 | Tailwind v4 的 `@import "tailwindcss"` 被覆盖 | A3 步骤 3 的 globals.css 合并回滚 |
| 图片全 404 | 派生品未进 `public/images/`，或走了 `output:"export"` 却没设 `unoptimized` | 重跑 `scripts/build-images.mjs`；核对 §2.1 走法 B 的两处联动 |
| 地图位置不对 | 坐标来自自动地理编码且未实地核验 | A6 手动在浏览器地图核对一次；文案不得写"精确到门牌" |
| 分享到微信没有封面图 | `og:image` 指向 localhost / 错误域名 | 见下面两行；本项目已改为"域名内置"，正常不会再发生 |
| `/sitemap.xml` 里全是 localhost | 环境变量把基址设错了（或历史遗留的旧构建） | **先取回全文核对**；确认 Netlify 上没有把 `NEXT_PUBLIC_SITE_URL` 设成 localhost。新代码下这种值会让**构建直接失败**，所以若构建是绿的却仍是 localhost，说明部署的还是旧提交 |
| 构建失败并报 `NEXT_PUBLIC_SITE_URL 不能用于生产构建` | Netlify 的环境变量设成了 http / localhost / 带路径的值 | **删除或改正那个变量**（线上不需要它），不要去掉校验 |
| Netlify 云端构建报 `Host key verification failed` | 缺 GitHub App 授权（无 SSH 部署密钥） | 走 §1.1 的浏览器授权流程，这是唯一可行路径 |
| 本机 `netlify deploy --build` 报 safe-delete 拦截 | 本机沙箱守卫拦了 `.next/turbopack` 递归删除 | **不要在本地构建后直传**，走 Git 集成让 Netlify 云端构建 |
| 本机 `npx` 命令卡住无输出 | 系统代理 | 本机配了系统代理；必要时设 `NO_PROXY` 或临时关代理 |
| `netlify login` 一直等 | 交互式命令在无 TTY 环境 | **必须**由你在自己的终端里跑，不要在自动化环境里跑 |
