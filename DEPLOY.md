# 部署手册 · Vercel（主路径）与 Netlify（备选）

> 依据：`PRD.md` §9（Vercel 指定、无自有域名、`*.vercel.app`）＋ 本次需求（需支持 Netlify 或 Vercel）
> 结论：**A0–A7 的产物本身对两家平台同时成立**，唯一实质差异在 `next/image` 的优化方式，见 §3。

---

## 0. 部署方式选择

| 方式 | 适用场景 | 优点 | 代价 |
|---|---|---|---|
| **CLI 直传**（本计划默认） | 无 GitHub 仓库 / 想快速上线 | 最少前置依赖 | 无 Git 集成，后续改动需手动重传 |
| **Git 仓库集成** | 长远维护（推荐长期） | push 即自动部署、有预览环境 | 需先把仓库推到 GitHub/GitLab |

> 本计划默认走 **CLI 直传**，因为当前项目**尚未 `git init`**、也无远端仓库。若你已把仓库托管到 GitHub，改用 Git 集成更省事，只需在平台上选仓库、Framework 选 Next.js、构建命令与输出目录留空即可。

---

## 1. Vercel（主路径）

### 1.1 前置

```bash
# 用全路径 git（本机 bash 的 git 是坏 shim）
"/c/Program Files/Git/cmd/git.exe" add -A
"/c/Program Files/Git/cmd/git.exe" diff --cached --stat      # ← 必看，确认没有误提交
"/c/Program Files/Git/cmd/git.exe" commit -m "chore: 上线前收口"
```

### 1.2 登录（**交互步骤，必须由你本人完成**）

```bash
npx vercel@60.1.3 login
```

- 会打印一个验证链接与设备码，**你在浏览器里完成授权**。
- 凭据由 CLI 自己写入 `~/.vercel`（或系统凭据管理器）。**我不代登录、不索取账号密码、不索取 token。**
- 认证边界（PRD §9）：不代用户创建账号。

### 1.3 绑定项目 —— **此处暂停确认**

```bash
npx vercel@60.1.3 link
```

CLI 会问：
- `Set up and deploy?` → **Y**
- `Which scope?` → 选择你的账号 / team
- `Link to existing project?` → **N**
- `What's your project's name?` → **建议 `ruiqiang-jianzhu`**
- `In which directory is your code located?` → `./`
- `Want to modify these settings?` → **N**（Next.js 会被自动识别）

> ⚠️ **项目名决定最终地址 `https://<project>.vercel.app`。部署后再改项目名会更换 URL**，届时 `NEXT_PUBLIC_SITE_URL`、sitemap、OG 全部要跟着改，所以这里先确认好再回车。
> **请在此暂停**，把 scope 与项目名告诉我确认后再继续。

### 1.4 生产部署

```bash
npx vercel@60.1.3 --prod
```

成功后会打印形如 `https://ruiqiang-jianzhu.vercel.app` 的 Production URL。

### 1.5 部署后必须做的一件事

```bash
# 1) 把 URL 写进两处台账
#    PLACEHOLDERS.md §1
#    TASKS.md → A8 验证输出
# 2) 设置环境变量并重新部署（否则 sitemap / OG 里仍是 localhost:3000）
npx vercel@60.1.3 env add NEXT_PUBLIC_SITE_URL production
#    粘贴 https://ruiqiang-jianzhu.vercel.app
npx vercel@60.1.3 --prod
```

### 1.6 上线验证（PRD §7.8）

| 检查 | 方法 | 期望 |
|---|---|---|
| 5 条路由 | 无痕窗口访问 `/` `/services` `/gallery` `/about` `/contact` | 全部 200，渲染正常 |
| 静态生成 | 看是否出现任何动态错误 | 无 |
| sitemap / robots | 访问 `/sitemap.xml` `/robots.txt` | 可访问，且 **URL 是线上域名而非 localhost** |
| 联系方式 | 手机浏览器点击电话 / 邮箱 | 唤起拨号盘 / 邮件客户端 |
| 移动端悬浮条 | 手机访问任意页 | 底部有「立即致电」，且**未遮住页面最后一段内容** |
| 字体 | 手机访问首屏 | 中文标题为粗黑体（非系统默认宋/黑），无长时间空白 |
| 分享卡片 | 把链接发到微信/QQ 或使用 OG 调试工具 | 有标题、描述、实拍封面图 |
| 图片 | DevTools Network | 实际传输 AVIF/WebP，单图 < 300 KB |

---

## 2. Netlify（备选路径）

### 2.1 可行性结论

A0–A7 的产物是 **纯静态、零运行时函数、不依赖 `vercel.json`**，所以 Netlify 可以承接。两条走法：

#### 走法 A（推荐）：交给 Netlify 的 Next.js 运行时

```bash
npx netlify-cli@latest login     # 交互，由你本人完成授权
npx netlify-cli@latest init      # 关联/新建站点
npx netlify-cli@latest deploy --prod
```

- 不改 `next.config.ts`，`next/image` 的优化由 Netlify 的 Next 运行时插件接管。
- 需要在站点设置里安装/启用 Next.js runtime（`init` 时 CLI 一般会提示）。
- **优点**：与 Vercel 行为最接近，改动最少。

#### 走法 B：纯静态导出

在 `next.config.ts` 加：

```ts
const nextConfig = {
  output: "export",
  images: { unoptimized: true },   // ← 必须同时加
};
```

然后：

```bash
npm run build                    # 产出 out/
npx netlify-cli@latest deploy --prod --dir=out
```

> ⚠️ **两处联动，缺一必错**：
> 1. 设了 `output:"export"` 后，`next/image` 默认依赖的**运行时图片优化服务不存在了**，必须同时设 `images.unoptimized: true`，否则构建直接报错。
> 2. `output:"export"` 不支持 Route Handler / 动态函数。本项目**本来就没有**（纯静态），所以安全——但如果将来加了 `/api/og` 之类的边缘函数（见 D3），这条路会断。

### 2.2 Netlify 也可以直接托管静态资源

若你只想把 `out/` 当普通静态站扔上去，Netlify 的 `netlify.toml` 最小配置：

```toml
[build]
  command = "npm run build"
  publish = "out"

[[headers]]
  for = "/*"
  [headers.values]
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
```

---

## 3. 两家平台的差异对照（本项目相关）

| 维度 | Vercel | Netlify |
|---|---|---|
| Next.js 支持 | 原生、零配置 | 需 Next 运行时插件（走法 A）或静态导出（走法 B） |
| `next/image` 优化 | 开箱即用（运行时） | 走法 A 等同；走法 B 必须 `unoptimized: true` |
| 配置文件 | `vercel.json`（本项目**不需要**） | `netlify.toml`（本项目**已加入**，见下） |
| 国内访问速度 | **慢**（无中国大陆节点，跨境链路。首字节常 1–3s，晚高峰更差） | **同样慢**（也没有中国大陆节点，与 Vercel 同一类问题） |
| ICP 备案 | 无需（境外托管） | 无需（境外托管） |
| 自动 HTTPS | ✅ | ✅ |
| 免费档是否够用 | 够（纯静态站） | 够 |
| 无自有域名 | 自动分配 `*.vercel.app` | 自动分配 `*.netlify.app` |

> **关于国内速度，先把一个常见误解说清楚（2026-09-28 补充）**：
> **换平台解决不了速度问题。** Vercel 与 Netlify 都没有中国大陆节点，
> 默认都是境外托管，两者的国内访问速度属于同一量级 —— 慢是结构性的，
> 不是配置能优化的。真正显著提速只有一条路：
> **域名在中国大陆完成 ICP 备案 + 国内云托管（阿里云 / 腾讯云 OSS + CDN）**，
> 但那就绕不开备案与企业主体资料，与 PRD §9「无自有域名」的前提冲突。
>
> 所以本项目的双平台部署（Vercel + Netlify）定位是**平台冗余与多入口**，
> 不是提速手段。用户已明确选择「接受现状，先不折腾」。

> **对本项目的结论**：PRD 指定 Vercel，且 Vercel 对 Next 16 的支持路径最短，**优先 Vercel**。Netlify 作为等效备选，切换成本约 10 分钟（走法 A）。**两者都不要设 `output:"export"`，除非你确实需要把构建产物当静态文件搬走。**

---

## 4. 常见故障与排查

| 症状 | 最可能原因 | 处理 |
|---|---|---|
| 构建成功但页面白屏、中文不显示 | 字体加载超时 / 字体文件过大 | 检查中文两份的 `preload:false` 是否生效；确认 `--font-head` 的 `local()` 兜底链完整（DEVELOPMENT_PLAN §0/D1） |
| 页面能打开但没有任何样式 | Tailwind v4 的 `@import "tailwindcss"` 被覆盖 | A3 步骤 3 的 globals.css 合并回滚 |
| 图片全 404 | 派生品未进 `public/images/`，或走了 `output:"export"` 却没设 `unoptimized` | 重跑 `scripts/build-images.mjs`；核对 §2.1 走法 B 的两处联动 |
| 地图位置不对 | 坐标来自自动地理编码且未实地核验 | A6 手动在浏览器地图核对一次；文案不得写"精确到门牌" |
| 分享到微信没有封面图 | `og:image` 是相对路径 / 指向本地 | 确认 `NEXT_PUBLIC_SITE_URL` 已设为线上域名并**重新部署** |
| `/sitemap.xml` 里全是 localhost | 同上 | 设置 `NEXT_PUBLIC_SITE_URL` → 重新部署 |
| 本机 `npx vercel` 卡住无输出 | 系统代理 | 本机配了系统代理；必要时设 `NO_PROXY` 或临时关代理 |
| `vercel login` 一直等 | 交互式命令在无 TTY 环境 | **必须**由你在自己的终端里跑，不要在自动化环境里跑 |
