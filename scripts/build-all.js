import { execSync } from "child_process";

const steps = [
  { label: "yaml-to-json", cmd: "node scripts/yaml-to-json.js" },
  { label: "generate-og", cmd: "node scripts/generate-og.js" },
  { label: "generate-feed", cmd: "python scripts/generate_feed.py episodes/" },
  { label: "generate-sitemap", cmd: "node scripts/generate-sitemap.js" },
  { label: "generate-llms", cmd: "node scripts/generate-llms.js" },
  { label: "vite build", cmd: "npx vite build" },
  { label: "generate-html-template", cmd: "node scripts/generate-html-template.js" },
];

for (let i = 0; i < steps.length; i++) {
  const { label, cmd } = steps[i];
  console.log(`\nStep ${i + 1}/${steps.length}: ${label}`);
  execSync(cmd, { stdio: "inherit" });
}

console.log("\nBuild complete!");
