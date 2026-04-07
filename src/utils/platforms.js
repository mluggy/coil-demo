// Platform URL construction from episode IDs
import config from "./config";

const APPLE_SHOW = config.apple_podcasts_url;
const SPOTIFY_SHOW = config.spotify_url;
const YOUTUBE_PLAYLIST = config.youtube_url;
const AMAZON_SHOW = config.amazon_music_url;

export function appleEpisodeUrl(appleId) {
  return appleId
    ? `https://podcasts.apple.com/${config.apple_podcasts_country || "us"}/podcast/id${config.apple_podcasts_id}?i=${appleId}`
    : APPLE_SHOW;
}

export function spotifyEpisodeUrl(spotifyId) {
  return spotifyId
    ? `https://open.spotify.com/episode/${spotifyId}`
    : SPOTIFY_SHOW;
}

export function amazonEpisodeUrl(amazonId) {
  return amazonId && config.amazon_music_id
    ? `https://music.amazon.com/podcasts/${config.amazon_music_id}/episodes/${amazonId}`
    : AMAZON_SHOW;
}

export function youtubeEpisodeUrl(youtubeId) {
  if (youtubeId && config.youtube_id) {
    return `https://www.youtube.com/watch?v=${youtubeId}&list=${config.youtube_id}`;
  }
  if (youtubeId) {
    return `https://www.youtube.com/watch?v=${youtubeId}`;
  }
  return YOUTUBE_PLAYLIST;
}

export function showUrl(platform) {
  const urls = { apple: APPLE_SHOW, spotify: SPOTIFY_SHOW, youtube: YOUTUBE_PLAYLIST, amazon: AMAZON_SHOW };
  return urls[platform] || null;
}

export function episodeUrl(platform, episode) {
  if (!episode) return showUrl(platform);
  const urls = {
    apple: appleEpisodeUrl(episode.appleId),
    spotify: spotifyEpisodeUrl(episode.spotifyId),
    amazon: amazonEpisodeUrl(episode.amazonId),
    youtube: youtubeEpisodeUrl(episode.youtubeId),
  };
  return urls[platform] || showUrl(platform);
}

export { APPLE_SHOW, SPOTIFY_SHOW, YOUTUBE_PLAYLIST, AMAZON_SHOW };
