import { readFileSync, writeFileSync } from "fs";
import config from "./load-config.js";

const episodes = JSON.parse(readFileSync("public/episodes.json", "utf8"));

// Absolute URLs are filled in by the middleware at serve time.
const SITE = "{{SITE_URL}}";

const L = config.labels || {};
const lines = [];

lines.push(`# ${config.title}`);
lines.push("");
if (config.description) {
  lines.push(`> ${config.description}`);
  lines.push("");
}

// Show metadata
lines.push("## About");
if (config.author) lines.push(`- Author: ${config.author}`);
if (config.language) lines.push(`- Language: ${config.language}`);
if (config.copyright) lines.push(`- Copyright: ${config.copyright}`);
lines.push(`- Site: ${SITE}`);
lines.push("");

// Machine-readable endpoints
lines.push("## Data");
lines.push(`- [Episodes JSON](${SITE}/episodes.json): full episode list with metadata`);
lines.push(`- [RSS Feed](${SITE}/rss.xml): podcast feed`);
lines.push(`- [Sitemap](${SITE}/sitemap.xml): all pages`);
lines.push("");

// Listening platforms
const platforms = [
  ["Spotify", config.spotify_url],
  ["Apple Podcasts", config.apple_podcasts_url],
  ["YouTube", config.youtube_url],
  ["Amazon Music", config.amazon_music_url],
].filter(([, url]) => url);
if (platforms.length) {
  lines.push("## Listen");
  for (const [name, url] of platforms) lines.push(`- [${name}](${url})`);
  lines.push("");
}

// Legal pages — only when configured
const legal = [
  [L.terms, L.terms_text, "/terms"],
  [L.privacy, L.privacy_text, "/privacy"],
].filter(([title, text]) => title && text);
if (legal.length) {
  lines.push("## Legal");
  for (const [title, , path] of legal) {
    lines.push(`- [${title}](${SITE}${path})`);
  }
  lines.push("");
}

// Episodes — newest first, one line each
lines.push("## Episodes");
const sorted = [...episodes].sort((a, b) => b.id - a.id);
for (const ep of sorted) {
  const parts = [];
  if (ep.date) parts.push(ep.date);
  parts.push(`S${ep.season}E${ep.id}`);
  if (ep.duration) parts.push(ep.duration);
  const meta = parts.join(" · ");
  lines.push(`- [${ep.title}](${SITE}/${ep.id}) — ${meta}`);
}
lines.push("");

writeFileSync("public/llms.txt", lines.join("\n"));
console.log(`Generated public/llms.txt (${sorted.length} episodes)`);
