/**
 * A2 · 图片派生管线（含合规闸门）
 *
 * 设计原则：**白名单驱动，默认拒绝**。
 *   脚本不遍历 `img/` 目录，而是只处理下面 PUBLISHABLE 里显式列出的输入文件。
 *   任何未列名的图片都不会产出派生品 —— 这样 `img/` 里将来多出什么文件，
 *   都不可能"顺手"被发布出去。
 *
 * 合规闸门（PRD §5.4）：
 *   营业执照照 `c9231b84a2a8285c28081548ec3cfb41.jpg` 必须在 BLOCKED 中登记，
 *   命中即 exit 1。它不是"被跳过"，而是"被主动拒绝"——两者语义不同，
 *   拒绝会留下日志证据。
 *
 * 产出：public/images/{key}-{width}.{webp,avif}，以及 og-cover.jpg
 * 报告：scripts/image-report.txt（供验收留档）
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC_DIR = path.join(ROOT, "img");
const ARCHIVE_DIR = path.join(SRC_DIR, "_orig_not_published");
const OUT_DIR = path.join(ROOT, "public", "images");
const REPORT = path.join(ROOT, "scripts", "image-report.txt");

/** 允许发布的输入（白名单）。每项的语义 key 用于产出文件名。 */
const PUBLISHABLE = [
  {
    key: "storefront",
    src: path.join(ARCHIVE_DIR, "storefront.jpg"),
    alt: "重庆锐强建筑劳务有限公司办公场所门头，玻璃门与金属招牌",
    role: "hero",
  },
  {
    key: "rebar-slab",
    src: path.join(SRC_DIR, "98f59ef534ca3d54027df8e1ee09956b.jpg"),
    alt: "施工现场底板钢筋绑扎完成面，周边设蓝色防护网",
    role: "gallery",
  },
  {
    key: "rebar-crew",
    src: path.join(SRC_DIR, "7643475e202712baf7d1b475fccaf030.jpg"),
    alt: "多名施工人员在钢筋网上作业，均佩戴安全帽",
    role: "gallery",
  },
  {
    key: "steel-frame-slab",
    src: path.join(SRC_DIR, "6b47f2f3832295f939ea301d097b2f6a.jpg"),
    alt: "钢结构厂房内楼板钢筋绑扎作业面，远处可见起重设备",
    role: "gallery",
  },
  {
    key: "steel-frame-wide",
    src: path.join(SRC_DIR, "c23bea8ddb08abbda4e419ea2bd5a17a.jpg"),
    alt: "大型钢结构厂房内的大面积钢筋网施工",
    role: "gallery",
  },
];

/**
 * 禁止发布的输入（黑名单）。命中即终止。
 * 这些文件即使被误加入白名单，也不会通过。
 */
const BLOCKED = [
  {
    file: "c9231b84a2a8285c28081548ec3cfb41.jpg",
    reason:
      "营业执照原件照片，含统一社会信用代码与法定代表人姓名（PRD §5.4 硬性禁止发布）",
  },
];

/** 输出宽度档位。1600 用于桌面 hero / 相册大图，800 用于卡片与缩略。 */
const WIDTHS = [1600, 800];

/** 单张派生品的体积上限（字节）。PRD §7.5 要求"显著低于原图"。 */
const MAX_DERIVED_BYTES = 300 * 1024;

/**
 * 编码参数。质量档位是实测标定出来的，不是拍脑袋：
 *   原图 1919x1080 约 1.4MB，压到 1600 宽后
 *     webp q=72 -> 259KB（钢筋细节密集的图也稳在 300KB 以内）
 *     avif q=55 -> 168KB
 *   effort 提到 6 让 webp 多花时间换体积，单张仍在一秒级。
 * 若将来换更复杂的素材导致突破 300KB，应当继续下调 quality，
 * 而不是上调 MAX_DERIVED_BYTES —— 上限是验收标准，不能为了让测试通过而放宽。
 */
const WEBP_QUALITY = 72;
const WEBP_EFFORT = 6;
const AVIF_QUALITY = 55;
const AVIF_EFFORT = 4;

const log = [];
function say(line = "") {
  log.push(line);
  console.log(line);
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  say("图片派生报告");
  say(`生成时间: ${new Date().toISOString()}`);
  say("");

  // ---- 合规闸门：先确认禁发文件没有被列入白名单 ----
  say("== 合规闸门 ==");
  for (const b of BLOCKED) {
    const listed = PUBLISHABLE.some((p) => path.basename(p.src) === b.file);
    if (listed) {
      say(`  [拒绝] ${b.file} 出现在发布白名单中 —— 立即终止`);
      say(`         原因: ${b.reason}`);
      fs.writeFileSync(REPORT, log.join("\n"), "utf8");
      process.exit(2);
    }
    say(`  [拒绝] ${b.file} —— 不产出任何派生品`);
    say(`         原因: ${b.reason}`);
  }
  say("");

  // ---- 逐项处理 ----
  say("== 处理白名单素材 ==");
  const results = [];
  const budgetViolations = [];

  for (const item of PUBLISHABLE) {
    if (!fs.existsSync(item.src)) {
      say(`  [缺失] ${item.src}`);
      say("");
      fs.writeFileSync(REPORT, log.join("\n"), "utf8");
      process.exit(3);
    }

    const meta = await sharp(item.src).metadata();
    say(`  ${item.key}  (源 ${meta.width}x${meta.height})`);

    const produced = [];
    for (const w of WIDTHS) {
      // 不放大：目标宽度超过原图时按原图宽度出图
      const targetW = Math.min(w, meta.width ?? w);

      for (const fmt of ["webp", "avif"]) {
        const outName = `${item.key}-${w}.${fmt}`;
        const outPath = path.join(OUT_DIR, outName);

        let pipe = sharp(item.src).resize({
          width: targetW,
          withoutEnlargement: true,
        });
        pipe =
          fmt === "webp"
            ? pipe.webp({ quality: WEBP_QUALITY, effort: WEBP_EFFORT })
            : pipe.avif({ quality: AVIF_QUALITY, effort: AVIF_EFFORT });

        await pipe.toFile(outPath);
        const bytes = fs.statSync(outPath).size;
        produced.push({ name: outName, bytes });

        if (bytes > MAX_DERIVED_BYTES) {
          budgetViolations.push({
            name: outName,
            bytes,
          });
          say(
            `    [X] ${outName} ${(bytes / 1024).toFixed(0)}KB 超过 ${
              MAX_DERIVED_BYTES / 1024
            }KB 上限`
          );
        }
      }
    }

    const largest = produced.reduce((a, b) => (a.bytes > b.bytes ? a : b));
    say(
      `    产出 ${produced.length} 个文件，最大 ${largest.name} ${(
        largest.bytes / 1024
      ).toFixed(0)}KB`
    );
    say("");

    results.push({ ...item, produced, largest });
  }

  // ---- OG 分享卡片：从 steel-frame-wide 裁 1280x720 ----
  say("== OG 分享卡片 ==");
  const ogSource = PUBLISHABLE.find((p) => p.key === "steel-frame-wide");
  const ogPath = path.join(OUT_DIR, "og-cover.jpg");
  await sharp(ogSource.src)
    .resize({ width: 1280, height: 720, fit: "cover", position: "attention" })
    .jpeg({ quality: 80, mozjpeg: true })
    .toFile(ogPath);
  const ogBytes = fs.statSync(ogPath).size;
  say(`  og-cover.jpg  1280x720  ${(ogBytes / 1024).toFixed(0)}KB`);
  say("");

  // ---- 目录隔离复核 ----
  say("== public/ 隔离复核 ==");
  const publicFiles = [];
  (function walk(dir) {
    for (const n of fs.readdirSync(dir)) {
      const p = path.join(dir, n);
      if (fs.statSync(p).isDirectory()) walk(p);
      else publicFiles.push(p);
    }
  })(path.join(ROOT, "public"));

  const leaked = publicFiles.filter(
    (p) =>
      p.includes("_orig_not_published") ||
      path.basename(p).startsWith("c9231b84") ||
      path.basename(p) === "storefront.jpg"
  );
  const oversized = publicFiles.filter(
    (p) => /\.jpe?g$/i.test(p) && fs.statSync(p).size > 400 * 1024
  );

  say(`  public/ 文件总数: ${publicFiles.length}`);
  say(`  隔离目录泄漏: ${leaked.length}${leaked.length ? " -> " + leaked.join(", ") : " (无)"}`);
  say(`  超 400KB 的 jpg: ${oversized.length}${oversized.length ? " -> " + oversized.join(", ") : " (无)"}`);
  say("");

  say("== 汇总 ==");
  say(`  已处理: ${results.length} 张`);
  say(`  已跳过: 0 张`);
  say(`  已拒绝: ${BLOCKED.length} 张`);
  say(`  派生文件: ${results.reduce((a, r) => a + r.produced.length, 0)} 个 + 1 张 OG 卡片`);
  say(`  体积超标: ${budgetViolations.length} 个`);

  fs.writeFileSync(REPORT, log.join("\n"), "utf8");

  if (budgetViolations.length > 0) {
    console.error(
      `\n[FAIL] ${budgetViolations.length} 个派生文件超出 ${MAX_DERIVED_BYTES / 1024}KB 上线: ` +
        budgetViolations.map((v) => `${v.name}(${(v.bytes / 1024).toFixed(0)}KB)`).join(", ")
    );
    console.error("请下调 WEBP_QUALITY / AVIF_QUALITY，不要放宽体积上限。");
    process.exit(5);
  }
  if (leaked.length > 0 || oversized.length > 0) {
    console.error("\n[FAIL] public/ 隔离复核未通过");
    process.exit(4);
  }
  console.log(`\n报告已写入 ${path.relative(ROOT, REPORT)}`);
}

main().catch((err) => {
  console.error("图片管线失败:", err);
  process.exit(1);
});
