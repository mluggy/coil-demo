"""Tests for generate_feed.py — RSS feed generation."""

import os
import sys
import tempfile
import shutil

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "scripts"))

from generate_feed import (
    parse_episode_filename,
    escape_xml,
    rfc2822_date,
    load_existing_pubdates,
    load_manifest,
)
from datetime import datetime, timezone


class TestParseEpisodeFilename:
    def test_standard_format(self):
        assert parse_episode_filename("s1e1") == (1, 1)
        assert parse_episode_filename("s1e5") == (1, 5)
        assert parse_episode_filename("s2e10") == (2, 10)

    def test_with_extension(self):
        assert parse_episode_filename("s1e1.mp3") == (1, 1)
        assert parse_episode_filename("s3e99.srt") == (3, 99)

    def test_invalid_format(self):
        assert parse_episode_filename("episode1") == (None, None)
        assert parse_episode_filename("") == (None, None)
        assert parse_episode_filename("hello") == (None, None)

    def test_leading_zeros(self):
        assert parse_episode_filename("s01e05") == (1, 5)


class TestEscapeXml:
    def test_ampersand(self):
        assert escape_xml("A & B") == "A &amp; B"

    def test_angle_brackets(self):
        assert escape_xml("<tag>") == "&lt;tag&gt;"

    def test_quotes(self):
        assert escape_xml('say "hello"') == "say &quot;hello&quot;"
        assert escape_xml("it's") == "it&apos;s"

    def test_empty_and_none(self):
        assert escape_xml("") == ""
        assert escape_xml(None) == ""

    def test_no_escaping_needed(self):
        assert escape_xml("plain text") == "plain text"

    def test_all_special_chars(self):
        result = escape_xml('A & B < C > D "E" \'F\'')
        assert "&amp;" in result
        assert "&lt;" in result
        assert "&gt;" in result
        assert "&quot;" in result
        assert "&apos;" in result

    def test_numeric_input(self):
        assert escape_xml(42) == "42"


class TestRfc2822Date:
    def test_known_date(self):
        dt = datetime(2025, 1, 15, 12, 0, 0, tzinfo=timezone.utc)
        result = rfc2822_date(dt)
        assert "15 Jan 2025" in result
        assert "12:00:00" in result
        assert "GMT" in result

    def test_returns_string(self):
        dt = datetime(2024, 6, 1, 0, 0, 0, tzinfo=timezone.utc)
        result = rfc2822_date(dt)
        assert isinstance(result, str)
        assert len(result) > 0


class TestLoadManifest:
    def test_valid_manifest(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            manifest = os.path.join(tmpdir, "episodes.yaml")
            with open(manifest, "w") as f:
                f.write("episodes:\n  1:\n    season: 1\n    title: Test\n")
            result = load_manifest(tmpdir)
            assert 1 in result
            assert result[1]["title"] == "Test"

    def test_missing_manifest(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            result = load_manifest(tmpdir)
            assert result == {}

    def test_empty_manifest(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            manifest = os.path.join(tmpdir, "episodes.yaml")
            with open(manifest, "w") as f:
                f.write("")
            result = load_manifest(tmpdir)
            assert result == {}


class TestLoadExistingPubdates:
    def test_extracts_dates_from_xml(self):
        with tempfile.NamedTemporaryFile(mode="w", suffix=".xml", delete=False) as f:
            f.write("""<?xml version='1.0'?>
<rss><channel>
<item>
<guid isPermaLink="false">podcast-s1e1</guid>
<pubDate>Wed, 15 Jan 2025 12:00:00 GMT</pubDate>
</item>
</channel></rss>""")
            f.flush()
            result = load_existing_pubdates(f.name)
        os.unlink(f.name)
        assert "podcast-s1e1" in result
        assert "15 Jan 2025" in result["podcast-s1e1"]

    def test_missing_file(self):
        result = load_existing_pubdates("/nonexistent/rss.xml")
        assert result == {}



class TestFeedGeneration:
    """Integration test for the full feed generation pipeline."""

    def test_generates_valid_xml(self):
        """Generate a feed from the actual project episodes and verify XML structure."""
        from generate_feed import build_feed, write_feed
        import yaml

        # Use the real podcast.yaml and episodes dir
        project_root = os.path.join(os.path.dirname(__file__), "..", "..")
        config_path = os.path.join(project_root, "podcast.yaml")
        episodes_dir = os.path.join(project_root, "episodes")

        if not os.path.exists(config_path):
            pytest.skip("podcast.yaml not found")

        with open(config_path) as f:
            config = yaml.safe_load(f)

        # Build to a temp dir so we don't overwrite real rss.xml
        with tempfile.TemporaryDirectory() as tmpdir:
            # Copy episodes to temp
            for name in os.listdir(episodes_dir):
                src = os.path.join(episodes_dir, name)
                if os.path.isfile(src):
                    shutil.copy2(src, os.path.join(tmpdir, name))

            episodes, last_build = build_feed(tmpdir, config)
            write_feed(tmpdir, episodes, last_build, config)

            xml_path = os.path.join(tmpdir, "rss.xml")
            assert os.path.exists(xml_path)

            content = open(xml_path).read()
            assert content.startswith("<?xml")
            assert "<rss" in content
            assert "<channel>" in content
            assert "<item>" in content
            assert "</rss>" in content
            assert len(episodes) > 0

            # Check episode fields
            ep = episodes[0]
            assert ep["season"] > 0
            assert ep["episode_num"] > 0
            assert ep["title"]
            assert ep["guid"]
