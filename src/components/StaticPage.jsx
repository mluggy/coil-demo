export default function StaticPage({ title, text }) {
  const paragraphs = (text || "")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <article
      style={{
        maxWidth: 720,
        margin: "40px auto",
        padding: "0 16px",
        color: "var(--text)",
      }}
    >
      <h1
        style={{
          fontSize: 28,
          fontWeight: 600,
          marginBottom: 24,
          color: "var(--text)",
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
          }}
        >
          {p}
        </p>
      ))}
    </article>
  );
}
