// Copies each archived version's runtime files into public/v/<id>,
// excluding source-only artifacts (.scss, .map) and OS cruft.
import { cp, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const EXCLUDE = /(\.scss$|\.map$|\.DS_Store$)/;

const versions = ["2024"]; // archived (non-latest) static versions

for (const id of versions) {
  const src = join(root, "versions", id);
  const dest = join(root, "public", "v", id);
  if (!existsSync(src)) {
    console.error(`[sync-versions] missing source: ${src}`);
    process.exit(1);
  }
  await rm(dest, { recursive: true, force: true });
  await cp(src, dest, {
    recursive: true,
    filter: (p) => !EXCLUDE.test(p),
  });
  console.log(`[sync-versions] ${id} -> public/v/${id}`);
}
