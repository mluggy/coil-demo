// Stages episode media (mp3/srt/txt/png) from episodes/ into dist/ so
// `wrangler pages dev dist` can serve them as Pages static assets.
//
// In production these files are served from R2, but `wrangler pages dev`
// starts with an empty local R2 simulation, and the middleware falls
// through to `next()` when R2 misses — which otherwise returns the SPA
// index.html with a 200 status (broken MP3 playback, HTML in transcripts).
// Staging into dist/ makes that fallthrough resolve to real files.
import { readdirSync, copyFileSync, existsSync, statSync } from "fs";
import { join } from "path";

const SRC = "episodes";
const DST = "dist";
const EXT = /\.(mp3|srt|txt|png)$/i;

if (!existsSync(DST)) {
  console.error(`${DST}/ not found — run \`npm run build\` first.`);
  process.exit(1);
}

let copied = 0;
for (const entry of readdirSync(SRC)) {
  if (!EXT.test(entry)) continue;
  const from = join(SRC, entry);
  if (!statSync(from).isFile()) continue;
  const to = join(DST, entry);
  if (existsSync(to) && statSync(to).mtimeMs >= statSync(from).mtimeMs) continue;
  copyFileSync(from, to);
  copied++;
}
console.log(`[stage-preview] copied ${copied} file(s) into ${DST}/`);
