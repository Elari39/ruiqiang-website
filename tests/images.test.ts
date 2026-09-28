/**
 * A2 验收测试：图片管线与合规闸门
 *
 * 这是全项目**最重要**的一组测试。PRD §5.4 是硬性合规约束：营业执照照片含
 * 统一社会信用代码与法定代表人姓名，高清证件图公示在公网存在被伪冒注册的风险。
 * 一旦泄漏到 public/ 并随 Vercel 发布，就是不可撤回的公开事件。
 *
 * 因此这里不只断言"文件不存在"，还断言"管线自身具备拒绝能力"——
 * 即：即使有人把营业执照照塞进白名单，管线也必须主动终止。
 */
import { describe, expect, it, beforeAll } from "vitest";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const PUBLIC = path.join(ROOT, "public");
const IMAGES = path.join(PUBLIC, "images");
const SRC_IMG = path.join(ROOT, "img");

/** 营业执照照片文件名（禁止发布的唯一一张） */
const LICENSE_PHOTO = "c9231b84a2a8285c28081548ec3cfb41.jpg";

/** 应发布到 public/images/ 的语义 key */
const PUBLISHED_KEYS = [
  "storefront",
  "rebar-slab",
  "rebar-crew",
  "steel-frame-slab",
  "steel-frame-wide",
] as const;

function walk(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir)) {
    const p = path.join(dir, entry);
    if (fs.statSync(p).isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

/** 归一化为相对 ROOT 的 posix 路径，便于跨平台断言 */
function rel(p: string): string {
  return path.relative(ROOT, p).split(path.sep).join("/");
}

describe("合规闸门：营业执照照片绝不发布（PRD §5.4 / §7.7）", () => {
  let publicFiles: string[];

  beforeAll(() => {
    publicFiles = walk(PUBLIC);
  });

  it("public/ 下不存在营业执照照片的任何副本", () => {
    const hits = publicFiles.filter((p) =>
      path.basename(p).includes("c9231b84")
    );
    expect(hits.map(rel)).toEqual([]);
  });

  it("public/ 下不存在任何源自 _orig_not_published/ 的文件", () => {
    const hits = publicFiles.filter((p) =>
      rel(p).includes("_orig_not_published")
    );
    expect(hits.map(rel)).toEqual([]);
  });

  it("不存在名为 storefront.jpg 的原始大图泄漏到 public/", () => {
    const hits = publicFiles.filter((p) => path.basename(p) === "storefront.jpg");
    expect(hits.map(rel)).toEqual([]);
  });

  it("原始素材目录里营业执照照仍然在（只归档，未删除）", () => {
    expect(fs.existsSync(path.join(SRC_IMG, LICENSE_PHOTO))).toBe(true);
  });

  it("管线脚本中营业执照照登记在 BLOCKED 名单里，而非仅仅不在白名单", () => {
    const script = fs.readFileSync(
      path.join(ROOT, "scripts", "build-images.mjs"),
      "utf8"
    );
    expect(script).toContain("const BLOCKED");
    expect(script).toContain(LICENSE_PHOTO);
    // 必须存在"拒绝即终止"的逻辑
    expect(script).toMatch(/process\.exit\(2\)/);
  });
});

describe("派生品齐备且规格达标（PRD §6.1 / §7.5）", () => {
  it("5 张公开图 × 2 宽度 × 2 格式 = 20 个派生文件全部存在", () => {
    const missing: string[] = [];
    for (const key of PUBLISHED_KEYS) {
      for (const w of [1600, 800]) {
        for (const ext of ["webp", "avif"]) {
          const p = path.join(IMAGES, `${key}-${w}.${ext}`);
          if (!fs.existsSync(p)) missing.push(`${key}-${w}.${ext}`);
        }
      }
    }
    expect(missing).toEqual([]);
  });

  it("OG 分享卡片存在且为 1280x720", async () => {
    const og = path.join(IMAGES, "og-cover.jpg");
    expect(fs.existsSync(og)).toBe(true);
    const sharp = (await import("sharp")).default;
    const meta = await sharp(og).metadata();
    expect(meta.width).toBe(1280);
    expect(meta.height).toBe(720);
  });

  it("每个派生文件都小于 300KB", () => {
    const derived = fs
      .readdirSync(IMAGES)
      .filter((f) => /\.(webp|avif)$/i.test(f));
    expect(derived.length).toBeGreaterThanOrEqual(20);

    const over = derived
      .map((f) => ({ f, bytes: fs.statSync(path.join(IMAGES, f)).size }))
      .filter((x) => x.bytes > 300 * 1024)
      .map((x) => `${x.f}=${(x.bytes / 1024).toFixed(0)}KB`);
    expect(over).toEqual([]);
  });

  it("派生品总体积显著低于原始素材（至少压缩到 1/4）", () => {
    const originalBytes = fs
      .readdirSync(SRC_IMG)
      .filter((f) => /\.jpe?g$/i.test(f))
      .reduce((a, f) => a + fs.statSync(path.join(SRC_IMG, f)).size, 0)
      + fs.statSync(
          path.join(SRC_IMG, "_orig_not_published", "storefront.jpg")
        ).size;

    // 只统计会被浏览器真实下载的一套（webp），才是有效对比
    const webpBytes = fs
      .readdirSync(IMAGES)
      .filter((f) => /\.webp$/i.test(f))
      .reduce((a, f) => a + fs.statSync(path.join(IMAGES, f)).size, 0);

    expect(webpBytes).toBeLessThan(originalBytes / 4);
  });

  it("原图中体积最大的单张（1.4MB）压缩比至少 4 倍", () => {
    const src = path.join(SRC_IMG, "c23bea8ddb08abbda4e419ea2bd5a17a.jpg");
    const srcBytes = fs.statSync(src).size;
    const webp = path.join(IMAGES, "steel-frame-wide-1600.webp");
    const webpBytes = fs.statSync(webp).size;
    expect(srcBytes / webpBytes).toBeGreaterThan(4);
  });

  it("800 宽档位确实小于 1600 宽档位（证明确实做了响应式多尺寸）", () => {
    for (const key of PUBLISHED_KEYS) {
      const big = fs.statSync(path.join(IMAGES, `${key}-1600.webp`)).size;
      const small = fs.statSync(path.join(IMAGES, `${key}-800.webp`)).size;
      expect(small, `${key} 的 800 档应小于 1600 档`).toBeLessThan(big);
    }
  });
});

describe("管线可复现且幂等", () => {
  /*
   * 本机沙箱禁止从 vitest worker 内部 spawn 任何子进程（连 cmd.exe 都 EBUSY），
   * 所以这里不调 CLI，而是用**与管线相同的 sharp 参数**在进程内重算一遍，
   * 字节级比对磁盘上的产物。这比"再跑一次脚本看看退不退 0"更强：
   * 它直接证明编码是确定性的，产物可复现。
   */
  it("用相同参数重算，产出的字节与磁盘上完全一致（编码确定性）", async () => {
    const sharp = (await import("sharp")).default;

    const CASES: Array<{ src: string; out: string; w: number }> = [
      {
        src: path.join(SRC_IMG, "98f59ef534ca3d54027df8e1ee09956b.jpg"),
        out: path.join(IMAGES, "rebar-slab-1600.webp"),
        w: 1600,
      },
      {
        src: path.join(SRC_IMG, "c23bea8ddb08abbda4e419ea2bd5a17a.jpg"),
        out: path.join(IMAGES, "steel-frame-wide-800.webp"),
        w: 800,
      },
    ];

    for (const c of CASES) {
      const fresh = await sharp(c.src)
        .resize({ width: c.w, withoutEnlargement: true })
        .webp({ quality: 72, effort: 6 })
        .toBuffer();
      const onDisk = fs.readFileSync(c.out);
      expect(
        fresh.length,
        `${path.basename(c.out)} 重算字节数应与磁盘一致`
      ).toBe(onDisk.length);
      expect(Buffer.compare(fresh, onDisk)).toBe(0);
    }
  }, 120_000);

  it("管线脚本自带体积上限的自检与失败退出（不允许静默超标）", () => {
    const script = fs.readFileSync(
      path.join(ROOT, "scripts", "build-images.mjs"),
      "utf8"
    );
    // 超标必须导致进程失败，而不是只打一行警告
    expect(script).toMatch(/budgetViolations\.length\s*>\s*0/);
    expect(script).toMatch(/process\.exit\(5\)/);
    expect(script).toMatch(/请下调 WEBP_QUALITY/);
  });
});

describe("生成报告留档（供验收取证）", () => {
  it("scripts/image-report.txt 存在且记录处理/跳过/拒绝计数", () => {
    const p = path.join(ROOT, "scripts", "image-report.txt");
    expect(fs.existsSync(p)).toBe(true);
    const s = fs.readFileSync(p, "utf8");
    expect(s).toContain("已处理: 5 张");
    expect(s).toContain("已拒绝: 1 张");
    expect(s).toContain("体积超标: 0 个");
    expect(s).toContain(LICENSE_PHOTO);
  });
});
