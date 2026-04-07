import config from "../utils/config.js";

// Process {{#if KEY}}...{{/if}} conditionals in text against config
function processConditionals(text) {
  return (text || "")
    .replace(/\{\{#if (\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (_, key, content) =>
      config[key] ? content : ""
    )
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export default function StaticPage({ title, text }) {
  const processed = processConditionals(text);
  const paragraphs = processed
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <article
      style={{
        maxWidth: 640,
        margin: 0,
        padding: "8px 8px 0",
        color: "var(--text)",
      }}
    >
      <h1
        style={{
          fontSize: 28,
          fontWeight: 600,
          marginBottom: 12,
          color: "var(--text)",
          animation: "fadeIn 0.3s ease both",
        }}
      >
        {title}
      </h1>
      {paragraphs.map((p, i) => (
        <p
          key={i}
          style={{
            fontSize: 15,
            lineHeight: 1.7,
            marginBottom: 16,
            color: "var(--text-dim)",
            animation: `fadeIn 0.3s ease both`,
            animationDelay: `${(i + 1) * 0.03}s`,
          }}
        >
          {p}
        </p>
      ))}
    </article>
  );
}
