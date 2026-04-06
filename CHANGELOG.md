# Changelog

All notable changes to coil are documented here.

## 1.0.1 — 2026-04-06

### Fixed
- Amazon Music episode deep links now use correct `/podcasts/{show}/episodes/{episode}` URL format.
- RSS feed served with `application/rss+xml` Content-Type (was inheriting generic `application/xml` from Cloudflare Pages).
- Explicit `Content-Type` headers for all URL-rewritten static files (sitemap.xml, llms.txt, robots.txt).

### Changed
- Analytics config keys in `podcast.yaml` renamed from UPPERCASE to lowercase for consistency (`ga_measurement_id`, `fb_pixel_id`, `x_pixel_id`, `linkedin_partner_id`, `clarity_project_id`, `microsoft_uet_id`, `tiktok_pixel_id`, `snap_pixel_id`). **Action required:** if you set any of these in your `podcast.yaml`, rename them to lowercase.
- Typo fix: "previouslyTwitter" → "previously Twitter" in config comment.

## 1.0.0 — 2026-04-06

Initial release.

### Added
- WAV to MP3 conversion with loudness normalization (ffmpeg).
- Auto-transcription to SRT via AWS Transcribe.
- AI subtitle correction via Google Gemini.
- RSS feed generation with iTunes/Spotify metadata.
- React SPA with per-episode pages, OG images, sitemap, and SSR for crawlers.
- Player with variable speed (0.8x–2x), closed captions, seek, keyboard shortcuts, and persistent preferences.
- Full-text search across episode titles, descriptions, and transcripts.
- Analytics — Google Analytics + Meta Pixel with event tracking.
- Cookie consent banner with configurable terms and privacy pages.
- CDN deploy to Cloudflare Pages with media served from R2.
- RSS import script for migrating from other podcast platforms.
- Git merge driver protecting user content from upstream sync conflicts.
