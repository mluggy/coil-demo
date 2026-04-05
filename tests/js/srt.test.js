import { describe, it, expect } from "vitest";
import { parseSrt, currentCue, cuesToParagraphs } from "../../src/utils/srt.js";

describe("parseSrt", () => {
  it("parses a standard SRT file", () => {
    const srt = `1
00:00:00,000 --> 00:00:03,000
Hello world

2
00:00:03,000 --> 00:00:06,500
Second line`;

    const cues = parseSrt(srt);
    expect(cues).toHaveLength(2);
    expect(cues[0]).toEqual({ start: 0, end: 3, text: "Hello world" });
    expect(cues[1]).toEqual({ start: 3, end: 6.5, text: "Second line" });
  });

  it("handles period as millisecond separator", () => {
    const srt = `1
00:00:01.500 --> 00:00:04.250
Period style`;

    const cues = parseSrt(srt);
    expect(cues).toHaveLength(1);
    // parseSrt uses comma split — period-separated ms parsed via parseInt fallback
    expect(cues[0].start).toBeCloseTo(1.5, 0);
  });

  it("handles multi-line subtitle text", () => {
    const srt = `1
00:00:00,000 --> 00:00:05,000
Line one
Line two`;

    const cues = parseSrt(srt);
    expect(cues).toHaveLength(1);
    expect(cues[0].text).toBe("Line one\nLine two");
  });

  it("returns empty array for empty input", () => {
    expect(parseSrt("")).toEqual([]);
    expect(parseSrt(null)).toEqual([]);
    expect(parseSrt(undefined)).toEqual([]);
  });

  it("skips blocks with fewer than 3 lines", () => {
    const srt = `1
00:00:00,000 --> 00:00:03,000
Valid block

2
Missing text line`;

    const cues = parseSrt(srt);
    expect(cues).toHaveLength(1);
    expect(cues[0].text).toBe("Valid block");
  });

  it("skips blocks with invalid timestamp format", () => {
    const srt = `1
not a timestamp
Some text

2
00:00:05,000 --> 00:00:10,000
Valid block`;

    const cues = parseSrt(srt);
    expect(cues).toHaveLength(1);
    expect(cues[0].text).toBe("Valid block");
  });

  it("handles hours in timestamps", () => {
    const srt = `1
01:30:00,000 --> 01:30:05,000
An hour and a half in`;

    const cues = parseSrt(srt);
    expect(cues[0].start).toBe(5400);
    expect(cues[0].end).toBe(5405);
  });

  it("handles extra whitespace between blocks", () => {
    const srt = `1
00:00:00,000 --> 00:00:01,000
First


2
00:00:02,000 --> 00:00:03,000
Second`;

    const cues = parseSrt(srt);
    expect(cues).toHaveLength(2);
  });
});

describe("currentCue", () => {
  const cues = [
    { start: 0, end: 3, text: "First" },
    { start: 5, end: 8, text: "Second" },
    { start: 10, end: 15, text: "Third" },
  ];

  it("finds the cue at exact start time", () => {
    expect(currentCue(cues, 0)).toEqual(cues[0]);
  });

  it("finds the cue at exact end time", () => {
    expect(currentCue(cues, 3)).toEqual(cues[0]);
  });

  it("finds the cue in the middle of its range", () => {
    expect(currentCue(cues, 6)).toEqual(cues[1]);
  });

  it("returns null between cues", () => {
    expect(currentCue(cues, 4)).toBeNull();
  });

  it("returns null before all cues", () => {
    expect(currentCue(cues, -1)).toBeNull();
  });

  it("returns null after all cues", () => {
    expect(currentCue(cues, 20)).toBeNull();
  });

  it("returns null for empty cues", () => {
    expect(currentCue([], 5)).toBeNull();
  });
});

describe("cuesToParagraphs", () => {
  it("returns empty array for empty input", () => {
    expect(cuesToParagraphs([])).toEqual([]);
    expect(cuesToParagraphs(null)).toEqual([]);
    expect(cuesToParagraphs(undefined)).toEqual([]);
  });

  it("groups cues with small gaps into one paragraph", () => {
    const cues = [
      { start: 0, end: 2, text: "Hello there." },
      { start: 2.5, end: 4, text: "How are you?" },
      { start: 4.3, end: 6, text: "I am fine." },
    ];
    expect(cuesToParagraphs(cues)).toEqual([
      "Hello there. How are you? I am fine.",
    ]);
  });

  it("starts a new paragraph when gap exceeds threshold", () => {
    const cues = [
      { start: 0, end: 2, text: "First thought." },
      { start: 2.5, end: 4, text: "Still first." },
      { start: 8, end: 10, text: "New paragraph starts here." },
    ];
    expect(cuesToParagraphs(cues)).toEqual([
      "First thought. Still first.",
      "New paragraph starts here.",
    ]);
  });

  it("respects custom gap threshold", () => {
    const cues = [
      { start: 0, end: 2, text: "One." },
      { start: 3, end: 5, text: "Two." },
    ];
    // With 1s threshold, the 1s gap triggers a split
    expect(cuesToParagraphs(cues, 1)).toEqual(["One.", "Two."]);
    // With 2s threshold, no split
    expect(cuesToParagraphs(cues, 2)).toEqual(["One. Two."]);
  });

  it("caps paragraph length at maxCuesPerParagraph", () => {
    const cues = Array.from({ length: 15 }, (_, i) => ({
      start: i * 2,
      end: i * 2 + 1.5, // gap = 0.5s (below threshold)
      text: `Sentence ${i + 1}.`,
    }));
    const paragraphs = cuesToParagraphs(cues, 1.5, 5);
    // 15 cues / 5 per paragraph = 3 paragraphs
    expect(paragraphs).toHaveLength(3);
    expect(paragraphs[0].split(" ")).toHaveLength(10); // 5 cues * 2 words each
  });

  it("collapses whitespace inside cue text", () => {
    const cues = [
      { start: 0, end: 2, text: "Line\none\nbroken" },
    ];
    expect(cuesToParagraphs(cues)).toEqual(["Line one broken"]);
  });

  it("skips empty cues", () => {
    const cues = [
      { start: 0, end: 2, text: "Real text." },
      { start: 2.5, end: 4, text: "  " },
      { start: 4.5, end: 6, text: "More real text." },
    ];
    expect(cuesToParagraphs(cues)).toEqual(["Real text. More real text."]);
  });
});
