# 部署产物与平台兼容性报告（A8 构建侧验收）

> 本文件记录 **在不触碰任何 Vercel 账号的前提下，我能够验证到什么**。
> 报告分两部分：**已验证**（有命令与输出为证）与 **待你完成**（需要账号授权）。

---

## 1. 部署范式判定（结论先行）

**本项目是「静态优先的 Next.js 应用」，两家平台都能承接，无需任何平台专属配置文件。**

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

| 平台 | 需要 `vercel.json` / `netlify.toml` 吗 | 需要环境变量吗 | 需要装适配插件吗 |
|---|---|---|---|
| Vercel | 不需要 | `NEXT_PUBLIC_SITE_URL`（OG/sitemap 用） | 不需要（原生识别 Next 16） |
| Netlify | 不需要 | 同上 | 不需要（Next 运行时已内置） |

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
- **不存在** `output: "export"`。这一点很关键：设了它虽然两家平台都能部署，
  但会连带关掉 `next/image` 的服务端优化，并让将来的 Route Handler 全部失效。
  保留默认让 Vercel 与 Netlify 的 Next 运行时都能接管图片优化。
- **无 API 路由**：`app/` 下只有页面与 `sitemap.ts` / `robots.ts`（都是构建期
  生成静态文件），没有任何 `route.ts`。所以两家平台的免费档都绰绰有余。

### 2.3 环境变量口径一致

代码里 `NEXT_PUBLIC_SITE_URL` 是**唯一**与部署强相关的变量（`lib/site.ts`）：

```ts
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
).replace(/\/$/, "");
```

- 两平台**都**在各自控制台的 Environment Variables 里设这个同名变量，
  无需为平台写分支 —— 没有 `process.env.VERCEL_URL` 之类的平台专属分支。
- 缺省回落到 `localhost:3000`，保证本地构建（含 `tests/seo.test.ts` 的产物
  断言）不需要先配环境变量就能跑。

### 2.4 合规闸门在部署链路上仍然有效

- 营业执照照 `img/c9231b84….jpg` **不在 `public/` 下**，
  构建产物里也没有它的任何派生品 —— 部署不会把它带上线。
- 这条由 A2 的发布白名单在**派生阶段**保证，而不是靠 `robots.txt` 隐藏。
  用 robots 藏一个已经被构建进产物的事实上无效；真正的防线是它压根没进产物。
- `tests/seo.test.ts` 与 `tests/images.test.ts` 共同覆盖这一点。

---

## 3. 待你完成（需要账号授权，我不会代做）

`vercel login` 与 `netlify login` 都是**交互式授权**，且涉及你的账号凭据。
我不代登录、不索取密码或 token。请在你自己的终端里执行。

### 3.1 路径一 · Vercel（PRD §9 指定，推荐）

```bash
# 1) 登录（会打印设备码，你在浏览器里授权）
npx vercel@latest login

# 2) 绑定项目 —— ⚠️ 这里请先停下来和我确认 scope 与项目名
npx vercel@latest link
#    Set up and deploy?               → Y
#    Which scope?                     → 选你的账号
#    Link to existing project?        → N
#    What's your project's name?      → ruiqiang-jianzhu（建议）
#    In which directory is your code? → ./
#    Want to modify these settings?   → N

# 3) 生产部署
npx vercel@latest --prod

# 4) 拿到 https://xxx.vercel.app 之后，回填环境变量并重新部署
npx vercel@latest env add NEXT_PUBLIC_SITE_URL production
npx vercel@latest --prod
```

> ⚠️ **项目名决定最终域名。部署后再改名会换 URL**，届时 canonical / sitemap /
> OG 全要跟着变。所以第 2 步选名字时先确认。

### 3.2 路径二 · Netlify（等效备选）

详细走法见 `DEPLOY.md` §2。要点复述：

```bash
npx netlify-cli@latest login
npx netlify-cli@latest init
npx netlify-cli@latest deploy --prod
```

**不要**为了 Netlify 而加 `output: "export"`。走法 A（让 Netlify 的 Next 运行时
接管）改动最小，行为与 Vercel 最接近；`output:"export"` 会连带要求
`images.unoptimized: true`，属于**为了备选平台而削弱主路径**，不划算。

### 3.3 部署后必须回填的两处

| 位置 | 填什么 |
|---|---|
| `PLACEHOLDERS.md` §1（站点绝对 URL / 线上地址 / 项目名） | 真实 `https://` 地址 |
| 平台控制台的 `NEXT_PUBLIC_SITE_URL` + 重新部署 | 同上的 `https://` 地址 |

**验证方式**：部署后访问 `/sitemap.xml`，`<loc>` 里必须是线上域名；
若仍是 `localhost:3000`，说明环境变量没设或没重新部署。

---

## 4. A8 出口判据对照（PRD §7.8）

| 检查项 | 状态 | 依据 |
|---|---|---|
| 构建退出码 0 | ✅ 已验证 | `scripts/run-next.mjs build` = 0 |
| 5 条路由静态生成 | ✅ 已验证 | 路由表全 ○ + 产物 HTML 存在断言 |
| `sitemap.xml` / `robots.txt` 可访问 | ✅ 本地已验证 / ⬜ 线上待验 | 本地产物存在且可解析 |
| 无平台锁定 | ✅ 已验证 | 无 `vercel.json`、无 `output:"export"`、无 Route Handler |
| 环境变量口径统一 | ✅ 已验证 | 单一 `NEXT_PUBLIC_SITE_URL` |
| 合规闸门在产物中生效 | ✅ 已验证 | 营业执照照零派生、零引用 |
| **线上 `https://` 地址可打开** | ⬜ **待你完成 §3** | 需账号授权 |
| **无痕窗口 + 手机网络实测** | ⬜ **待你完成 §3** | 需真实设备网络 |

---

## 5. 一句话总结

**代码与产物这一侧，A8 的所有可自动验证项已全部通过；剩下的是必须由你本人
授权的两个平台登录动作。** 上线后唯一需要回填的技术值是 `NEXT_PUBLIC_SITE_URL`。
