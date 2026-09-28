import { COMPANY, GEO, HAS_GEO, MAP_SEARCH_URL, MAP_SEARCH_URL_BAIDU } from "@/lib/company";

/**
 * 在线地图（PRD §4.5 / 开发计划 A6 + D2）
 *
 * ## 路线选择与理由
 *
 * 采用 **路线 B：静态呈现 + 一键跳转图商官方地图页**，不做 JS SDK 嵌入。
 * 理由（D2 已论证）：本站在 Vercel 上以 `*.vercel.app` 部署且**无后端**，
 * 高德 JS API 的 AK 必须打在客户端包里，且需配置域名白名单 ——
 * 控制台对 `*.vercel.app` 通配符支持不稳定，配错就是一块"地图加载失败"灰块。
 * 而本场景客户的需求是"我要找过去"，真正要的是**准确地点 + 能导航**，
 * 这两点跳转官方地图页都能满足，且零密钥、零配额、零失效风险。
 *
 * ## 两种形态（同构，组件内部自动选择）
 *
 * - **无坐标时**（当前状态）：显示地址卡片 + 图商检索外链。
 *   检索外链把完整地址交给图商解析，标点位置由图商保证，
 *   不存在"我们标错了"的风险。
 * - **有坐标时**：同样显示地址卡片，但外链升级为精确坐标标记，
 *   文案也会从"在地图中搜索该地址"变成"在地图中查看精确位置"。
 *
 * 切换只需在 `lib/company.ts` 的 GEO 里填入 lat/lng，不必改本文件。
 */

/** 图商外链的统一样式（target/rel 是硬性要求，防 window.opener 劫持） */
const LINK_CLASS =
  "border-2 border-border bg-brand-yellow px-3 py-2 text-sm shadow-sm nb-lift inline-block";

export function MapEmbed() {
  return (
    <div className="border-2 border-border bg-card shadow-md">
      {/* 地图呈现区。无坐标时是一张"地址牌"，有坐标时是带标记的说明 */}
      <div className="border-b-2 border-border bg-brand-blue p-5 sm:p-6">
        <p className="font-head text-lg">{COMPANY.name}</p>

        {HAS_GEO ? (
          <>
            <p className="mt-2 text-sm font-medium">精确位置已标注</p>
            <p className="mt-1 break-all text-sm">{COMPANY.address}</p>
            <p className="mt-3 text-xs text-muted-foreground">
              坐标来源：{GEO.source}
              {GEO.verified ? "（已人工核对）" : "（未人工实地核验）"}
            </p>
            {/* SDK-MODE: 若改用交互地图，在此渲染高德 JS API 容器，并在 .env.local 注入 NEXT_PUBLIC_AMAP_KEY */}
          </>
        ) : (
          <>
            <p className="mt-2 text-sm font-medium">注册地址</p>
            <p className="mt-1 break-all">{COMPANY.address}</p>
            <p className="mt-3 text-xs text-muted-foreground">
              点击下方按钮将跳转至地图服务，由其在官方地图中定位该地址。
            </p>
            {/* SDK-MODE: 若改用交互地图，在此渲染高德 JS API 容器，并在 .env.local 注入 NEXT_PUBLIC_AMAP_KEY */}
          </>
        )}
      </div>

      {/* 操作区 */}
      <div className="p-5 sm:p-6">
        <div className="flex flex-wrap gap-3">
          <a
            href={MAP_SEARCH_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={LINK_CLASS}
          >
            {HAS_GEO ? "在高德地图中查看精确位置" : "在高德地图中搜索该地址"}
          </a>
          <a
            href={MAP_SEARCH_URL_BAIDU}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block border-2 border-border bg-card px-3 py-2 text-sm shadow-sm nb-lift"
          >
            在百度地图中搜索
          </a>
        </div>

        <p className="mt-4 text-sm text-muted-foreground">
          外链将在新标签页打开官方地图，可在手机地图 App 中直接发起导航。
        </p>
      </div>
    </div>
  );
}
