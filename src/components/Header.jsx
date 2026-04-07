import { useRef, useEffect } from "react";
import { ApplePodcastsLogo, SpotifyLogo, YoutubeLogo, AmazonLogo, RssSimple, Sun, Moon } from "@phosphor-icons/react";
import SearchBar from "./SearchBar";
import { trackSeasonSwitch, trackExternalClick, trackThemeToggle, trackSubscribe } from "../utils/analytics";
import config from "../utils/config";
import {
  APPLE_SHOW,
  SPOTIFY_SHOW,
  YOUTUBE_PLAYLIST,
  AMAZON_SHOW,
} from "../utils/platforms";

const L = config.labels;

const HEADER_PLATFORMS = [
  { url: SPOTIFY_SHOW, Icon: SpotifyLogo, label: L.spotify, hoverColor: "#1DB954" },
  { url: APPLE_SHOW, Icon: ApplePodcastsLogo, label: L.apple, hoverColor: "#9b59b6" },
  { url: YOUTUBE_PLAYLIST, Icon: YoutubeLogo, label: L.youtube, hoverColor: "#FF0000" },
  { url: AMAZON_SHOW, Icon: AmazonLogo, label: L.amazon, hoverColor: "#00A8E1" },
];

export default function Header({
  seasons,
  season,
  setSeason,
  query,
  setQuery,
  episodes,
  theme,
  toggleTheme,
  onGoHome,
  canGoHome,
  isHome,
  onSearchFocus,
  onSearchBlur,
  staticPage,
}) {
  const searchRef = useRef(null);

  // Cmd/Ctrl+F keyboard shortcut to focus search
  useEffect(() => {
    const handler = (e) => {
      const shortcut = config.labels?.search_shortcut;
      if ((e.metaKey || e.ctrlKey) && (e.key === "f" || (shortcut && e.key === shortcut))) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleSeasonChange = (s) => {
    if (query) setQuery("");
    setSeason(s);
    trackSeasonSwitch(s);
  };

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        background: "var(--surface)",
        borderBottom: "1px solid var(--border)",
        padding: "12px 10px 0",
      }}
    >
      <div style={{ maxWidth: 880, margin: "0 auto" }}>
        {/* Platforms + theme row */}
        <div className="header-platforms"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <button
            onClick={() => { toggleTheme(); trackThemeToggle(theme === "dark" ? "light" : "dark"); }}
            title={theme === "dark" ? L.light_mode : L.dark_mode}
            aria-label={theme === "dark" ? L.light_mode : L.dark_mode}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 4,
              lineHeight: 1,
              color: "var(--text-dim)",
              display: "flex",
              transition: "color 0.15s",
              marginInlineEnd: "auto",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#f0c040"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-dim)"; }}
          >
            {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          {HEADER_PLATFORMS.filter((p) => p.url).map((p) => (
            <a
              key={p.label}
              href={p.url}
              target="_blank"
              rel="noopener"
              title={p.label}
              aria-label={p.label}
              onClick={() => trackSubscribe(p.label, "header")}
              style={{ textDecoration: "none", color: "var(--text-dim)", display: "flex", alignItems: "center", gap: 4, transition: "color 0.15s" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = p.hoverColor; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-dim)"; }}
            >
              <p.Icon size={20} weight="fill" />
              <span className="platform-label" style={{ fontSize: 12, fontWeight: 500 }}>{p.label}</span>
            </a>
          ))}
          <a
            href="/rss.xml"
            target="_blank"
            rel="noopener"
            title="RSS"
            aria-label="RSS"
            onClick={() => trackExternalClick("rss", "header")}
            style={{ textDecoration: "none", color: "var(--text-dim)", display: "flex", alignItems: "center", gap: 4, transition: "color 0.15s" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "var(--accent)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-dim)"; }}
          >
            <RssSimple size={20} weight="fill" />
            <span className="platform-label" style={{ fontSize: 12, fontWeight: 500 }}>{L.rss}</span>
          </a>
        </div>

        {/* Title row — logo + title/description */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 12,
          }}
        >
          <img
            src={`/icon-192.${config.cover_ext || "png"}`}
            alt={config.title}
            width={44}
            height={44}
            onClick={canGoHome ? onGoHome : undefined}
            style={{ borderRadius: 10, flexShrink: 0, cursor: canGoHome ? "pointer" : "default" }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontWeight: 700,
                fontSize: 22,
                lineHeight: 1.2,
                color: "var(--text)",
              }}
            >
              {config.title}
            </div>
            <div
              style={{
                fontSize: 13,
                color: "var(--text-dim)",
                marginTop: 0,
              }}
            >
              {config.description}
            </div>
          </div>
        </div>

        {/* Row 2 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            margin: "0 -3px",
            padding: "0 3px 10px",
          }}
        >
          <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
            {seasons.map((s) => (
              <button
                key={s}
                onClick={() => handleSeasonChange(s)}
                style={{
                  padding: "9px 14px",
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: "pointer",
                  border:
                    s === season && !query && !staticPage
                      ? "1.5px solid var(--accent)"
                      : "1.5px solid var(--border)",
                  background:
                    s === season && !query && !staticPage ? "var(--accent-bg)" : "var(--card)",
                  color: s === season && !query && !staticPage ? "var(--accent)" : "var(--text-dim)",
                  transition: "all 0.15s",
                }}
              >
                {seasons.length <= 2 || s === seasons[0] ? `${L.season} ${s}` : s}
              </button>
            ))}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <SearchBar query={query} setQuery={setQuery} searchRef={searchRef} onFocus={onSearchFocus} onBlur={onSearchBlur} />
          </div>
        </div>

      </div>
    </header>
  );
}
