#!/usr/bin/env python3
"""Convert WAV files to MP3 using ffmpeg, and update episodes.yaml with duration/date."""

import argparse
import glob
import os
import subprocess
import sys
from datetime import date

import mutagen.mp3
import yaml

sys.path.insert(0, os.path.dirname(__file__))
from shared import parse_episode_filename, get_mp3_duration, require_ffmpeg


def update_episodes_yaml(episodes_dir, updates):
    """Update episodes.yaml with duration and date for converted episodes."""
    yaml_path = os.path.join(episodes_dir, "episodes.yaml")
    if not os.path.exists(yaml_path):
        return

    with open(yaml_path, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)

    episodes = data.get("episodes", {})
    changed = False

    for ep_num, fields in updates.items():
        if ep_num not in episodes:
            episodes[ep_num] = {}
        ep = episodes[ep_num]

        if "duration" in fields and not ep.get("duration"):
            ep["duration"] = fields["duration"]
            changed = True
        if "date" in fields and not ep.get("date"):
            ep["date"] = fields["date"]
            changed = True

    if changed:
        data["episodes"] = episodes
        with open(yaml_path, "w", encoding="utf-8") as f:
            yaml.dump(data, f, allow_unicode=True, default_flow_style=False, sort_keys=False)
        print(f"Updated {yaml_path}", file=sys.stderr)


def convert_wav_to_mp3(wav_file):
    """Convert a single WAV file to MP3, strip ID3 tags, and remove the source."""
    basename = os.path.splitext(os.path.basename(wav_file))[0]
    mp3_file = os.path.join(os.path.dirname(wav_file), basename + ".mp3")

    if os.path.exists(mp3_file):
        return None

    try:
        subprocess.run(
            [
                "ffmpeg", "-y", "-i", wav_file,
                "-af", "loudnorm=I=-16:TP=-1.0:LRA=7",
                "-ar", "44100", "-acodec", "mp3", "-ab", "192k",
                mp3_file,
            ],
            check=True,
        )
    except subprocess.CalledProcessError as e:
        print(f"Error converting {wav_file}: {e}", file=sys.stderr)
        return None

    try:
        audio = mutagen.mp3.MP3(mp3_file)
        audio.delete()
        audio.save()
    except Exception as e:
        print(f"Error stripping tags from {mp3_file}: {e}", file=sys.stderr)

    os.remove(wav_file)
    return basename + ".mp3"


def main(episodes_dir):
    """Scan for WAV files, convert each to MP3, and update episodes.yaml."""
    wav_files = sorted(glob.glob(os.path.join(episodes_dir, "*.wav")))
    yaml_updates = {}

    for wav_file in wav_files:
        result = convert_wav_to_mp3(wav_file)
        if result:
            print(result)

            basename = os.path.splitext(result)[0]
            _season, ep_num = parse_episode_filename(basename)
            if ep_num is None:
                continue

            mp3_path = os.path.join(episodes_dir, result)
            duration_str, _duration_ms = get_mp3_duration(mp3_path)

            update = {}
            if duration_str and duration_str != "00:00":
                update["duration"] = duration_str
            update["date"] = str(date.today())
            yaml_updates[ep_num] = update

    if yaml_updates:
        update_episodes_yaml(episodes_dir, yaml_updates)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Convert WAV files in EPISODES_DIR to MP3 via ffmpeg."
    )
    parser.add_argument("episodes_dir", help="Path to episodes directory")
    args = parser.parse_args()
    require_ffmpeg()
    main(args.episodes_dir)
