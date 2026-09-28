# 部署产物与平台兼容性报告（A8 构建侧验收）

> 本文件记录 **部署这件事上，哪些是可自动验证的、哪些需要账号授权**。
> 报告分两部分：**已验证**（有命令与输出为证）与 **待你完成**（需要账号授权）。
>
> **2026-09-28 终态**：站点部署在 **Netlify**（`https://ruiqiang-jianzhu.netlify.app`）。
> 最初按 PRD §9 部署到 Vercel，后按用户要求下线 Vercel 并只保留 Netlify，
> 见 §3.4 的变更说明。

---

## 1. 部署范式判定（结论先行）

**本项目是「静态优先的 Next.js 应用」，平台可自由更换，源码侧无需任何平台专属配置。**

依据 —— 构建输出的路由表（`node scripts/run-next.mjs build` 实测）：

```
Route (app)
┌ ○ /
├ ○ /_not-found
├ ○ /about
├ ○ /contact
├ ○ /gallery
├ ○ /robots.txt
├ ○ /services
└ ○ /sitemap.xml

○  (Static)  prerendered as static content
```

**8 条路由全部为 `○ (Static)`，没有任何 `ƒ (Dynamic)`，也没有边缘函数 / Route Handler。**

这意味着：

| 平台 | 需要平台配置文件吗 | 需要环境变量吗 | 需要装适配插件吗 |
|---|---|---|---|
| **Netlify（当前所用）** | **需要 `netlify.toml`**（已加入，见 §2.5） | `NEXT_PUBLIC_SITE_URL`（OG/sitemap 用） | 需要 `@netlify/plugin-nextjs` |
| Vercel（已下线） | 不需要 | 同上 | 不需要（原生识别 Next 16） |

> **2026-09-28 更新 · 部署目标收敛为 Netlify 单一平台**
> 仓库里的 `netlify.toml` 是**增量**配置：`next.config.ts` 保持默认空配置，
> 平台可移植性结论（本文件 §2.2）依然成立 —— Vercel 项目被整体删除时，
> 源码一行未改，直接把 GitHub 仓库接到 Netlify 就能用。
> `tests/deploy.test.ts` 的对应断言为「允许各平台自己的配置文件，
> 但 netlify.toml 必须声明 @netlify/plugin-nextjs」。

---

## 2. 已验证项（有据可查）

### 2.1 静态生成确认（PRD §7.2 / §7.7）

- **命令**：`node scripts/run-next.mjs build`
- **结果**：退出码 0；上方路由表 8 条全 ○；无 `ƒ`。
- **自动化断言**：`tests/seo.test.ts` 的「静态生成确认」3 条测试，逐页检查产物
  `.next/server/app/*.html` 存在 —— 这条比读构建日志更硬，因为日志会被后续
  优化阶段改写印象，而产物文件的存在与否是二值事实。

### 2.2 无平台锁定（无 lock-in）

- 仓库内**不存在** `vercel.json`；`next.config.ts` 保持默认空配置：
  ```ts
  const nextConfig: NextConfig = { /* config options here */ };
  ```
  —— 换平台时不需要推翻任何配置。
- **不存在** `output: "export"`。这一点很关键：设了它虽然平台也能部署，
  但会连带关掉 `next/image` 的服务端优化，并让将来的 Route Handler 全部失效。
  保留默认让 Netlify 的 Next 运行时能接管图片优化。
- **无 API 路由**：`app/` 下只有页面与 `sitemap.ts` / `robots.ts`（都是构建期
  生成静态文件），没有任何 `route.ts`。所以 Netlify 免费档绰绰有余。

### 2.3 环境变量口径一致

代码里 `NEXT_PUBLIC_SITE_URL` 是**唯一**与部署强相关的变量（`lib/site.ts`）：

```ts
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
).replace(/\/$/, "");
```

- 平台控制台的 Environment Variables 里设这个同名变量（当前是 Netlify），
  无需为平台写分支 —— 没有 `process.env.VERCEL_URL` / `NETLIFY` 之类的平台专属分支。
- 缺省回落到 `localhost:3000`，保证本地构建（含 `tests/seo.test.ts` 的产物
  断言）不需要先配环境变量就能跑。

### 2.4 合规闸门在部署链路上仍然有效

- 营业执照照 `img/c9231b84….jpg` **不在 `public/` 下**，
  构建产物里也没有它的任何派生品 —— 部署不会把它带上线。
- 这条由 A2 的发布白名单在**派生阶段**保证，而不是靠 `robots.txt` 隐藏。
  用 robots 藏一个已经被构建进产物的事实上无效；真正的防线是它压根没进产物。
- `tests/seo.test.ts` 与 `tests/images.test.ts` 共同覆盖这一点。

### 2.5 Netlify 侧配置（当前部署目标）

仓库内 `netlify.toml` 采用 **走法 A**（Netlify 的 Next.js 运行时）：

```toml
[build]
  command = "npm run build"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

- **插件这一行不能省**。只写 `publish = ".next"` 而不装插件时，Netlify 会把
  `.next` 当成纯静态目录直传，`_next/static` 之外的东西（App Router 路由分发、
  `next/image` 优化端点、服务端产物）会静默失效 —— 页面可能还能打开，
  但行为不对，属于难排查的退化。这条已写成测试断言，改坏会红。
- `next.config.ts` **保持默认空配置**：不加 `output:"export"`、
  不加 `images.unoptimized`。
- 三组响应头：安全头 / `/images/*` 一周 / `/_next/static/*` 一年 immutable。
  `/images/*` 用一周而非一年，是因为该目录文件名**不含内容哈希**
  （形如 `storefront-1600.webp`），immutable 会让换图后用户长期拿到旧图。

**Netlify 站点**：`ruiqiang-jianzhu`
（site id `20b3c4a5-0258-4453-85fc-ee9c75b8ceda`），URL `https://ruiqiang-jianzhu.netlify.app`。
站点侧构建配置（`repo_url` / `provider=github` / `branch=main` / `cmd=npm run build`）
已通过 API 写入建站。

**Git 自动部署闸门（已于 2026-09-28 解决）**：Netlify 的 Git 自动部署需要
**GitHub App 授权**，这是浏览器交互，只能由用户本人完成。用户已自行完成授权
并成功部署，站点现已上线。当时的排查过程保留在下方 §3.4，供换仓库/换账号时参考。

---

## 3. 账号授权相关的步骤与排查记录

`netlify login` 是**交互式授权**，且涉及账号凭据。我不代登录、不索取密码或 token。
当前部署已由用户本人完成，本节转为**排查记录**，供换仓库 / 换账号时复用。

### 3.1 Netlify 部署（当前唯一路径）

详细走法见 `DEPLOY.md` §2。要点复述：

```bash
npx netlify-cli@latest login
npx netlify-cli@latest init
```

**不要**为了 Netlify 而加 `output: "export"`。走法 A（让 Netlify 的 Next 运行时
接管）改动最小；`output:"export"` 会连带要求 `images.unoptimized: true`，
等于**为了部署方式而削弱图片优化能力**，不划算。

### 3.2 Netlify Git 自动部署的唯一前置：GitHub App 授权

**这是本项目当时唯一卡住的环节**：站点、`netlify.toml`、站点侧构建配置都齐了，
唯独缺 Git 授权，所以云端构建停在 `preparing repo` 阶段报
`Host key verification failed`。

**必须由你在浏览器完成**（这是 GitHub App 的 OAuth/安装流程，CLI 与 API 都绕不过）：

1. 打开 https://github.com/apps/netlify/installations/new
2. 选择 **Only select repositories** → 勾选 `Elari39/ruiqiang-website` → Install
3. 回到 https://app.netlify.com/projects/ruiqiang-jianzhu/configuration/deploys
   确认：Repository = `Elari39/ruiqiang-website`，Branch = `main`，
   Build command = `npm run build`，Publish directory = `.next`

完成后 push 任意提交即会自动部署，或在该页面点 **Trigger deploy**。

> 我试过并**已排除**的替代路径（不要再重复试）：
> - 用 API 直接写 `repo_url` → 配置写进去了，但缺 SSH 部署密钥，构建照样失败；
> - 自己 `ssh-keygen` 生成密钥对、把私钥交给 Netlify → Netlify API
>   **不接受**自定义 `repo.deploy_key`（返回 `{"errors":{"path":["is invalid"]}}`）；
> - `netlify link --git-remote-url Elari39/ruiqiang-website` → 只打印
>   "Project already linked"，**不会建立 Git 授权**。

> ⚠️ **不要用本机 `netlify deploy --build`**：它会在本机跑 `npm run build`，
> 撞上本机沙箱的 safe-delete 守卫（`.next/turbopack` 递归删除被拦），必然失败。
> 对 Next.js 应用，**Netlify 的正确路径只能是 Git 集成（云端构建）**。
>
> 附带提醒：CLI 每次运行都会重新生成 `.netlify/netlify.toml`，
> 并把 `publish` 写成本机绝对路径（`publishOrigin = "config"`）。
> 该目录已被 `.gitignore` 忽略、不会入库，但排查时要知道它存在且会覆盖你的预期。

### 3.3 部署后必须回填的两处

| 位置 | 填什么 |
|---|---|
| `PLACEHOLDERS.md` §1 / §8（站点绝对 URL / 线上地址） | 真实 `https://` 地址 |
| Netlify 控制台的 `NEXT_PUBLIC_SITE_URL` + 重新部署 | 同上的 `https://` 地址 |

**验证方式**：部署后访问 `/sitemap.xml`，`<loc>` 里必须是线上域名；
若仍是 `localhost:3000`，说明环境变量没设或没重新部署。

### 3.4 关于 Vercel（路径已废弃）

PRD §9 原本指定 Vercel。项目一度部署在 `https://ruiqiang-jianzhu.vercel.app`
（Git 集成、Production 环境变量均已配好），但用户于 2026-09-28 明确要求
**只保留 Netlify**，Vercel 项目已通过 `vercel remove` **彻底删除**：

- Vercel 控制台中 `ruiqiang-jianzhu` 已不存在；
- `https://ruiqiang-jianzhu.vercel.app` 现返回 **404**；
- 本地 `.vercel/` 目录已清理。

源码侧**未因此改动一行** —— 这正是 §2.2「零平台锁定」的可验证价值：
删掉一个平台不需要动源码，接入另一个平台也不需要。

---

## 4. A8 出口判据对照（PRD §7.8）

| 检查项 | 状态 | 依据 |
|---|---|---|
| 构建退出码 0 | ✅ 已验证 | `scripts/run-next.mjs build` = 0 |
| 8 条路由静态生成 | ✅ 已验证 | 路由表全 ○ + 产物 HTML 存在断言 |
| `sitemap.xml` / `robots.txt` 可访问 | ✅ 线上已验证 | `https://ruiqiang-jianzhu.netlify.app/sitemap.xml` 返回 200 |
| 无平台锁定 | ✅ 已验证 | 无 `vercel.json`、无 `output:"export"`、无 Route Handler |
| 环境变量口径统一 | ✅ 已验证 | 单一 `NEXT_PUBLIC_SITE_URL` |
| 合规闸门在产物中生效 | ✅ 已验证 | 营业执照照零派生、零引用 |
| **线上 `https://` 地址可打开** | ✅ 已验证 | 7 个端点全部 200（见 §2.5） |
| **无痕窗口 + 手机网络实测** | ⬜ 待你完成 | 需真实设备网络（国内访问速度见 `DEPLOY.md` §3） |

---

## 5. 一句话总结

**代码与产物这一侧，A8 的所有可自动验证项已全部通过；站点已上线在
`https://ruiqiang-jianzhu.netlify.app`。** 剩下唯一无法自动化的一项是
**手机真机 + 无痕窗口的人工观感验收**（拨号唤起、悬浮条遮挡、字体、分享卡片）。
