import { useState, useEffect } from "react";
import config from "../utils/config";
import { getCookie, setCookie } from "../utils/cookies";
import { loadAnalytics, trackPageView } from "../utils/analytics";

export default function CookieConsent({ playing }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!config.labels?.cookie_consent) return;
    const choice = getCookie("cookie_consent");
    if (choice !== "accepted" && choice !== "declined") {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  const accept = () => {
    setCookie("cookie_consent", "accepted");
    loadAnalytics();
    trackPageView(window.location.href, document.title);
    setVisible(false);
  };

  const decline = () => {
    setCookie("cookie_consent", "declined");
    setVisible(false);
  };

  return (
    <div
      role="dialog"
      aria-label={config.labels.cookie_consent}
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: playing ? 140 : 0,
        background: "var(--surface)",
        borderTop: "1px solid var(--border)",
        padding: "16px 20px",
        zIndex: 60,
        boxShadow: "0 -4px 12px rgba(0,0,0,0.08)",
      }}
    >
      <div
        style={{
          maxWidth: 880,
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: 14,
            color: "var(--text-dim)",
            flex: "1 1 280px",
          }}
        >
          {config.labels.cookie_consent}
        </p>
        <div style={{ display: "flex", gap: 8, flex: "0 0 auto" }}>
          <button
            onClick={decline}
            style={{
              padding: "8px 16px",
              fontSize: 14,
              fontFamily: "inherit",
              background: "transparent",
              color: "var(--text-dim)",
              border: "1px solid var(--border)",
              borderRadius: 6,
              cursor: "pointer",
              transition: "color 0.15s, border-color 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--text)";
              e.currentTarget.style.borderColor = "var(--text-faint)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--text-dim)";
              e.currentTarget.style.borderColor = "var(--border)";
            }}
          >
            {config.labels.cookie_decline || "Decline"}
          </button>
          <button
            onClick={accept}
            style={{
              padding: "8px 16px",
              fontSize: 14,
              fontFamily: "inherit",
              fontWeight: 500,
              background: "var(--accent-button)",
              color: "#fff",
              border: "1px solid var(--accent-button)",
              borderRadius: 6,
              cursor: "pointer",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--accent)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "var(--accent-button)";
            }}
          >
            {config.labels.cookie_accept || "Accept"}
          </button>
        </div>
      </div>
    </div>
  );
}
