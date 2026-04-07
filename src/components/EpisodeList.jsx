import { useState } from "react";
import { Play, Pause, LinkSimple } from "@phosphor-icons/react";
import config from "../utils/config";
import { trackShare } from "../utils/analytics";
import { highlightText } from "../utils/highlight";
import { SHARE_PLATFORMS } from "../utils/share";

const L = config.labels;

function ShareIcons({ ep, visible }) {
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}/${ep.id}`;
  const text = `${ep.title} - ${config.title}`;

  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(url);
    trackShare("copy", ep.id, "list");
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <span className="episode-share" style={{ display: "contents" }}>
      <span style={{ margin: "0 6px", opacity: visible ? 1 : 0 }}>&middot;</span>
      <span style={{ display: "flex", alignItems: "center", gap: 5, opacity: visible ? 1 : 0, pointerEvents: visible ? "auto" : "none", transition: "opacity 0.15s" }}>
        <span style={{ display: "flex", alignItems: "center" }}>{L.share}</span>
        {(config.share || []).map((channel) => {
          const p = SHARE_PLATFORMS[channel];
          if (!p || !p.getUrl) return null;
          return (
            <a
              key={channel}
              href={p.getUrl({ url, text })}
              target="_blank"
              rel="noopener"
              title={p.title}
              aria-label={p.title}
              onClick={(e) => { e.stopPropagation(); trackShare(channel, ep.id, "list"); }}
              style={{ color: "var(--text-faint)", display: "flex", alignItems: "center", transition: "color 0.15s" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = p.hoverColor; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-faint)"; }}
            >
              <p.Icon size={14} />
            </a>
          );
        })}
        {(config.share || []).includes("copy") && (
        <span
          onClick={(e) => { e.stopPropagation(); handleCopy(e); }}
          role="button"
          tabIndex={0}
          title={L.copy_link}
          aria-label={L.copy_link}
          style={{ color: copied ? "var(--green)" : "var(--text-faint)", display: "flex", alignItems: "center", cursor: "pointer", transition: "color 0.15s" }}
          onMouseEnter={(e) => { if (!copied) e.currentTarget.style.color = "var(--accent)"; }}
          onMouseLeave={(e) => { if (!copied) e.currentTarget.style.color = "var(--text-faint)"; }}
        >
          <LinkSimple size={14} />
        </span>
        )}
      </span>
    </span>
  );
}

export default function EpisodeList({
  displayList: display,
  playing,
  isPlaying,
  onPlay,
  onSelect,
  newestEpisodeId,
  query,
  snippets,
}) {
  if (display.length === 0) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "60px 20px",
          color: "var(--text-dim)",
          fontSize: 18,
        }}
      >
        {L.no_results}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {display.map((ep, i) => (
        <EpisodeRow
          key={ep.id}
          ep={ep}
          i={i}
          playing={playing}
          isPlaying={isPlaying}
          onPlay={onPlay}
          onSelect={onSelect}
          newestEpisodeId={newestEpisodeId}
          query={query}
          snippet={snippets?.[ep.id]}
        />
      ))}
    </div>
  );
}

function EpisodeRow({ ep, i, playing, isPlaying, onPlay, onSelect, newestEpisodeId, query, snippet }) {
  const [hovered, setHovered] = useState(false);
  const active = playing?.id === ep.id;
  const activeAndPlaying = active && isPlaying;
  const dateFmt = ep.date
    ? new Date(ep.date).toLocaleDateString(config.browserLocale, {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <div
      data-episode-id={ep.id}
      onClick={() => onSelect(ep)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 3px 8px 7px",
        margin: "0 -3px",
        borderRadius: 12,
        cursor: "pointer",
        background: active ? "var(--accent-bg)" : "transparent",
        transition: "background 0.15s",
        animation: `fadeIn 0.3s ease both`,
        animationDelay: `${i * 0.03}s`,
      }}
      onPointerEnter={(e) => {
        if (e.pointerType !== "touch") setHovered(true);
        if (!active) e.currentTarget.style.background = "var(--card-hover)";
      }}
      onPointerLeave={(e) => {
        setHovered(false);
        if (!active) e.currentTarget.style.background = "transparent";
      }}
    >
            {/* Play button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPlay(ep);
              }}
              title={activeAndPlaying ? L.pause : L.play}
              aria-label={`${activeAndPlaying ? L.pause : L.play} - ${ep.title}`}
              style={{
                width: 42,
                height: 40,
                borderRadius: "50%",
                border: active
                  ? "2px solid var(--accent)"
                  : "2px solid var(--border)",
                background: "transparent",
                color: active ? "var(--accent)" : "var(--text-dim)",
                fontSize: 16,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                marginInlineStart: 2,
                transition: "all 0.15s",
              }}
            >
              {activeAndPlaying ? <Pause size={16} weight="fill" /> : <Play size={16} weight="fill" />}
            </button>

            {/* Episode info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0,
                  marginBottom: 3,
                  fontSize: 12,
                  color: "var(--text-faint)",
                  fontWeight: 500,
                }}
              >
                {query && <><span>{L.season} {ep.season}</span><span style={{ margin: "0 6px" }}>&middot;</span></>}
                <span style={{ fontVariantNumeric: "tabular-nums" }}>{L.episode} {ep.id}</span>
                {dateFmt && <><span style={{ margin: "0 6px" }}>&middot;</span><span>{dateFmt}</span></>}
                {ep.duration && <><span style={{ margin: "0 6px" }}>&middot;</span><span>{ep.duration}</span></>}
                <ShareIcons ep={ep} visible={hovered} />
              </div>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: active ? "var(--accent)" : "var(--text)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  lineHeight: 1.3,
                }}
              >
                {ep.title}
                {ep.id === newestEpisodeId && (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: "#fff",
                      background: "var(--green-badge)",
                      padding: "1px 7px",
                      borderRadius: 6,
                      marginInlineStart: 6,
                      verticalAlign: "middle",
                      position: "relative",
                      top: -1,
                    }}
                  >
                    {L.new}
                  </span>
                )}
              </div>
              {(snippet || ep.desc) && (
                <div
                  style={{
                    fontSize: 13,
                    color: "var(--text-dim)",
                    marginTop: 3,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {query ? highlightText(snippet || ep.desc, query) : ep.desc}
                </div>
              )}
            </div>
          </div>
        );
}
