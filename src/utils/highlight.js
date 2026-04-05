import { createElement } from "react";
import { Highlight } from "@orama/highlight";

// Single highlighter instance shared across components.
// Default options: case-insensitive, partial word matching (so a stemmed
// query like "הפרק" still highlights inside "הפרקים").
const highlighter = new Highlight();

const MARK_STYLE = {
  background: "var(--accent-bg2)",
  color: "var(--accent)",
  borderRadius: 2,
  padding: "0 1px",
};

// Render text with matched substrings wrapped in <mark> React elements.
// Returns the original text unchanged when no matches are found.
export function highlightText(text, query) {
  if (!text || !query) return text;
  const { positions } = highlighter.highlight(text, query);
  if (positions.length === 0) return text;

  const parts = [];
  let cursor = 0;
  for (let i = 0; i < positions.length; i++) {
    const { start, end } = positions[i];
    if (start > cursor) parts.push(text.slice(cursor, start));
    parts.push(createElement("mark", { key: i, style: MARK_STYLE }, text.slice(start, end + 1)));
    cursor = end + 1;
  }
  if (cursor < text.length) parts.push(text.slice(cursor));
  return parts;
}

// Return a plain-text snippet (~maxLen chars) around the first match.
// Used to give search results a preview window into the transcript.
export function extractSnippet(text, query, maxLen = 120) {
  if (!text || !query) return null;
  const { positions } = highlighter.highlight(text, query);
  if (positions.length === 0) return null;

  const matchAt = positions[0].start;
  const half = Math.floor(maxLen / 2);
  let start = Math.max(0, matchAt - half);
  let end = Math.min(text.length, matchAt + half);
  // Snap to word boundaries so we don't cut words mid-character.
  if (start > 0) {
    const ws = text.indexOf(" ", start);
    if (ws !== -1 && ws < matchAt) start = ws + 1;
  }
  if (end < text.length) {
    const ws = text.lastIndexOf(" ", end);
    if (ws > matchAt) end = ws;
  }
  const prefix = start > 0 ? "..." : "";
  const suffix = end < text.length ? "..." : "";
  return prefix + text.slice(start, end).trim() + suffix;
}
