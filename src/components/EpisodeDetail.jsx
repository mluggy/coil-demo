import { useEffect, useMemo, useState, useRef } from "react";
import { ApplePodcastsLogo, SpotifyLogo, YoutubeLogo, AmazonLogo, DownloadSimple, X, Pause, Play } from "@phosphor-icons/react";
import config from "../utils/config";
import {
  APPLE_SHOW, SPOTIFY_SHOW, YOUTUBE_PLAYLIST, AMAZON_SHOW,
} from "../utils/platforms";
import { trackSubscribe, trackShare, trackDownload } from "../utils/analytics";
import useSrt from "../hooks/useSrt";
import { cuesToParagraphs } from "../utils/srt";
import { highlightText } from "../utils/highlight";
import { SHARE_PLATFORMS } from "../utils/share";

const L = config.labels;

const PLATFORMS = [
  { key: "spotify", label: L.spotify, Icon: SpotifyLogo, hoverColor: "#1DB954" },
  { key: "apple", label: L.apple, Icon: ApplePodcastsLogo, hoverColor: "#9b59b6" },
  { key: "youtube", label: L.youtube, Icon: YoutubeLogo, hoverColor: "#FF0000" },
  { key: "amazon", label: L.amazon, Icon: AmazonLogo, hoverColor: "#00A8E1" },
];

const SHOW_URLS = { apple: APPLE_SHOW, spotify: SPOTIFY_SHOW, youtube: YOUTUBE_PLAYLIST, amazon: AMAZON_SHOW };
const EP_URL_KEYS = { apple: "appleUrl", spotify: "spotifyUrl", youtube: "youtubeUrl", amazon: "amazonUrl" };

function getPlatformUrl(key, episode) {
  return episode[EP_URL_KEYS[key]] || SHOW_URLS[key] || "";
}

function hasPlatformUrl(key, episode) {
  return !!(episode[EP_URL_KEYS[key]] || SHOW_URLS[key]);
}

export default function EpisodeDetail({
  episode,
  playing,
  isPlaying,
  onPlay,
  onClose,
  query,
}) {
  const active = playing?.id === episode.id;
  const activeAndPlaying = active && isPlaying;
  const cues = useSrt(episode);
  const [fullText, setFullText] = useState("");
  const panelRef = useRef(null);
  const [copied, setCopied] = useState(false);

  // Prefer the curated .txt file; fall back to SRT cues grouped into
  // paragraphs; finally fall back to the episode description.
  const paragraphs = useMemo(() => {
    if (fullText) {
      return fullText.split(/\n\s*\n+|\n/).map((s) => s.trim()).filter(Boolean);
    }
    if (cues.length > 0) return cuesToParagraphs(cues);
    if (episode.desc) {
      return episode.desc.split(/\n\s*\n+|\n/).map((s) => s.trim()).filter(Boolean);
    }
    return [];
  }, [fullText, cues, episode.desc]);

  useEffect(() => {
    if (!episode?.audioFile) return;
    const txtFile = episode.audioFile.replace(".mp3", ".txt");
    let cancelled = false;
    fetch(`/${txtFile}`)
      .then((r) => {
        if (!r.ok) throw new Error("TXT fetch failed");
        // Guard against SPA fallback / HTML responses served with 200.
        const ct = r.headers.get("content-type") || "";
        if (!ct.includes("text/plain")) throw new Error("Not text/plain");
        return r.text();
      })
      .then((text) => {
        if (!cancelled) setFullText(text.trim());
      })
      .catch(() => {
        if (!cancelled) setFullText("");
      });
    return () => { cancelled = true; };
  }, [episode?.id, episode?.audioFile]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    const previouslyFocused = document.activeElement;
    const dialog = panelRef.current?.closest('[role="dialog"]');
    if (!dialog) return;

    const getFocusable = () =>
      dialog.querySelectorAll(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
      );

    const onKeyDown = (e) => {
      if (e.key !== "Tab") return;
      const focusable = getFocusable();
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    dialog.addEventListener("keydown", onKeyDown);
    const focusable = getFocusable();
    if (focusable.length > 0) focusable[0].focus();

    return () => {
      dialog.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus();
    };
  }, []);

  useEffect(() => {
    const scrollY = window.scrollY;
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    return () => {
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      window.scrollTo(0, scrollY);
    };
  }, []);

  const handleShare = (channel) => {
    trackShare(channel, episode.id, "detail");
    const url = `${window.location.origin}/${episode.id}`;
    const text = `${episode.title} - ${config.title}`;
    if (channel === "copy") {
      navigator.clipboard?.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      return;
    }
    const p = SHARE_PLATFORMS[channel];
    if (p?.getUrl) window.open(p.getUrl({ url, text }), "_blank");
  };

  const dateFmt = episode.date
    ? new Date(episode.date).toLocaleDateString(config.browserLocale, {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={episode.title}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        display: "flex",
      }}
    >
      <div
        onClick={onClose}
        style={{
          flex: 1,
          background: "rgba(0,0,0,0.6)",
        }}
      />

      <div
        ref={panelRef}
        style={{
          width: Math.min(440, window.innerWidth * 0.9),
          background: "var(--surface)",
          borderInlineStart: "1px solid var(--border)",
          overflowY: "auto",
          padding: "20px 24px",
          animation: "slideIn 0.25s ease both",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        {/* Top row: Close + Play button */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: "none",
              border: "none",
              outline: "none",
              cursor: "pointer",
              fontSize: 22,
              color: "var(--text-dim)",
              padding: 0,
              lineHeight: 1,
              display: "flex",
              transition: "color 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-dim)"; }}
          >
            <X size={22} />
          </button>
          <button
            onClick={() => onPlay(episode)}
            title={activeAndPlaying ? L.pause : L.play}
            aria-label={activeAndPlaying ? L.pause : L.play}
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              border: "none",
              background: "var(--accent)",
              color: "#fff",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--accent-hover)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "var(--accent)";
            }}
          >
            {activeAndPlaying ? <Pause size={20} weight="fill" /> : <Play size={20} weight="fill" />}
          </button>
        </div>

        {/* Episode metadata + title */}
        <div>
          <div
            style={{
              fontSize: 12,
              color: "var(--text-faint)",
              fontWeight: 500,
              marginBottom: 6,
            }}
          >
            <span>{L.season} {episode.season}</span>
            <span style={{ margin: "0 6px" }}>&middot;</span>
            <span>{L.episode} {episode.id}</span>
            {dateFmt && <><span style={{ margin: "0 6px" }}>&middot;</span><span>{dateFmt}</span></>}
            {episode.duration && <><span style={{ margin: "0 6px" }}>&middot;</span><span>{episode.duration}</span></>}
          </div>
          <h2
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: "var(--text)",
              lineHeight: 1.3,
            }}
          >
            {episode.title}
          </h2>
        </div>

        {/* Platform icons + download — below title */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginTop: -8, marginBottom: -4 }}>
          {PLATFORMS.filter((p) => hasPlatformUrl(p.key, episode)).map((p) => (
            <a
              key={p.key}
              href={getPlatformUrl(p.key, episode)}
              target="_blank"
              rel="noopener"
              onClick={() => trackSubscribe(p.key, "detail", episode.id)}
              title={p.label}
              style={{
                textDecoration: "none",
                color: "var(--text-dim)",
                display: "flex",
                alignItems: "center",
                gap: 4,
                fontSize: 12,
                fontWeight: 500,
                transition: "color 0.15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = p.hoverColor; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-dim)"; }}
            >
              <p.Icon size={18} weight="fill" />
              <span>{p.label}</span>
            </a>
          ))}
          <a
            href={`/${episode.audioFile}`}
            download={`${L.episode} ${episode.id} - ${episode.title}.mp3`}
            onClick={() => trackDownload(episode.id, "detail")}
            title={L.download}
            style={{
              textDecoration: "none",
              color: "var(--text-dim)",
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontSize: 12,
              fontWeight: 500,
              transition: "color 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "var(--accent)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-dim)"; }}
          >
            <DownloadSimple size={18} weight="fill" />
            <span>{L.download}</span>
          </a>
        </div>

        {/* Transcript — paragraph text. Source priority: .txt file,
             else SRT cues grouped into paragraphs, else episode description. */}
        {paragraphs.length > 0 && (
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: 14,
                lineHeight: 1.8,
                color: "var(--text-dim)",
              }}
            >
              {paragraphs.map((para, i) => (
                <p key={i} style={{ marginBottom: 16 }}>{query ? highlightText(para, query) : para}</p>
              ))}
            </div>
          </div>
        )}

        {/* Share section — at the bottom */}
        <div style={{ marginTop: -10 }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "var(--text)",
              marginBottom: 8,
            }}
          >
            {L.share}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {(config.share || []).map((channel) => {
              const p = SHARE_PLATFORMS[channel];
              return p ? { channel, ...p } : null;
            }).filter(Boolean).map(({ channel, title, Icon, hoverColor }) => {
              const isCopied = channel === "copy" && copied;
              return (
              <button
                key={channel}
                onClick={() => handleShare(channel)}
                aria-label={title || channel}
                style={{
                  flex: 1,
                  padding: "10px 0",
                  borderRadius: 10,
                  border: "1.5px solid var(--border)",
                  background: "transparent",
                  color: isCopied ? "var(--green)" : "var(--text)",
                  fontSize: 14,
                  cursor: "pointer",
                  transition: "all 0.15s",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                onMouseEnter={(e) => {
                  if (isCopied) return;
                  e.currentTarget.style.background = "var(--card-hover)";
                  e.currentTarget.style.color = hoverColor;
                }}
                onMouseLeave={(e) => {
                  if (isCopied) return;
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "var(--text)";
                }}
              >
                <Icon size={16} />
              </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
