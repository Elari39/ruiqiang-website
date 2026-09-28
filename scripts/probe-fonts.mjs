// Probe: does next/font accept Noto Sans SC 900, and how many font bytes does
// a real page actually pull at runtime? Prints a machine-readable summary.
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const OUT = path.join(ROOT, "tests", "probe-out");
fs.mkdirSync(OUT, { recursive: true });

const NODE = process.execPath;
const NEXT = path.join(ROOT, "node_modules", "next", "dist", "bin", "next");

function run(cmd, args, opts = {}) {
  return new Promise((resolve) => {
    const p = spawn(cmd, args, { cwd: ROOT, shell: false, ...opts });
    let out = "",
      err = "";
    p.stdout.on("data", (c) => (out += c));
    p.stderr.on("data", (c) => (err += c));
    p.on("close", (code) => resolve({ code, out, err }));
  });
}

(async () => {
  console.log("== build with font weights 400,500,900 ==");
  const b = await run(NODE, [NEXT, "build"]);
  fs.writeFileSync(path.join(OUT, "font-build.log"), b.out + "\n---STDERR---\n" + b.err, "utf8");
  console.log("build exit:", b.code);
  const fontErr = /Noto Sans SC|font|Failed to fetch/i.test(b.err) ? b.err.slice(0, 2000) : "(no font-related stderr)";
  console.log("font-related stderr:", fontErr);

  // Which font files did the build download into .next?
  const fontDir = path.join(ROOT, ".next", "static", "media");
  let files = [];
  if (fs.existsSync(fontDir)) {
    files = fs
      .readdirSync(fontDir)
      .filter((f) => /\.(woff2?|ttf)$/i.test(f))
      .map((f) => ({ name: f, bytes: fs.statSync(path.join(fontDir, f)).size }));
  }
  const total = files.reduce((a, f) => a + f.bytes, 0);
  console.log(`font files emitted: ${files.length}, total ${(total / 1024).toFixed(1)} KB`);
  files
    .sort((a, b) => b.bytes - a.bytes)
    .slice(0, 12)
    .forEach((f) => console.log(`   ${(f.bytes / 1024).toFixed(1)} KB  ${f.name}`));

  // Which font-file references does the prerendered HTML actually contain?
  const html = path.join(ROOT, ".next", "server", "app", "index.html");
  let refs = 0;
  if (fs.existsSync(html)) {
    const h = fs.readFileSync(html, "utf8");
    refs = (h.match(/\/_next\/static\/media\/[^"]+\.(woff2?|ttf)/g) || []).length;
    const notoRefs = (h.match(/\/_next\/static\/media\/[^"]+\.(woff2?|ttf)/g) || []).filter(() => true).length;
    console.log(`font refs in prerendered HTML: ${refs}`);
    console.log("has preload for fonts:", /rel="preload"[^>]*as="font"/.test(h));
  } else {
    console.log("no prerendered index.html found");
  }

  fs.writeFileSync(
    path.join(OUT, "font-probe.json"),
    JSON.stringify({ buildExit: b.code, fontFiles: files, totalBytes: total, htmlFontRefs: refs }, null, 2),
    "utf8"
  );
  console.log("probe written to tests/probe-out/font-probe.json");
})();
