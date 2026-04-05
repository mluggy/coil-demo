"""Tests for fix_srt.py — SRT file discovery logic."""

import os
import sys
import tempfile

import pytest

# fix_srt imports google.genai at module level, which may not be installed locally.
# We mock it before importing.
sys.modules.setdefault("google", type(sys)("google"))
sys.modules.setdefault("google.genai", type(sys)("google.genai"))

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "scripts"))

from fix_srt import find_srt_files, validate_srt_output, count_srt_blocks


class TestFindSrtFiles:
    def test_finds_srt_with_txt(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            srt = os.path.join(tmpdir, "s1e1.srt")
            txt = os.path.join(tmpdir, "s1e1.txt")
            open(srt, "w").close()
            open(txt, "w").close()

            result = find_srt_files(tmpdir)
            assert len(result) == 1
            assert result[0][1] is True  # has_txt

    def test_finds_srt_without_txt(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            srt = os.path.join(tmpdir, "s1e1.srt")
            open(srt, "w").close()

            result = find_srt_files(tmpdir)
            assert len(result) == 1
            assert result[0][1] is False  # no txt

    def test_filters_by_basename(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            for name in ["s1e1.srt", "s1e2.srt", "s1e3.srt"]:
                open(os.path.join(tmpdir, name), "w").close()

            result = find_srt_files(tmpdir, ["s1e2.srt"])
            assert len(result) == 1
            assert "s1e2.srt" in str(result[0][0])

    def test_empty_directory(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            result = find_srt_files(tmpdir)
            assert result == []

    def test_skips_nonexistent_basenames(self, capsys):
        with tempfile.TemporaryDirectory() as tmpdir:
            result = find_srt_files(tmpdir, ["nonexistent.srt"])
            assert result == []


class TestCountSrtBlocks:
    def test_counts_blocks(self):
        text = "1\n00:00:01,000 --> 00:00:02,000\nHello\n\n2\n00:00:03,000 --> 00:00:04,000\nWorld\n"
        assert count_srt_blocks(text) == 2

    def test_empty_text(self):
        assert count_srt_blocks("") == 0


class TestValidateSrtOutput:
    def test_valid_srt_passes(self):
        original = "1\n00:00:01,000 --> 00:00:02,000\nHello\n\n2\n00:00:03,000 --> 00:00:04,000\nWorld\n"
        corrected = "1\n00:00:01,000 --> 00:00:02,000\nHi\n\n2\n00:00:03,000 --> 00:00:04,000\nWorld\n"
        valid, reason = validate_srt_output(original, corrected)
        assert valid is True

    def test_missing_timestamps_fails(self):
        original = "1\n00:00:01,000 --> 00:00:02,000\nHello\n"
        corrected = "Here is the corrected subtitle file:\nHello World"
        valid, reason = validate_srt_output(original, corrected)
        assert valid is False
        assert "timestamp" in reason

    def test_block_count_mismatch_fails(self):
        original = "1\n00:00:01,000 --> 00:00:02,000\nHello\n\n2\n00:00:03,000 --> 00:00:04,000\nWorld\n"
        corrected = "1\n00:00:01,000 --> 00:00:02,000\nHello World\n"
        valid, reason = validate_srt_output(original, corrected)
        assert valid is False
        assert "block count" in reason

    def test_period_separator_accepted(self):
        original = "1\n00:00:01.000 --> 00:00:02.000\nHello\n"
        corrected = "1\n00:00:01.000 --> 00:00:02.000\nHi\n"
        valid, reason = validate_srt_output(original, corrected)
        assert valid is True
