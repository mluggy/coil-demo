// Analytics — multi-provider event dispatcher.
// Events are sent to every loaded provider. If a provider's script
// isn't loaded (no ID configured, or consent not yet granted), the
// global (window.gtag, window.fbq, etc.) won't exist and calls
// silently no-op. Consent is enforced at script-load time in
// vite.config.js, so nothing extra is needed here.
//
// Event names + parameters follow each provider's standard events
// where one matches, and fall back to custom events otherwise.

import config from "./config";

function preconnect(href) {
  const link = document.createElement("link");
  link.rel = "preconnect";
  link.href = href;
  document.head.appendChild(link);
}

function loadScript(src) {
  const s = document.createElement("script");
  s.async = true;
  s.src = src;
  document.head.appendChild(s);
}

// Dynamically initialize analytics providers after consent is granted.
// Mirrors the inline <script> init in vite.config.js so we can activate
// analytics without a page reload.
let analyticsLoaded = false;
export function loadAnalytics() {
  if (analyticsLoaded) return;
  analyticsLoaded = true;

  if (config.ga_measurement_id) {
    preconnect("https://www.googletagmanager.com");
    loadScript(`https://www.googletagmanager.com/gtag/js?id=${config.ga_measurement_id}`);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
    window.gtag("config", config.ga_measurement_id, { send_page_view: false });
  }
  if (config.fb_pixel_id) {
    preconnect("https://connect.facebook.net");
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version="2.0";n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,"script","https://connect.facebook.net/en_US/fbevents.js");
    window.fbq("init", config.fb_pixel_id);
  }
  if (config.x_pixel_id) {
    preconnect("https://static.ads-twitter.com");
    !function(e,t,n,s,u,a){e.twq||(s=e.twq=function(){s.exe?s.exe.apply(s,arguments):s.queue.push(arguments)},s.version="1.1",s.queue=[],u=t.createElement(n),u.async=!0,u.src="https://static.ads-twitter.com/uwt.js",a=t.getElementsByTagName(n)[0],a.parentNode.insertBefore(u,a))}(window,document,"script");
    window.twq("init", config.x_pixel_id);
  }
  if (config.linkedin_partner_id) {
    preconnect("https://snap.licdn.com");
    window._linkedin_partner_id = config.linkedin_partner_id;
    window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
    window._linkedin_data_partner_ids.push(config.linkedin_partner_id);
    if (!document.getElementById("linkedin-insight")) {
      const s = document.createElement("script");
      s.id = "linkedin-insight";
      s.async = true;
      s.src = "https://snap.licdn.com/li.lms-analytics/insight.min.js";
      document.getElementsByTagName("script")[0].parentNode.insertBefore(s, document.getElementsByTagName("script")[0]);
    }
  }
  if (config.clarity_project_id) {
    preconnect("https://www.clarity.ms");
    !function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y)}(window,document,"clarity","script",config.clarity_project_id);
  }
  if (config.microsoft_uet_id) {
    preconnect("https://bat.bing.com");
    !function(w,d,t,r,u){var f,n,i;w[u]=w[u]||[];f=function(){var o={ti:config.microsoft_uet_id};o.q=w[u];w[u]=new UET(o)};n=d.createElement(t);n.src=r;n.async=1;n.onload=n.onreadystatechange=function(){var s=this.readyState;s&&s!=="loaded"&&s!=="complete"||(f(),n.onload=n.onreadystatechange=null)};i=d.getElementsByTagName(t)[0];i.parentNode.insertBefore(n,i)}(window,document,"script","https://bat.bing.com/bat.js","uetq");
  }
  if (config.tiktok_pixel_id) {
    preconnect("https://analytics.tiktok.com");
    !function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"];ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))};};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e};ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{};ttq._i[e]=[];ttq._i[e]._u=i;ttq._t=ttq._t||{};ttq._t[e]=+new Date;ttq._o=ttq._o||{};ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript";o.async=!0;o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};ttq.load(config.tiktok_pixel_id)}(window,document,"ttq");
  }
  if (config.snap_pixel_id) {
    preconnect("https://sc-static.net");
    !function(e,t,n){if(e.snaptr)return;var a=e.snaptr=function(){a.handleRequest?a.handleRequest.apply(a,arguments):a.queue.push(arguments)};a.queue=[];var s=t.createElement("script");s.async=!0;s.src=n;var u=t.getElementsByTagName("script")[0];u.parentNode.insertBefore(s,u)}(window,document,"https://sc-static.net/scevent.min.js");
    window.snaptr("init", config.snap_pixel_id, {});
  }
}

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
