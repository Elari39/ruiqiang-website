import path from "node:path";

/** Checked before opening sources or encoding any output. */
export function assertPublishable(entries, blocked) {
  for (const entry of entries) {
    const match = blocked.find(rule => path.basename(entry.src) === rule.file);
    if (match) throw new Error(`[拒绝] ${match.file} 出现在发布白名单中：${match.reason}`);
  }
}
