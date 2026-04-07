"""Shared utilities for podcast pipeline scripts."""

import os
import re
import shutil
import sys
from pathlib import Path

import mutagen.mp3


def parse_episode_filename(filename):
    """Extract season and episode number from filename like s1e5."""
    match = re.match(r"s(\d+)e(\d+)", filename)
    if not match:
        return None, None
    return int(match.group(1)), int(match.group(2))


def get_mp3_duration(mp3_path):
    """Return (duration_string, duration_ms) from MP3 metadata."""
    try:
        audio = mutagen.mp3.MP3(mp3_path)
        total_seconds = int(audio.info.length)
        ms = int(audio.info.length * 1000)
        hours = total_seconds // 3600
        minutes = (total_seconds % 3600) // 60
        seconds = total_seconds % 60
        if hours > 0:
            duration_str = f"{hours:02d}:{minutes:02d}:{seconds:02d}"
        else:
            duration_str = f"{minutes:02d}:{seconds:02d}"
        return duration_str, ms
    except Exception as e:
        print(f"Warning: Could not read duration for {mp3_path}: {e}", file=sys.stderr)
        return "00:00", 0


def project_root():
    """Return the project root directory (parent of scripts/)."""
    return Path(__file__).resolve().parent.parent


def validate_env_vars(required):
    """Exit with a helpful error if any required env vars are missing."""
    missing = [v for v in required if not os.environ.get(v)]
    if missing:
        print(
            f"Error: missing required environment variables: {', '.join(missing)}",
            file=sys.stderr,
        )
        sys.exit(1)


def require_ffmpeg():
    """Exit if ffmpeg is not on PATH."""
    if shutil.which("ffmpeg") is None:
        print(
            "Error: ffmpeg not found on PATH. Install it (e.g. `brew install ffmpeg` "
            "or `sudo apt-get install ffmpeg`) and try again.",
            file=sys.stderr,
        )
        sys.exit(1)
