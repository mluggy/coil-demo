#!/usr/bin/env python3
"""Import episodes from an existing RSS feed into coil's episodes.yaml format.

Usage:
    python scripts/import_rss.py https://feeds.transistor.fm/your-podcast
    python scripts/import_rss.py https://feeds.transistor.fm/your-podcast --download
    python scripts/import_rss.py https://feeds.transistor.fm/your-podcast --season 2
"""

import argparse
import html
import re
import sys
from email.utils import parsedate_to_datetime
from pathlib import Path
from urllib.request import urlopen, Request
from xml.etree import ElementTree

import yaml

NS = {
    'itunes': 'http://www.itunes.apple.com/dtds/podcast-1.0.dtd',
    'podcast': 'https://podcastindex.org/namespace/1.0',
    'content': 'http://purl.org/rss/1.0/modules/content/',
}


def strip_html(text):
    """Remove HTML tags and decode entities."""
    if not text:
        return ''
    text = re.sub(r'<[^>]+>', '', text)
    text = html.unescape(text)
    return text.strip()


def parse_date(date_str):
    """Parse RFC 2822 date string to YYYY-MM-DD."""
    if not date_str:
        return None
    try:
        dt = parsedate_to_datetime(date_str.strip())
        return dt.strftime('%Y-%m-%d')
    except Exception:
        return None


def fetch_feed(url):
    """Fetch and parse an RSS feed from a URL."""
    req = Request(url, headers={'User-Agent': 'coil-import/1.0'})
    with urlopen(req, timeout=30) as resp:
        raw = resp.read()
    return ElementTree.fromstring(raw)


def extract_episodes(root, season_override=None):
    """Extract episode data from parsed RSS XML."""
    channel = root.find('channel')
    if channel is None:
        print("Error: No <channel> element found in feed.", file=sys.stderr)
        sys.exit(1)

    items = channel.findall('item')
    if not items:
        print("Error: No <item> elements found in feed.", file=sys.stderr)
        sys.exit(1)

    episodes = []
    for item in items:
        # Title
        title_el = item.find('title')
        title = title_el.text.strip() if title_el is not None and title_el.text else ''

        # Description: prefer <itunes:summary>, fall back to <description>
        desc = ''
        itunes_summary = item.find('itunes:summary', NS)
        description_el = item.find('description')
        if itunes_summary is not None and itunes_summary.text:
            desc = strip_html(itunes_summary.text)
        elif description_el is not None and description_el.text:
            desc = strip_html(description_el.text)

        # Date
        pub_date_el = item.find('pubDate')
        date = parse_date(pub_date_el.text if pub_date_el is not None else None)

        # Duration
        duration_el = item.find('itunes:duration', NS)
        duration = duration_el.text.strip() if duration_el is not None and duration_el.text else None

        # GUID
        guid_el = item.find('guid')
        guid = guid_el.text.strip() if guid_el is not None and guid_el.text else None

        # Enclosure (MP3 URL)
        enclosure_el = item.find('enclosure')
        mp3_url = enclosure_el.get('url') if enclosure_el is not None else None

        # Season
        if season_override is not None:
            season = season_override
        else:
            season_el = item.find('itunes:season', NS)
            season = int(season_el.text.strip()) if season_el is not None and season_el.text else 1

        # Episode number (may be absent)
        ep_el = item.find('itunes:episode', NS)
        episode_num = int(ep_el.text.strip()) if ep_el is not None and ep_el.text else None

        episodes.append({
            'title': title,
            'description': desc,
            'date': date,
            'duration': duration,
            'guid': guid,
            'mp3_url': mp3_url,
            'season': season,
            'episode_num': episode_num,
        })

    return episodes


def assign_episode_numbers(episodes):
    """Assign sequential episode numbers where missing, oldest first."""
    # Sort by date (oldest first) for sequential numbering
    episodes_with_dates = sorted(
        episodes,
        key=lambda e: e.get('date') or '9999-99-99'
    )

    # Collect already-used episode numbers
    used = {e['episode_num'] for e in episodes_with_dates if e['episode_num'] is not None}

    # Assign numbers sequentially, skipping already-used ones
    next_num = 1
    for ep in episodes_with_dates:
        if ep['episode_num'] is None:
            while next_num in used:
                next_num += 1
            ep['episode_num'] = next_num
            used.add(next_num)
            next_num += 1

    return episodes_with_dates


def download_mp3(url, dest_path):
    """Download an MP3 file from a URL."""
    req = Request(url, headers={'User-Agent': 'coil-import/1.0'})
    with urlopen(req, timeout=120) as resp:
        with open(dest_path, 'wb') as f:
            while True:
                chunk = resp.read(8192)
                if not chunk:
                    break
                f.write(chunk)


def build_yaml(episodes):
    """Build the episodes.yaml data structure."""
    ep_dict = {}
    for ep in episodes:
        entry = {
            'season': ep['season'],
            'title': ep['title'],
        }
        if ep['description']:
            entry['description'] = ep['description']
        if ep['date']:
            entry['date'] = ep['date']
        if ep['duration']:
            entry['duration'] = ep['duration']
        if ep['guid']:
            entry['guid'] = ep['guid']
        ep_dict[ep['episode_num']] = entry

    return {'episodes': ep_dict}


def main():
    parser = argparse.ArgumentParser(
        description='Import episodes from an RSS feed into coil format.'
    )
    parser.add_argument('url', help='RSS feed URL')
    parser.add_argument(
        '--download', action='store_true',
        help='Download MP3 files to episodes/ directory'
    )
    parser.add_argument(
        '--season', type=int, default=None,
        help='Assign all episodes to this season number (default: read from RSS or 1)'
    )
    parser.add_argument(
        '--no-confirm', action='store_true',
        help='Overwrite existing episodes.yaml without confirmation'
    )
    args = parser.parse_args()

    # Determine project root (script lives in scripts/)
    script_dir = Path(__file__).resolve().parent
    project_root = script_dir.parent
    episodes_dir = project_root / 'episodes'
    episodes_yaml_path = episodes_dir / 'episodes.yaml'

    # Check for existing episodes.yaml
    if episodes_yaml_path.exists() and not args.no_confirm:
        print(
            f"Warning: {episodes_yaml_path} already exists. "
            "Use --no-confirm to overwrite.",
            file=sys.stderr,
        )
        sys.exit(1)

    # Fetch and parse feed
    print(f"Fetching feed: {args.url}", file=sys.stderr)
    root = fetch_feed(args.url)

    # Extract episodes
    episodes = extract_episodes(root, season_override=args.season)
    episodes = assign_episode_numbers(episodes)

    # Sort by episode number for output
    episodes.sort(key=lambda e: e['episode_num'])

    # Download MP3s if requested
    downloaded = 0
    if args.download:
        episodes_dir.mkdir(parents=True, exist_ok=True)
        for ep in episodes:
            if ep['mp3_url']:
                filename = f"s{ep['season']}e{ep['episode_num']}.mp3"
                dest = episodes_dir / filename
                print(f"  Downloading {filename}...", file=sys.stderr)
                try:
                    download_mp3(ep['mp3_url'], str(dest))
                    downloaded += 1
                except Exception as e:
                    print(f"  Warning: Failed to download {filename}: {e}", file=sys.stderr)

    # Write episodes.yaml
    episodes_dir.mkdir(parents=True, exist_ok=True)
    yaml_data = build_yaml(episodes)
    with open(episodes_yaml_path, 'w', encoding='utf-8') as f:
        f.write("# =============================================================================\n")
        f.write("# Episode Manifest\n")
        f.write("# =============================================================================\n")
        f.write("# Imported from RSS feed. Review and adjust as needed.\n")
        f.write("# Required fields: season, title.\n")
        f.write("# Optional: description, date, duration, size, guid,\n")
        f.write("#           apple_id, spotify_id, amazon_id, youtube_id.\n\n")
        yaml.dump(
            yaml_data,
            f,
            default_flow_style=False,
            allow_unicode=True,
            sort_keys=False,
        )

    # Summary
    count = len(episodes)
    dl_msg = f", {downloaded} MP3s downloaded" if args.download else " (metadata only)"
    print(f"\nDone: {count} episodes imported{dl_msg}", file=sys.stderr)
    print(f"Output: {episodes_yaml_path}", file=sys.stderr)


if __name__ == '__main__':
    main()
