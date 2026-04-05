import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import opentype from "opentype.js";
import config from "./load-config.js";

const episodes = JSON.parse(readFileSync("public/episodes.json", "utf8"));

// Resolve the OG font: prefer config.og_font if it exists locally, otherwise
// fetch the configured Google Font (config.font) on demand and cache it.
// Satori needs a static TTF/OTF — Node's default fetch (no browser UA) makes
// the Google Fonts CSS API return .ttf URLs instead of .woff2.
async function loadOgFont() {
  if (config.og_font && existsSync(config.og_font)) {
    return readFileSync(config.og_font);
  }
  const family = config.font || "Noto Sans";
  const slug = family.replace(/\s+/g, "") + "-Regular.ttf";
  const cached = `scripts/fonts/${slug}`;
  if (existsSync(cached)) return readFileSync(cached);

  const cssUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%20/g, "+")}:wght@400&display=swap`;
  console.log(`Fetching font "${family}" from Google Fonts...`);
  const cssResp = await fetch(cssUrl);
  if (!cssResp.ok) throw new Error(`Google Fonts CSS fetch failed: ${cssResp.status} for "${family}"`);
  const css = await cssResp.text();
  const m = css.match(/url\((https:\/\/[^)]+\.ttf)\)/);
  if (!m) throw new Error(`No TTF URL found in Google Fonts CSS for "${family}". Set og_font to a local .ttf path.`);
  const fontResp = await fetch(m[1]);
  if (!fontResp.ok) throw new Error(`Font download failed: ${fontResp.status}`);
  const buf = Buffer.from(await fontResp.arrayBuffer());
  mkdirSync("scripts/fonts", { recursive: true });
  writeFileSync(cached, buf);
  console.log(`Cached font to ${cached}`);
  return buf;
}

const fontRegular = await loadOgFont();
// Source cover: honor config.cover (stripped of leading slash, resolved
// under public/). Falls back to /cover.png when unset.
const coverRel = (config.cover || "/cover.png").replace(/^\//, "");
const coverPath = existsSync(`public/${coverRel}`)
  ? `public/${coverRel}`
  : "public/cover.png";
const coverData = readFileSync(coverPath);
const coverMime = coverData[0] === 0x89 && coverData[1] === 0x50 ? "image/png" : "image/jpeg";
const coverDataUrl = `data:${coverMime};base64,${coverData.toString("base64")}`;

// Read cover dimensions from file header
function readImageSize(buf) {
  // PNG: width/height at bytes 16-23
  if (buf[0] === 0x89 && buf[1] === 0x50) {
    return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
  }
  // JPEG: scan for SOF0/SOF2 marker
  let i = 2;
  while (i < buf.length - 8) {
    if (buf[i] === 0xFF && (buf[i + 1] === 0xC0 || buf[i + 1] === 0xC2)) {
      return { w: buf.readUInt16BE(i + 7), h: buf.readUInt16BE(i + 5) };
    }
    i += 2 + buf.readUInt16BE(i + 2);
  }
  return { w: 1400, h: 1400 }; // fallback
}

const coverSize = readImageSize(coverData);
const OG_WIDTH = coverSize.w;
const OG_HEIGHT = coverSize.h;

// Text area defaults
const textArea = config.og_text_area || {};
const TEXT_TOP = textArea.top ?? 0;
const TEXT_LEFT = textArea.left ?? 0;
const TEXT_WIDTH = textArea.width ?? OG_WIDTH;
const TEXT_HEIGHT = textArea.height ?? OG_HEIGHT;
const TEXT_ALIGN = textArea.align || "center";
const TEXT_VALIGN = textArea.valign || "middle";
const TEXT_COLOR = config.og_text_color || "#ffffff";
const DIR = config.direction || "ltr";

// Map align/valign to flexbox properties
const JUSTIFY_MAP = { left: "flex-start", center: "center", right: "flex-end" };
const ALIGN_MAP = { top: "flex-start", middle: "center", bottom: "flex-end" };

// For RTL, flip left↔right so "left" always means "start of text"
function resolveAlign(align, dir) {
  if (dir === "rtl") {
    if (align === "left") return "right";
    if (align === "right") return "left";
  }
  return align;
}

const resolvedAlign = resolveAlign(TEXT_ALIGN, DIR);
const LINE_HEIGHT = 1.15;

// Load the same TTF into opentype.js so we can measure real glyph advances
// instead of guessing with a constant. getAdvanceWidth returns units-per-em;
// multiply by (fontSize / unitsPerEm) to get pixels.
const otFont = opentype.parse(
  fontRegular.buffer.slice(fontRegular.byteOffset, fontRegular.byteOffset + fontRegular.byteLength)
);
function measureText(text, fontSize) {
  return otFont.getAdvanceWidth(text, fontSize);
}

const graphemeSegmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
function reverseGraphemes(text) {
  return [...graphemeSegmenter.segment(text)].map((s) => s.segment).reverse().join("");
}

// Satori does not implement the Unicode Bidirectional Algorithm — RTL text
// renders with glyphs in logical (memory) order, which reads backwards.
// Workaround: split a line into runs of "digits" (LTR numbers inside Hebrew)
// vs "other" (Hebrew letters), reverse the run order, and reverse chars only
// within non-digit runs. This keeps numbers like "2025" readable instead of
// flipping them to "5202" when the whole line is reversed.
function reverseRtlKeepNumbers(text) {
  // "LTR" = Latin letters, digits, and punctuation that belongs with them.
  // Runs of these stay in their original character order (so "2025" and
  // "GPT-4" render correctly inside an RTL line).
  const isLtrChar = (ch) => /[\w.,:/\-]/.test(ch);
  const runs = [];
  let cur = "";
  let curIsLtr = false;
  for (const seg of graphemeSegmenter.segment(text)) {
    const ch = seg.segment;
    const isLtr = isLtrChar(ch) && !/[\u0590-\u05FF\u0600-\u06FF]/.test(ch);
    if (cur === "") { cur = ch; curIsLtr = isLtr; continue; }
    if (isLtr === curIsLtr) { cur += ch; }
    else { runs.push({ text: cur, ltr: curIsLtr }); cur = ch; curIsLtr = isLtr; }
  }
  if (cur) runs.push({ text: cur, ltr: curIsLtr });
  return runs.reverse().map((r) => r.ltr ? r.text : reverseGraphemes(r.text)).join("");
}

// Word-wrap to fit within maxWidth using real glyph advances. Returns an
// array of visual lines (already RTL-reordered when direction is rtl).
function wrapTextToWidth(text, fontSize, maxWidth) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let cur = "";
  for (const w of words) {
    const candidate = cur ? `${cur} ${w}` : w;
    if (cur && measureText(candidate, fontSize) > maxWidth) {
      lines.push(cur);
      cur = w;
    } else {
      cur = candidate;
    }
  }
  if (cur) lines.push(cur);
  return DIR === "rtl" ? lines.map(reverseRtlKeepNumbers) : lines;
}

// Binary-search the largest font size such that after word-wrapping the title
// fits inside width × height. Each candidate is validated against the real
// per-glyph advances from the loaded TTF, so it is font-accurate.
function autoFitText(text, width, height) {
  const MIN = 16, MAX = 240;
  let lo = MIN, hi = MAX, best = MIN, bestLines = [text];
  const fits = (size) => {
    const lines = wrapTextToWidth(text, size, width);
    const maxLineW = Math.max(...lines.map((l) => measureText(l, size)));
    const totalH = lines.length * size * LINE_HEIGHT;
    return { ok: maxLineW <= width && totalH <= height, lines };
  };
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const r = fits(mid);
    if (r.ok) { best = mid; bestLines = r.lines; lo = mid + 1; }
    else { hi = mid - 1; }
  }
  return { fontSize: best, lines: bestLines };
}

function buildMarkup(title) {
  const children = [
    // Cover as full background
    {
      type: "img",
      props: {
        src: coverDataUrl,
        width: OG_WIDTH,
        height: OG_HEIGHT,
        style: {
          position: "absolute",
          top: 0,
          left: 0,
          objectFit: "cover",
        },
      },
    },
  ];

  // Episode title overlay
  if (title) {
    const { fontSize, lines } = autoFitText(title, TEXT_WIDTH, TEXT_HEIGHT);
    const displayTitle = lines.join("\n");
    children.push({
      type: "div",
      props: {
        style: {
          position: "absolute",
          top: TEXT_TOP,
          left: TEXT_LEFT,
          width: TEXT_WIDTH,
          height: TEXT_HEIGHT,
          display: "flex",
          flexDirection: "column",
          alignItems: JUSTIFY_MAP[resolvedAlign] || "center",
          justifyContent: ALIGN_MAP[TEXT_VALIGN] || "center",
          textAlign: resolvedAlign,
          color: TEXT_COLOR,
          fontSize,
          lineHeight: LINE_HEIGHT,
          whiteSpace: "pre-wrap",
          direction: DIR,
          textShadow: "0 2px 12px rgba(0,0,0,0.8)",
        },
        children: displayTitle,
      },
    });
  }

  return {
    type: "div",
    props: {
      style: {
        display: "flex",
        width: "100%",
        height: "100%",
        position: "relative",
      },
      children,
    },
  };
}

async function renderPng(markup, width, height) {
  const svg = await satori(markup, {
    width: width || OG_WIDTH,
    height: height || OG_HEIGHT,
    fonts: [
      {
        name: config.font || "NotoSans",
        data: fontRegular,
        weight: 400,
        style: "normal",
      },
    ],
  });
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: width || OG_WIDTH },
  });
  return resvg.render().asPng();
}

async function main() {
  // Per-episode OG images → episodes/sXeY.png (skip if already present)
  for (const ep of episodes) {
    const filename = `s${ep.season}e${ep.id}.png`;
    const outPath = `episodes/${filename}`;
    if (existsSync(outPath)) {
      console.log(`Skipped ${outPath} (exists)`);
      continue;
    }
    const png = await renderPng(buildMarkup(ep.title));
    writeFileSync(outPath, png);
    console.log(`Generated ${outPath}`);
  }

  // Homepage OG uses config.cover directly — no separate file needed

  // Icons — generated from config.cover, only if missing on disk so user
  // overrides are preserved. innerRatio controls the safe-zone: "maskable"
  // variants keep the cover inside 60% of the canvas so Android's adaptive
  // mask can crop freely; normal icons use 85%.
  const iconMarkup = (size, innerRatio = 0.85) => ({
    type: "div",
    props: {
      style: {
        display: "flex",
        width: "100%",
        height: "100%",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: config.bg_dark || "#0a0a0b",
      },
      children: [
        {
          type: "img",
          props: {
            src: coverDataUrl,
            width: Math.round(size * innerRatio),
            height: Math.round(size * innerRatio),
            style: innerRatio >= 0.8
              ? { borderRadius: `${Math.round(size * 0.15)}px` }
              : {},
          },
        },
      ],
    },
  });

  // Icon set actually referenced by index.html + manifest.json.
  // favicon.ico holds the 16/32/48 multi-res browser-tab icons, so separate
  // PNG variants at those sizes are redundant.
  const icons = [
    // Apple — iOS home screen (referenced via <link rel="apple-touch-icon">)
    { name: "public/apple-touch-icon.png", size: 180 },
    // PWA / Android (referenced via manifest.json)
    { name: "public/icon-192.png", size: 192 },
    { name: "public/icon-512.png", size: 512 },
    // Maskable adaptive Android icons (logo inside 60% safe zone)
    { name: "public/icon-maskable-192.png", size: 192, innerRatio: 0.6 },
    { name: "public/icon-maskable-512.png", size: 512, innerRatio: 0.6 },
  ];
  for (const { name, size, innerRatio } of icons) {
    if (existsSync(name)) {
      console.log(`Skipped ${name} (exists)`);
      continue;
    }
    const png = await renderPng(iconMarkup(size, innerRatio), size, size);
    writeFileSync(name, png);
    console.log(`Generated ${name}`);
  }

  // favicon.ico — multi-resolution (16, 32, 48) PNG-embedded ICO
  if (!existsSync("public/favicon.ico")) {
    const sizes = [16, 32, 48];
    const pngs = [];
    for (const s of sizes) pngs.push(await renderPng(iconMarkup(s), s, s));
    const header = Buffer.alloc(6);
    header.writeUInt16LE(0, 0);       // reserved
    header.writeUInt16LE(1, 2);       // type: icon
    header.writeUInt16LE(sizes.length, 4);
    const entries = Buffer.alloc(16 * sizes.length);
    const dataOffset = 6 + 16 * sizes.length;
    let offset = dataOffset;
    for (let i = 0; i < sizes.length; i++) {
      const s = sizes[i];
      const len = pngs[i].length;
      const e = i * 16;
      entries.writeUInt8(s === 256 ? 0 : s, e);      // width
      entries.writeUInt8(s === 256 ? 0 : s, e + 1);  // height
      entries.writeUInt8(0, e + 2);                  // palette
      entries.writeUInt8(0, e + 3);                  // reserved
      entries.writeUInt16LE(1, e + 4);               // color planes
      entries.writeUInt16LE(32, e + 6);              // bpp
      entries.writeUInt32LE(len, e + 8);             // image size
      entries.writeUInt32LE(offset, e + 12);         // image offset
      offset += len;
    }
    writeFileSync("public/favicon.ico", Buffer.concat([header, entries, ...pngs]));
    console.log("Generated public/favicon.ico");
  } else {
    console.log("Skipped public/favicon.ico (exists)");
  }

  // manifest.json — always regenerate (config may change)
  const bgColor = (config.default_theme || "dark") === "light"
    ? (config.bg_light || "#fafaf9")
    : (config.bg_dark || "#0a0a0b");
  writeFileSync(
    "public/manifest.json",
    JSON.stringify({
      name: config.title,
      short_name: config.title,
      description: config.description,
      start_url: "/",
      display: "standalone",
      theme_color: bgColor,
      background_color: bgColor,
      dir: config.direction,
      lang: config.language,
      icons: [
        { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
        { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
        { src: "/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
        { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      ],
    }, null, 2) + "\n"
  );
  console.log("Generated public/manifest.json");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
