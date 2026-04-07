// SRT subtitle parser

function parseTimestamp(ts) {
  const [hms, ms] = ts.split(",");
  const [h, m, s] = hms.split(":").map(Number);
  return h * 3600 + m * 60 + s + parseInt(ms || 0, 10) / 1000;
}

export function parseSrt(text) {
  if (!text) return [];
  const blocks = text.trim().split(/\n\s*\n/);
  const cues = [];
  for (const block of blocks) {
    const lines = block.trim().split("\n");
    if (lines.length < 3) continue;
    const timeMatch = lines[1].match(
      /(\d{2}:\d{2}:\d{2}[,.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,.]\d{3})/
    );
    if (!timeMatch) continue;
    cues.push({
      start: parseTimestamp(timeMatch[1]),
      end: parseTimestamp(timeMatch[2]),
      text: lines.slice(2).join("\n"),
    });
  }
  return cues;
}

export function currentCue(cues, time) {
  return cues.find((c) => time >= c.start && time <= c.end) || null;
}

// Group SRT cues into paragraphs for display.
// A new paragraph starts when the gap between cues exceeds `gapThreshold`
// (seconds), or when `maxCuesPerParagraph` is reached. The cap prevents
// runaway paragraphs on transcripts with no natural pauses.
export function cuesToParagraphs(cues, gapThreshold = 1.5, maxCuesPerParagraph = 10) {
  if (!cues?.length) return [];
  const paragraphs = [];
  let current = [];
  for (let i = 0; i < cues.length; i++) {
    const text = (cues[i].text || "").replace(/\s+/g, " ").trim();
    if (!text) continue;
    if (current.length > 0) {
      const gap = cues[i].start - cues[i - 1].end;
      if (gap >= gapThreshold || current.length >= maxCuesPerParagraph) {
        paragraphs.push(current.join(" "));
        current = [];
      }
    }
    current.push(text);
  }
  if (current.length) paragraphs.push(current.join(" "));
  return paragraphs;
}
