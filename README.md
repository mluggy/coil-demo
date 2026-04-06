# 🎙️ coil

Self-hosted podcast platform: drop a WAV, push, and get the whole thing around it — a production podcast website with player, search, transcripts, analytics, OG images, RSS, and a CDN-deployed site.

**Demos:**
- [English](https://coil-sample.lugassy.net)
- [Hebrew](https://podcast.lugassy.net) (RTL)

<p align="center">
  <a href=".github/screenshot.png"><img src=".github/screenshot.png" alt="coil screenshot" width="640"></a>
</p>

## What It Does

An end-to-end podcast pipeline triggered by a git push:

- **WAV to MP3** conversion with loudness normalization (ffmpeg)
- **Auto-transcription** to SRT subtitles (AWS Transcribe)
- **AI subtitle correction** (Google Gemini)
- **RSS feed** generation with iTunes/Spotify metadata
- **React website** with per-episode pages, OG images, sitemap, and SSR for crawlers
- **Player** with variable speed (0.8×–2×), closed captions, seek, keyboard shortcuts, and persistent preferences
- **Full-text search** across episode titles, descriptions, and transcripts
- **Analytics** — Google Analytics + Meta Pixel with event tracking (plays, seeks, downloads, subscribes, shares, searches, external clicks)
- **Cookie consent** banner with terms & privacy pages, all configurable
- **Caching** — long-lived media, SWR HTML, immutable build assets — tuned for Cloudflare's edge
- **CDN deploy** to Cloudflare Pages with media served from R2

## Architecture

```
                                   ┌──────────────────────────┐
   git push ─▶ GitHub Actions ─▶   │ Cloudflare Pages         │
                │                  │  ├─ SPA (React)          │
                │                  │  └─ _middleware.js       │  ◀─── Googlebot / users
                │                  │       (SSR + routing)    │        see SSR HTML
                │                  └──────────┬───────────────┘
                │                             │ R2 binding
                ▼                             ▼
           episodes/*.mp3,.srt  ──▶ Cloudflare R2 (media CDN)
```

The pipeline runs Python + Node scripts, commits generated artifacts back to the repo, syncs media to R2, and deploys the site. Media files (MP3/SRT/PNG) are served from R2 via the Pages R2 binding — no separate worker needed.

## Quick Start

1. **Fork this repo** and clone it locally.
2. **Run `npm install`** — registers a git merge driver that protects your files from upstream sync (see [Staying in sync](#staying-in-sync-with-upstream)).
3. **Set up Cloudflare** — Pages project + R2 bucket (see [Cloudflare setup](#cloudflare-setup) below).
4. **Edit `wrangler.toml`** — replace `your-pages-project` with your Pages project name and set `bucket_name` to your R2 bucket.
5. **Edit `podcast.yaml`** — every field is documented inline (title, colors, social links, labels).
6. **Replace the cover art** — overwrite `public/cover.png` (1400–3000 px, square, RGB PNG/JPG, under ~500 KB).
7. **Replace or start fresh with the demo episode**:
   - **Keep episode 1**: overwrite `episodes/s1e1.wav` with your own audio and update the episode entry in `episodes/episodes.yaml`.
   - **Start fresh**: delete `episodes/s1e1.*`, reset `episodes/episodes.yaml` to `episodes: {}`, then drop your first WAV as `episodes/s{season}e{episode}.wav`.
8. **Configure GitHub secrets** (see [Secrets](#github-secrets) — minimum required: Cloudflare API token + account ID and the four `R2_*` keys).
9. **Push** — the pipeline converts, transcribes, builds, and deploys.

First run typically takes 2–8 minutes depending on episode size and whether transcription runs.

## Prerequisites

**GitHub Actions (default path):** nothing local. Runner provides Node 20, Python 3.11, ffmpeg, git-lfs.

**Local dev:** Node 20 (`nvm use`), Python 3.11+, `brew install ffmpeg git-lfs && git lfs install`, then `npm install && pip install -r requirements.txt`.

## Cloudflare setup

One Cloudflare account with two resources:

1. **Pages project** — Dashboard → Workers & Pages → Create → Pages → Connect to Git → your fork. Pick a project name (e.g. `my-podcast`). Build command: `npm run build`. Build output directory: `dist`.
2. **R2 bucket** — Dashboard → R2 → Create bucket → pick a name (e.g. `my-podcast-media`). Bind it to the Pages project at *Settings → Functions → R2 bucket bindings* with variable name `R2_BUCKET`.
3. **Edit `wrangler.toml`** to match — set `name` = Pages project name, `bucket_name` = R2 bucket name. Also set the `CLOUDFLARE_PROJECT_NAME` Actions variable to the same name.

R2 is free up to 10 GB storage + unlimited egress. Pages is free up to 500 builds/month.

**Credentials to grab:**
- **Account ID** — Cloudflare dashboard sidebar.
- **API token** — Dashboard → My Profile → API Tokens → Create Token → "Edit Cloudflare Workers" template (or custom with *Account → Cloudflare Pages → Edit* + *Account → Workers R2 Storage → Edit*).
- **R2 access keys** — Dashboard → R2 → Manage R2 API Tokens → Object Read & Write. Required so the pipeline can sync MP3/SRT files from CI to your bucket (the deployed site reads them back via the R2 binding).

## GitHub Secrets

Secrets live in **Settings → Secrets and variables → Actions → New repository secret**. Never committed, safe for public forks.

> **Workflow permissions:** the pipeline commits processed episodes back to your repo. Go to *Settings → Actions → General → Workflow permissions* → **Read and write permissions**. New forks default to read-only and will fail at `git push`.

| Secret | Required? | What happens without it |
|:---|:---|:---|
| `CLOUDFLARE_API_TOKEN` | ✅ | Site not deployed |
| `CLOUDFLARE_ACCOUNT_ID` | ✅ | Site not deployed |
| `R2_ACCESS_KEY_ID` | ✅ | Media not synced to R2 → 404s on deployed site |
| `R2_SECRET_ACCESS_KEY` | ✅ | Media not synced to R2 → 404s on deployed site |
| `R2_ENDPOINT_URL` | ✅ | Media not synced to R2 → 404s on deployed site |
| `R2_BUCKET` | ✅ | Media not synced to R2 → 404s on deployed site |
| `AWS_ACCESS_KEY_ID` | ❌ | Transcription skipped |
| `AWS_SECRET_ACCESS_KEY` | ❌ | Transcription skipped |
| `AWS_REGION` | ❌ | Transcription skipped |
| `AWS_S3_BUCKET` | ❌ | Transcription skipped (S3 is Transcribe's staging area) |
| `GEMINI_API_KEY` | ❌ | Raw Transcribe SRT used as-is |

**Repository variable** (Settings → Secrets and variables → Actions → Variables tab):

| Variable | Required? | Purpose |
|:---|:---|:---|
| `CLOUDFLARE_PROJECT_NAME` | ✅ | Must match `name` in `wrangler.toml` and your Pages project |

**Where to get credentials:**
- **AWS**: IAM → create user with `AmazonS3FullAccess` + `AmazonTranscribeFullAccess` → access key pair. Transcribe supports ~30 languages (`language` + `country` in `podcast.yaml` → e.g. `en-US`, `fr-FR`, `he-IL`).
- **Gemini**: [Google AI Studio](https://aistudio.google.com) → Create API key (free tier is plenty for podcasts).
- **Cloudflare**: see [Cloudflare setup](#cloudflare-setup).

Note: transcription also requires `transcribe: true` in `podcast.yaml`.

## Costs

coil runs entirely on free tiers for most podcasts. Here's what each service costs beyond free:

| Service | Free tier | Beyond free |
|:---|:---|:---|
| **Cloudflare Pages** | 500 builds/month | $5/month Pro plan |
| **Cloudflare R2** | 10 GB storage, unlimited egress | $0.015/GB-month storage |
| **GitHub Actions** | Unlimited for public repos; 2,000 min/month for private | ~$0.008/min |
| **Git LFS** | 1 GB storage + 1 GB bandwidth/month | $5 per 50 GB data pack |
| **AWS Transcribe** | 250,000 min free (first 12 months) | ~$0.024/min of audio |
| **AWS S3** | 5 GB storage (first 12 months) | Negligible for staging |
| **Google Gemini** | Free tier (generous) | See [pricing](https://ai.google.dev/pricing) |
| **Custom domain** | Free on Cloudflare DNS (SSL included) | Domain registration ~$10–15/year |

For a typical podcast (weekly episodes, < 1 hour each), everything stays well within free tiers — **total cost: $0/month**. The only service likely to exceed free limits is AWS Transcribe after the first year, at roughly $1.50 per hour of audio.

## Publishing to podcast directories

After your first successful deploy, your site is at `https://your-pages-project.pages.dev` (or your custom domain). Your feed is at `/rss.xml`.

- **Spotify**: [Spotify for Podcasters](https://podcasters.spotify.com) → Add or claim podcast → paste RSS URL.
- **Apple Podcasts**: [Podcasts Connect](https://podcastsconnect.apple.com) → New Show → paste your RSS URL.
- **YouTube Music / Amazon Music**: similar flows via their creator portals.

After approval, add the returned IDs to `podcast.yaml` (`spotify_id`, `apple_podcasts_id`, etc.) and each episode's `spotify_id`/`apple_id`/`youtube_id`/`amazon_id` for deep linking.

**Setting `podcast_guid` — do this before first publish.** Generate a UUIDv4 at [uuidgenerator.net/version4](https://www.uuidgenerator.net/version4) and set `podcast_guid` in `podcast.yaml`. This gives your show a stable identifier across feed URL changes. If migrating from another platform, **copy the existing `<podcast:guid>` instead** (see next section).

## Custom domain

In your Pages project: *Custom Domains → Set up domain*. Point a CNAME (or A record via Cloudflare DNS) at `your-pages-project.pages.dev`. SSL is auto-provisioned.

## Staying in sync with upstream

coil evolves — new features ship upstream and you'll want them without losing your customizations.

Your `podcast.yaml`, `episodes/episodes.yaml`, episode media, `public/cover.png`, and `wrangler.toml` are **frozen upstream** and protected from sync conflicts. Favicons and app icons are regenerated from your `cover.png` on every build — nothing to maintain separately.

**To pull updates:** click **Sync fork** on your GitHub repo, or locally:
```bash
git remote add upstream https://github.com/mluggy/coil
git pull upstream main
git push
```

Your content and config stay exactly as you left them.

<details>
<summary>How the protection works (three layers)</summary>

1. **CI check** on coil PRs blocks any modification to frozen files.
2. **`.gitattributes`** lists these files with `merge=ours` — local `git pull upstream main` silently keeps your version.
3. **`npm install`** registers the `ours` merge driver via a postinstall hook.

New `podcast.yaml` fields are announced in [GitHub Releases](https://github.com/mluggy/coil/releases) — add them to your own config if you want the feature; code uses safe defaults otherwise. For a reference config, see [mluggy/coil-sample](https://github.com/mluggy/coil-sample).
</details>

## Troubleshooting

**Pipeline fails at the commit step (`git push` → 403)**
Enable write permissions: *Settings → Actions → General → Workflow permissions* → **Read and write permissions**.

**Deploy fails with "project not found"**
Edit `wrangler.toml` — replace `your-pages-project` with your actual Pages project name. Also set the `CLOUDFLARE_PROJECT_NAME` Actions variable (Settings → Secrets and variables → Actions → Variables tab).

**Media 404s on the deployed site**
R2 bucket not bound. *Pages project → Settings → Functions → R2 bucket bindings* → add variable `R2_BUCKET` pointing to your bucket. Also verify `bucket_name` in `wrangler.toml` is non-empty.

**Episodes appear without transcripts**
Either AWS secrets aren't set, `transcribe: true` is missing in `podcast.yaml`, the language isn't supported by AWS Transcribe, or the `AWS_S3_BUCKET` staging bucket isn't reachable from your IAM user.

**`git push` is slow or fails on large WAVs**
Git LFS not initialized: `brew install git-lfs && git lfs install` on the machine pushing. Also check LFS quota on your GitHub account.

**`npm run dev` shows a blank page**
Vite dev doesn't run the middleware (no SSR). Use `npm run preview` for the full Cloudflare Pages runtime.

**Synced from upstream but something got overwritten**
You likely skipped `npm install`, which registers the merge-driver protection. Run it now. Restore your file from git history: `git log -p path/to/file` → copy the version before the sync commit.

**Gemini error: "model not found"**
Update `gemini_model` in `podcast.yaml` to a current model ID — see [ai.google.dev/gemini-api/docs/models](https://ai.google.dev/gemini-api/docs/models).

**OG image still shows old content after update**
OG images only regenerate when missing. Delete `episodes/sXeY.png` and push to force regeneration.

## Migrating from another platform

If you have an existing podcast on Anchor, Transistor, Spotify for Podcasters, Podbean, etc., import by RSS URL:

```bash
python scripts/import_rss.py https://your-rss-feed-url
python scripts/import_rss.py https://your-rss-feed-url --download  # also fetch MP3s
```

Generates `episodes/episodes.yaml` with all metadata including GUIDs (critical for preserving subscriber state).

**After importing:**
1. Verify GUIDs in `episodes.yaml` match your old feed.
2. Copy your old `<podcast:guid>` value into `podcast_guid` in `podcast.yaml`.
3. Set `legacy_slug_pattern` in `podcast.yaml` if your old URLs used slugs (Transistor example: `"/episodes/.+-(\\d+)$"`).
4. After deploying, update your RSS URL in Spotify, Apple Podcasts Connect, and other directories. Most follow 301 redirects.
5. Add `spotify_id`/`apple_id`/`youtube_id`/`amazon_id` to each episode for deep linking.

**Where to find your RSS feed URL:**

| Platform | Location |
|:---|:---|
| Anchor / Spotify for Podcasters | Settings → Distribution → RSS feed |
| Transistor | Dashboard → Show Settings → RSS feed |
| Podbean | Settings → Feed → RSS feed URL |
| Buzzsprout | Podcasts → RSS Feed |

## Local development

```bash
nvm use && npm install && pip install -r requirements.txt
npm run dev         # Vite dev server (no middleware — fine for UI iteration)
npm run preview     # Full Cloudflare Pages runtime with middleware
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for script breakdown, SSR verification, and running pipeline stages by hand.

## Examples

Real-world podcasts running on coil:

- **[coil-sample.lugassy.net](https://coil-sample.lugassy.net)** — English reference/demo site maintained by the coil author. [[Source](https://github.com/mluggy/coil-sample)]
- **[podcast.lugassy.net](https://podcast.lugassy.net)** — Hebrew RTL podcast, AWS Transcribe + Gemini correction, migrated from Transistor. [[Source](https://github.com/mluggy/podcast)]

Running coil? Open a PR adding your site (one line: link + what's interesting about your setup).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Security

See [SECURITY.md](SECURITY.md).

## License

MIT. See [LICENSE](LICENSE).

## Support

If coil is useful to you, consider [sponsoring the project](https://github.com/sponsors/mluggy).
