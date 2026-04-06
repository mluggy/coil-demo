// Analytics — multi-provider event dispatcher.
// Events are sent to every loaded provider. If a provider's script
// isn't loaded (no ID configured, or consent not yet granted), the
// global (window.gtag, window.fbq, etc.) won't exist and calls
// silently no-op. Consent is enforced at script-load time in
// vite.config.js, so nothing extra is needed here.
//
// Event names + parameters follow each provider's standard events
// where one matches, and fall back to custom events otherwise.

function ga(event, params) {
  if (typeof window === "undefined" || !window.gtag) return;
  try { window.gtag("event", event, params); } catch {}
}

function fb(type, event, params) {
  if (typeof window === "undefined" || !window.fbq) return;
  try { window.fbq(type, event, params); } catch {}
}

function tw(event, params) {
  if (typeof window === "undefined" || !window.twq) return;
  try { window.twq("track", event, params); } catch {}
}

function li(event, params) {
  if (typeof window === "undefined" || !window.lintrk) return;
  try { window.lintrk("track", { conversion_id: event, ...params }); } catch {}
}

function cl(action, ...args) {
  if (typeof window === "undefined" || !window.clarity) return;
  try { window.clarity(action, ...args); } catch {}
}

function uet(action, category, label, value) {
  if (typeof window === "undefined" || !window.uetq) return;
  try { window.uetq.push("event", action, { event_category: category, event_label: label, event_value: value }); } catch {}
}

function tt(event, params) {
  if (typeof window === "undefined" || !window.ttq) return;
  try { event === "page" ? window.ttq.page() : window.ttq.track(event, params); } catch {}
}

function snap(event, params) {
  if (typeof window === "undefined" || !window.snaptr) return;
  try { window.snaptr("track", event, params); } catch {}
}

// SPA page view — fires on every client-side URL change. The GA config
// and FB init in vite.config.js are set to NOT auto-fire PageView, so
// this is the single path that records both initial load and every
// subsequent in-app navigation.
export const trackPageView = (url, title) => {
  const t = title || (typeof document !== "undefined" ? document.title : undefined);
  ga("page_view", { page_location: url, page_title: t });
  fb("track", "PageView");
  tw("PageView");
  li("page_view");
  cl("event", "pageview");
  uet("page_view", "navigation", t);
  tt("page");
  snap("PAGE_VIEW");
};

// Subscribe — fires when a user clicks a podcast-platform link
// (Spotify / Apple / YouTube / Amazon) that leads off-site to subscribe.
export const trackSubscribe = (platform, source, episodeId) => {
  const params = { platform, source, episode_id: episodeId || null };
  ga("external_click", params);
  fb("track", "Subscribe", {});
  tw("Subscribe", { platform });
  li("subscribe", { platform });
  cl("event", "subscribe");
  uet("subscribe", "platform", platform);
  tt("Subscribe", { content_id: platform });
  snap("SUBSCRIBE", { item_ids: [platform] });
};

// Playback — custom events on both sides (no standard audio event).
export const trackEpisodePlay = (ep, speed) => {
  const params = { episode_id: ep.id, title: ep.title, season: ep.season, speed };
  const id = String(ep.id);
  ga("episode_play", params);
  fb("trackCustom", "EpisodePlay", params);
  tw("ViewContent", { content_id: id, description: "play" });
  li("episode_play", { content_id: id });
  cl("event", "episode_play");
  uet("episode_play", "playback", id);
  tt("ClickButton", { content_id: id });
  snap("CUSTOM_EVENT_1", { item_ids: [id] });
};

export const trackEpisodePause = (ep, positionPct) => {
  const pct = Math.round(positionPct);
  const params = { episode_id: ep.id, position_pct: pct };
  const id = String(ep.id);
  ga("episode_pause", params);
  fb("trackCustom", "EpisodePause", params);
  tw("CustomEvent", { content_id: id, description: "pause" });
  li("episode_pause", { content_id: id });
  cl("event", "episode_pause");
  uet("episode_pause", "playback", id, pct);
  tt("CustomEvent", { content_id: id, description: "pause" });
  snap("CUSTOM_EVENT_2", { item_ids: [id] });
};

export const trackEpisodeComplete = (ep) => {
  const params = { episode_id: ep.id };
  const id = String(ep.id);
  ga("episode_complete", params);
  fb("trackCustom", "EpisodeComplete", params);
  tw("CompleteRegistration", { content_id: id });
  li("episode_complete", { content_id: id });
  cl("event", "episode_complete");
  uet("episode_complete", "playback", id);
  tt("CompleteRegistration", { content_id: id });
  snap("CUSTOM_EVENT_3", { item_ids: [id] });
};

export const trackSpeedChange = (newSpeed, ep) => {
  const params = { new_speed: newSpeed, episode_id: ep?.id };
  const speed = String(newSpeed);
  ga("speed_change", params);
  fb("trackCustom", "SpeedChange", params);
  tw("CustomEvent", { description: "speed_change", value: speed });
  li("speed_change", { value: speed });
  cl("set", "speed", speed);
  uet("speed_change", "playback", speed);
  tt("CustomEvent", { description: "speed_change" });
  snap("CUSTOM_EVENT_5", { description: speed });
};

export const trackSubtitleToggle = (onOff) => {
  const value = onOff ? "on" : "off";
  const params = { on_off: value };
  ga("subtitle_toggle", params);
  fb("trackCustom", "SubtitleToggle", params);
  tw("CustomEvent", { description: "subtitle_toggle", value });
  li("subtitle_toggle", { value });
  cl("event", "subtitle_toggle");
  uet("subtitle_toggle", "playback", value);
  tt("CustomEvent", { description: "subtitle_toggle" });
  snap("CUSTOM_EVENT_5", { description: "subtitle_" + value });
};

// Search — GA4 'search' recommended event (search_term), FB Pixel 'Search' standard.
// Fires once per search session with an outcome: clicked / cleared / abandoned.
export const trackSearch = (term, resultsCount, outcome) => {
  const gaParams = { search_term: term, results_count: resultsCount };
  if (outcome) gaParams.outcome = outcome;
  ga("search", gaParams);
  fb("track", "Search", { search_string: term });
  tw("Search", { search_string: term });
  li("search", { search_string: term });
  cl("event", "search");
  uet("search", "search", term, resultsCount);
  tt("Search", { query: term });
  snap("SEARCH", { search_string: term });
};

// Navigation
export const trackSeasonSwitch = (toSeason) => {
  const params = { to_season: toSeason };
  const season = String(toSeason);
  ga("season_switch", params);
  fb("trackCustom", "SeasonSwitch", params);
  tw("CustomEvent", { description: "season_switch", value: season });
  li("season_switch", { value: season });
  cl("event", "season_switch");
  uet("season_switch", "navigation", season);
  tt("CustomEvent", { description: "season_switch" });
  snap("CUSTOM_EVENT_5", { description: "season_" + season });
};

// Episode select — GA4 'select_content' recommended event, FB Pixel 'ViewContent' standard.
export const trackEpisodeSelect = (episodeId) => {
  const id = String(episodeId);
  ga("select_content", { content_type: "episode", item_id: id });
  fb("track", "ViewContent", { content_ids: [id], content_type: "podcast_episode" });
  tw("ViewContent", { content_id: id });
  li("view_content", { content_id: id });
  cl("set", "episode", id);
  uet("view_content", "episode", id);
  tt("ViewContent", { content_id: id, content_type: "podcast_episode" });
  snap("VIEW_CONTENT", { item_ids: [id] });
};

// Outbound / external — custom event.
export const trackExternalClick = (platform, source, episodeId) => {
  const params = { platform, source, episode_id: episodeId || null };
  ga("external_click", params);
  fb("trackCustom", "ExternalClick", params);
  tw("CustomEvent", { description: "external_click", platform });
  li("external_click", { platform });
  cl("event", "external_click");
  uet("external_click", "navigation", platform);
  tt("CustomEvent", { description: "external_click" });
  snap("CUSTOM_EVENT_5", { description: platform });
};

// Share — GA4 'share' recommended event (method, content_type, item_id).
export const trackShare = (channel, episodeId, source) => {
  ga("share", { method: channel, content_type: "episode", item_id: String(episodeId), source });
  fb("trackCustom", "Share", { method: channel, episode_id: episodeId, source });
  tw("CustomEvent", { description: "share", method: channel });
  li("share", { method: channel });
  cl("event", "share");
  uet("share", "social", channel);
  tt("CustomEvent", { description: "share", method: channel });
  snap("SHARE", { description: channel });
};

// Download — GA4 'file_download' recommended event.
export const trackDownload = (episodeId, source) => {
  const id = String(episodeId);
  ga("file_download", { file_extension: "mp3", link_text: `episode_${episodeId}`, source });
  fb("trackCustom", "Download", { episode_id: episodeId, source });
  tw("Download", { content_id: id });
  li("download", { content_id: id });
  cl("event", "download");
  uet("download", "episode", id);
  tt("Download", { content_id: id });
  snap("CUSTOM_EVENT_4", { item_ids: [id] });
};

// Preferences
export const trackThemeToggle = (theme) => {
  const params = { theme };
  ga("theme_toggle", params);
  fb("trackCustom", "ThemeToggle", params);
  tw("CustomEvent", { description: "theme_toggle", value: theme });
  li("theme_toggle", { value: theme });
  cl("set", "theme", theme);
  uet("theme_toggle", "ui", theme);
  tt("CustomEvent", { description: "theme_toggle" });
  snap("CUSTOM_EVENT_5", { description: "theme_" + theme });
};
