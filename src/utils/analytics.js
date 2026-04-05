// Analytics — multi-provider event dispatcher.
// Events are sent to every loaded provider. If a provider's script
// isn't loaded (no GA_MEASUREMENT_ID/FB_PIXEL_ID, or consent not yet
// granted), window.gtag / window.fbq won't exist and calls silently
// no-op. Consent is enforced at script-load time in vite.config.js,
// so nothing extra is needed here.
//
// Event names + parameters follow GA4 recommended events where one
// matches, and FB Pixel standard events where one matches. Everything
// else is a custom event on both sides.

function ga(event, params) {
  if (typeof window === "undefined" || !window.gtag) return;
  try { window.gtag("event", event, params); } catch {}
}

function fb(type, event, params) {
  if (typeof window === "undefined" || !window.fbq) return;
  try { window.fbq(type, event, params); } catch {}
}

// SPA page view — fires on every client-side URL change. The GA config
// and FB init in vite.config.js are set to NOT auto-fire PageView, so
// this is the single path that records both initial load and every
// subsequent in-app navigation.
export const trackPageView = (url, title) => {
  ga("page_view", { page_location: url, page_title: title || (typeof document !== "undefined" ? document.title : undefined) });
  fb("track", "PageView");
};

// Subscribe — fires when a user clicks a podcast-platform link
// (Spotify / Apple / YouTube / Amazon) that leads off-site to subscribe.
// GA4 has no standard Subscribe event, so we reuse `external_click` for
// reporting parity with other outbound clicks; FB gets its Subscribe
// standard event, which Meta Ads can optimize campaigns against.
export const trackSubscribe = (platform, source, episodeId) => {
  const params = { platform, source, episode_id: episodeId || null };
  ga("external_click", params);
  fb("track", "Subscribe", {});
};

// Playback — custom events on both sides (no standard audio event).
export const trackEpisodePlay = (ep, speed) => {
  const params = { episode_id: ep.id, title: ep.title, season: ep.season, speed };
  ga("episode_play", params);
  fb("trackCustom", "EpisodePlay", params);
};

export const trackEpisodePause = (ep, positionPct) => {
  const params = { episode_id: ep.id, position_pct: Math.round(positionPct) };
  ga("episode_pause", params);
  fb("trackCustom", "EpisodePause", params);
};

export const trackEpisodeComplete = (ep) => {
  const params = { episode_id: ep.id };
  ga("episode_complete", params);
  fb("trackCustom", "EpisodeComplete", params);
};

export const trackSpeedChange = (newSpeed, ep) => {
  const params = { new_speed: newSpeed, episode_id: ep?.id };
  ga("speed_change", params);
  fb("trackCustom", "SpeedChange", params);
};

export const trackSubtitleToggle = (onOff) => {
  const params = { on_off: onOff ? "on" : "off" };
  ga("subtitle_toggle", params);
  fb("trackCustom", "SubtitleToggle", params);
};

// Search — GA4 'search' recommended event (search_term), FB Pixel 'Search' standard.
// Fires once per search session with an outcome: clicked / cleared / abandoned.
export const trackSearch = (term, resultsCount, outcome) => {
  const gaParams = { search_term: term, results_count: resultsCount };
  if (outcome) gaParams.outcome = outcome;
  ga("search", gaParams);
  fb("track", "Search", { search_string: term });
};

// Navigation
export const trackSeasonSwitch = (toSeason) => {
  const params = { to_season: toSeason };
  ga("season_switch", params);
  fb("trackCustom", "SeasonSwitch", params);
};

// Episode select — GA4 'select_content' recommended event, FB Pixel 'ViewContent' standard.
export const trackEpisodeSelect = (episodeId) => {
  const id = String(episodeId);
  ga("select_content", { content_type: "episode", item_id: id });
  fb("track", "ViewContent", { content_ids: [id], content_type: "podcast_episode" });
};

// Outbound / external — custom event.
export const trackExternalClick = (platform, source, episodeId) => {
  const params = { platform, source, episode_id: episodeId || null };
  ga("external_click", params);
  fb("trackCustom", "ExternalClick", params);
};

// Share — GA4 'share' recommended event (method, content_type, item_id).
export const trackShare = (channel, episodeId, source) => {
  ga("share", { method: channel, content_type: "episode", item_id: String(episodeId), source });
  fb("trackCustom", "Share", { method: channel, episode_id: episodeId, source });
};

// Download — GA4 'file_download' recommended event.
export const trackDownload = (episodeId, source) => {
  ga("file_download", { file_extension: "mp3", link_text: `episode_${episodeId}`, source });
  fb("trackCustom", "Download", { episode_id: episodeId, source });
};

// Preferences
export const trackThemeToggle = (theme) => {
  const params = { theme };
  ga("theme_toggle", params);
  fb("trackCustom", "ThemeToggle", params);
};
