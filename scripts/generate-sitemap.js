import { readFileSync, writeFileSync } from "fs";

const episodes = JSON.parse(readFileSync("public/episodes.json", "utf8"));

// Absolute URLs are filled in by the middleware at serve time, so the same
// sitemap.xml / robots.txt works on any hostname.
const SITE = "{{SITE_URL}}";

const urls = [
  { loc: `${SITE}/`, lastmod: episodes[episodes.length - 1]?.date || "", priority: "1.0" },
  ...episodes.map((ep) => ({
    loc: `${SITE}/${ep.id}`,
    lastmod: ep.date || "",
    priority: "0.8",
  })),
];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${u.loc}</loc>${u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : ""}
    <priority>${u.priority}</priority>
  </url>`
  )
  .join("\n")}
</urlset>`;

writeFileSync("public/sitemap.xml", xml);
console.log(`Generated sitemap.xml with ${urls.length} URLs`);

// Generate robots.txt with dynamic sitemap URL
const robots = `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`;
writeFileSync("public/robots.txt", robots);
console.log("Generated robots.txt");
