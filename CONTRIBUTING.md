# Contributing to coil

Thanks for your interest in contributing.

## Ground rules

- **Issues first.** For anything non-trivial, open an issue before sending a PR so we can agree on the approach.
- **Keep PRs focused.** One concern per PR. Small PRs merge faster.
- **Don't break existing podcasts.** coil is forked and deployed by users. Changes to file layout, RSS output, or URL shapes can silently break live feeds. Call out any such change in the PR description.
- **Respect the freeze contract** (see below). Do not edit frozen files.

## Frozen files contract

The following files ship at v1.0 and **must never be edited in the upstream coil repo again**:

- `podcast.yaml`
- `episodes/episodes.yaml`
- `episodes/s1e1.mp3`, `s1e1.srt`, `s1e1.txt`, `s1e1.png` (demo episode)
- `public/cover.png`
- `wrangler.toml`

These files belong to users' forks. Users customize them heavily (their podcast title, their episodes, their cover art, their Cloudflare project name). Any upstream edit would create merge conflicts — or, worse, silently overwrite their work — when they sync their fork.

### Enforcement

1. **CI check**: `.github/workflows/frozen-files-guard.yml` fails any PR that touches a frozen file. Branch protection on `main` requires this check to pass.
2. **Safety net**: `.gitattributes` lists these files with `merge=ours`, so if discipline ever slips, users' local `git pull upstream main` silently keeps their version.
3. **This document**: the contract.

### Schema evolution (adding new config fields without breaking forks)

coil evolves — you'll want to add new features that need new `podcast.yaml` fields. The rule:

- **Never edit `podcast.yaml` upstream.** It's frozen.
- **Add the new field's logic to code** (`scripts/derive-config.js`, `scripts/generate_feed.py`, `functions/_middleware.js`, etc.) with a safe default for when the field is absent.
- **Document the new field in the GitHub Release notes**: "v1.x adds optional field `foo` to `podcast.yaml`, defaults to X. Add `foo: Y` to your config to override."
- **Update [mluggy/coil-demo](https://github.com/mluggy/coil-demo)** (the English reference site, deployed to coil-demo.lugassy.net) to demonstrate the new field in a live config.

Users who want the new feature add the field to their own `podcast.yaml`. Users who don't, do nothing — their existing config keeps working because the code defaults are safe.

### Never: rename or remove existing `podcast.yaml` / `episodes.yaml` fields

The schema is append-only within a major version. Renaming or removing fields is a breaking change and requires a major version bump (v2.0) plus a documented migration path.

## Development setup

Prerequisites are in the README. Short version:

```bash
nvm use              # Node 20
npm install
pip install -r requirements.txt
```

Run the full test suite:

```bash
npm test
pytest tests/python
```

Run the dev server:

```bash
npm run dev          # Vite only (no middleware)
npm run preview      # real Cloudflare Pages runtime (requires `npm run build` first)
```

## Coding style

- JavaScript / React: 2-space indent, ES modules, no semicolon religion — match surrounding code.
- Python: 4-space indent, stdlib-first, minimal dependencies.
- Keep external dependencies small. Every new dep is a long-term maintenance burden.

## Commit messages

- Imperative mood: "add X", "fix Y", "remove Z".
- Reference issue numbers when relevant.

## Running the pipeline locally

You can run any pipeline stage by hand:

```bash
python scripts/convert_wav.py episodes/
python scripts/generate_feed.py episodes/
node scripts/yaml-to-json.js
```

Credentials for transcription / R2 / Cloudflare deploy come from environment variables — see the README for the full list.

## Reporting security issues

See [SECURITY.md](SECURITY.md).
