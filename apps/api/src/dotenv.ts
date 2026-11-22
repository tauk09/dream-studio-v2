import fs from "node:fs";
import path from "node:path";

export function loadLocalDotEnv(cwd = process.cwd()): void {
  const candidates = [path.join(cwd, ".env"), path.join(cwd, "apps/api/.env")];
  for (const filePath of candidates) {
    if (!fs.existsSync(filePath)) continue;
    const raw = fs.readFileSync(filePath, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (key && process.env[key] === undefined && val.length > 0) {
        process.env[key] = val;
      }
    }
    break;
  }
}
