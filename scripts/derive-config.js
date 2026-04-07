// Derive computed config fields from language + country
// Used by both load-config.js (build scripts) and vite.config.js (frontend injection)

const RTL_LANGUAGES = new Set(["ar", "he", "fa", "ur", "yi", "ps", "sd", "ckb", "syr"]);

export function deriveConfig(raw) {
  const lang = raw.language || "en";
  const country = raw.country || "US";
  const langBase = lang.split("-")[0];

  const coverPath = raw.cover || "/cover.png";
  const cover_ext = /\.jpe?g$/i.test(coverPath) ? "jpg" : "png";

  return {
    ...raw,
    cover_ext,
    share: raw.share || ["twitter", "linkedin", "copy"],
    default_speed: raw.default_speed ?? 1.2,
    default_cc: raw.default_cc ?? true,
    locale: raw.locale || `${langBase}_${country}`,
    direction: raw.direction || (RTL_LANGUAGES.has(langBase) ? "rtl" : "ltr"),
    apple_podcasts_country: country.toLowerCase(),
    apple_podcasts_url: raw.apple_podcasts_id
      ? `https://podcasts.apple.com/${country.toLowerCase()}/podcast/id${raw.apple_podcasts_id}`
      : "",
    spotify_url: raw.spotify_id
      ? `https://open.spotify.com/show/${raw.spotify_id}`
      : "",
    youtube_url: raw.youtube_id
      ? `https://www.youtube.com/playlist?list=${raw.youtube_id}`
      : "",
    amazon_music_url: raw.amazon_music_id
      ? `https://music.amazon.com/podcasts/${raw.amazon_music_id}`
      : "",
    x_url: raw.x_username
      ? `https://x.com/${raw.x_username}`
      : "",
    facebook_url: raw.facebook_username
      ? `https://www.facebook.com/${raw.facebook_username}`
      : "",
    instagram_url: raw.instagram_username
      ? `https://www.instagram.com/${raw.instagram_username}`
      : "",
    tiktok_url: raw.tiktok_username
      ? `https://www.tiktok.com/@${raw.tiktok_username}`
      : "",
  };
}
