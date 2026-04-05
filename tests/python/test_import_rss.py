"""Tests for import_rss.py — RSS feed parsing functions."""

import os
import sys
from xml.etree import ElementTree

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "scripts"))

from import_rss import strip_html, parse_date, extract_episodes, assign_episode_numbers, build_yaml


class TestStripHtml:
    def test_removes_tags(self):
        assert strip_html("<p>Hello <b>world</b></p>") == "Hello world"

    def test_decodes_entities(self):
        assert strip_html("A &amp; B") == "A & B"

    def test_empty_string(self):
        assert strip_html("") == ""

    def test_none(self):
        assert strip_html(None) == ""

    def test_plain_text(self):
        assert strip_html("no tags here") == "no tags here"

    def test_strips_whitespace(self):
        assert strip_html("  <p>hello</p>  ") == "hello"


class TestParseDate:
    def test_rfc2822(self):
        assert parse_date("Wed, 15 Jan 2025 12:00:00 GMT") == "2025-01-15"

    def test_with_timezone_offset(self):
        assert parse_date("Mon, 01 Jun 2020 08:30:00 +0000") == "2020-06-01"

    def test_none(self):
        assert parse_date(None) is None

    def test_empty(self):
        assert parse_date("") is None

    def test_invalid(self):
        assert parse_date("not a date") is None

    def test_strips_whitespace(self):
        assert parse_date("  Wed, 15 Jan 2025 12:00:00 GMT  ") == "2025-01-15"


class TestExtractEpisodes:
    def _build_rss(self, items_xml):
        xml = f"""<?xml version='1.0'?>
<rss xmlns:itunes="http://www.itunes.apple.com/dtds/podcast-1.0.dtd">
<channel>
<title>Test Podcast</title>
{items_xml}
</channel>
</rss>"""
        return ElementTree.fromstring(xml)

    def test_extracts_basic_episode(self):
        root = self._build_rss("""
<item>
  <title>Episode One</title>
  <description>A &lt;b&gt;great&lt;/b&gt; episode</description>
  <pubDate>Wed, 15 Jan 2025 12:00:00 GMT</pubDate>
  <itunes:duration>05:30</itunes:duration>
  <guid>ep-001</guid>
  <enclosure url="https://example.com/ep1.mp3" type="audio/mpeg"/>
  <itunes:season>1</itunes:season>
  <itunes:episode>1</itunes:episode>
</item>""")
        episodes = extract_episodes(root)
        assert len(episodes) == 1
        ep = episodes[0]
        assert ep['title'] == 'Episode One'
        assert ep['date'] == '2025-01-15'
        assert ep['duration'] == '05:30'
        assert ep['guid'] == 'ep-001'
        assert ep['mp3_url'] == 'https://example.com/ep1.mp3'
        assert ep['season'] == 1
        assert ep['episode_num'] == 1

    def test_season_override(self):
        root = self._build_rss("""
<item>
  <title>Ep</title>
  <itunes:season>3</itunes:season>
</item>""")
        episodes = extract_episodes(root, season_override=7)
        assert episodes[0]['season'] == 7

    def test_default_season_is_1(self):
        root = self._build_rss("""
<item>
  <title>Ep</title>
</item>""")
        episodes = extract_episodes(root)
        assert episodes[0]['season'] == 1

    def test_multiple_episodes(self):
        root = self._build_rss("""
<item><title>Ep 1</title></item>
<item><title>Ep 2</title></item>
<item><title>Ep 3</title></item>""")
        episodes = extract_episodes(root)
        assert len(episodes) == 3


class TestAssignEpisodeNumbers:
    def test_assigns_sequential(self):
        episodes = [
            {'episode_num': None, 'date': '2025-01-01'},
            {'episode_num': None, 'date': '2025-01-02'},
        ]
        result = assign_episode_numbers(episodes)
        nums = [e['episode_num'] for e in result]
        assert nums == [1, 2]

    def test_skips_existing_numbers(self):
        episodes = [
            {'episode_num': 1, 'date': '2025-01-01'},
            {'episode_num': None, 'date': '2025-01-02'},
        ]
        result = assign_episode_numbers(episodes)
        nums = sorted(e['episode_num'] for e in result)
        assert nums == [1, 2]

    def test_preserves_existing(self):
        episodes = [
            {'episode_num': 5, 'date': '2025-01-01'},
            {'episode_num': 10, 'date': '2025-01-02'},
        ]
        result = assign_episode_numbers(episodes)
        nums = sorted(e['episode_num'] for e in result)
        assert nums == [5, 10]


class TestBuildYaml:
    def test_basic_structure(self):
        episodes = [{
            'title': 'Test',
            'description': 'Desc',
            'date': '2025-01-15',
            'duration': '05:30',
            'guid': 'test-001',
            'mp3_url': 'https://example.com/ep.mp3',
            'season': 1,
            'episode_num': 1,
        }]
        result = build_yaml(episodes)
        assert 'episodes' in result
        assert 1 in result['episodes']
        assert result['episodes'][1]['title'] == 'Test'
        assert result['episodes'][1]['season'] == 1
        assert result['episodes'][1]['description'] == 'Desc'

    def test_omits_empty_fields(self):
        episodes = [{
            'title': 'Test',
            'description': '',
            'date': None,
            'duration': None,
            'guid': None,
            'mp3_url': None,
            'season': 1,
            'episode_num': 1,
        }]
        result = build_yaml(episodes)
        entry = result['episodes'][1]
        assert 'description' not in entry
        assert 'date' not in entry
        assert 'duration' not in entry
        assert 'guid' not in entry
