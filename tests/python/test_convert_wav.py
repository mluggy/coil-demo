"""Tests for convert_wav.py — filename parsing and YAML update logic."""

import os
import sys
import tempfile

import yaml

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "scripts"))

from convert_wav import parse_episode_filename, update_episodes_yaml


class TestParseEpisodeFilename:
    def test_standard(self):
        assert parse_episode_filename("s1e1") == (1, 1)
        assert parse_episode_filename("s2e15") == (2, 15)

    def test_leading_zeros(self):
        assert parse_episode_filename("s01e05") == (1, 5)

    def test_invalid(self):
        assert parse_episode_filename("episode1") == (None, None)
        assert parse_episode_filename("") == (None, None)
        assert parse_episode_filename("random") == (None, None)


class TestUpdateEpisodesYaml:
    def test_adds_duration_and_date(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            yaml_path = os.path.join(tmpdir, "episodes.yaml")
            with open(yaml_path, "w") as f:
                yaml.dump(
                    {"episodes": {1: {"season": 1, "title": "Test"}}},
                    f,
                )

            update_episodes_yaml(tmpdir, {1: {"duration": "05:30", "date": "2025-01-15"}})

            with open(yaml_path) as f:
                data = yaml.safe_load(f)
            assert data["episodes"][1]["duration"] == "05:30"
            assert data["episodes"][1]["date"] == "2025-01-15"

    def test_does_not_overwrite_existing_duration(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            yaml_path = os.path.join(tmpdir, "episodes.yaml")
            with open(yaml_path, "w") as f:
                yaml.dump(
                    {"episodes": {1: {"season": 1, "title": "Test", "duration": "10:00"}}},
                    f,
                )

            update_episodes_yaml(tmpdir, {1: {"duration": "05:30"}})

            with open(yaml_path) as f:
                data = yaml.safe_load(f)
            assert data["episodes"][1]["duration"] == "10:00"

    def test_missing_yaml(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            # Should not crash
            update_episodes_yaml(tmpdir, {1: {"duration": "05:30"}})

    def test_creates_episode_entry_if_missing(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            yaml_path = os.path.join(tmpdir, "episodes.yaml")
            with open(yaml_path, "w") as f:
                yaml.dump({"episodes": {}}, f)

            update_episodes_yaml(tmpdir, {5: {"duration": "03:00", "date": "2025-06-01"}})

            with open(yaml_path) as f:
                data = yaml.safe_load(f)
            assert 5 in data["episodes"]
            assert data["episodes"][5]["duration"] == "03:00"
