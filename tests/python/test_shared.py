"""Tests for shared.py — common utilities."""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "scripts"))

from shared import parse_episode_filename


class TestParseEpisodeFilename:
    def test_standard(self):
        assert parse_episode_filename("s1e1.mp3") == (1, 1)

    def test_multi_digit(self):
        assert parse_episode_filename("s2e15.mp3") == (2, 15)

    def test_no_extension(self):
        assert parse_episode_filename("s3e7") == (3, 7)

    def test_invalid(self):
        assert parse_episode_filename("episode1.mp3") == (None, None)

    def test_empty(self):
        assert parse_episode_filename("") == (None, None)

    def test_leading_zeros(self):
        assert parse_episode_filename("s01e05") == (1, 5)
