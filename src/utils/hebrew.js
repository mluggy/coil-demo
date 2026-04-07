// Hebrew stemmer and tokenizer for Orama search.
// No dictionary — uses rule-based prefix/suffix stripping.
// Designed to maximize recall (finding relevant results) while keeping
// precision acceptable. Both index and query pass through the same
// stemmer, so false stems only hurt if they collide with another word's stem.
//
// Gated on config.language === "he" — for other languages, stem() and
// tokenize() fall back to pass-through / plain word splitting so Orama's
// default scoring still works.
import config from "./config";

export const HEBREW_ACTIVE = (config.language || "").split("-")[0] === "he";

// Common Hebrew stop words — function words that add no search value.
export const STOP_WORDS = new Set([
  "את", "של", "לא", "על", "זה", "הוא", "או", "אבל", "עם", "כל",
  "גם", "היא", "אם", "מה", "כמו", "רק", "כדי", "הם", "יש", "אז",
  "אני", "כי", "הזה", "הזאת", "לו", "לה", "לי", "לנו", "להם",
  "שלי", "שלך", "שלו", "שלה", "שלנו", "שלכם", "שלהם",
  "אותו", "אותה", "אותם", "אותן", "עוד", "הנה", "פה", "שם",
  "איך", "למה", "מתי", "איפה", "כמה", "הן", "אלה", "אלו",
  "היה", "היו", "היתה", "הייתה", "יהיה", "תהיה", "להיות",
  "אחד", "אחת", "שני", "שתי", "כבר", "עדיין", "ממש", "בכל",
  "ואם", "אין", "בין", "מאוד", "ביותר",
]);

// Compound prefixes — checked longest first so "כשה" is tried before "כש" or "ה".
const COMPOUND_PREFIXES = ["כשה", "ושה", "ובה", "ולה", "ומה", "שה", "וה", "בה", "לה", "מה", "כש"];

// Single-char prefixes split into two safety tiers:
// Tier 1 (safe): ה (definite article), ו (conjunction) — very rarely start a root
// Tier 2 (conservative): ש, ב, ל, מ, כ — also common root-initial letters,
//   so we require a longer remaining word to reduce false stems.
const SAFE_PREFIXES = "הו";
const CONSERVATIVE_PREFIXES = "שבלמכ";

export function stem(word) {
  if (!HEBREW_ACTIVE) return word;
  // Only stem Hebrew words; pass Latin/digits through unchanged
  if (!/[\u05D0-\u05EA]/.test(word) || word.length <= 2) return word;

  let w = word;
  const origLen = w.length;

  // --- Prefix stripping (one pass) ---
  // Try compound prefixes first (2-3 chars, e.g., שה = ש + ה article)
  for (const p of COMPOUND_PREFIXES) {
    if (w.startsWith(p) && w.length - p.length >= 2) {
      w = w.slice(p.length);
      break;
    }
  }
  // If no compound matched, try single prefixes
  if (w.length === origLen) {
    if (SAFE_PREFIXES.includes(w[0]) && w.length >= 3) {
      w = w.slice(1);
    } else if (CONSERVATIVE_PREFIXES.includes(w[0]) && w.length >= 5) {
      w = w.slice(1);
    }
  }

  // --- Suffix stripping (one pass, mutually exclusive) ---
  // Masculine plural: מודלים → מודל
  if (w.endsWith("ים") && w.length >= 5) {
    w = w.slice(0, -2);
  }
  // Feminine plural: חברות → חבר
  else if (w.endsWith("ות") && w.length >= 5) {
    w = w.slice(0, -2);
  }
  // Adjective/demonym feminine: ישראלית → ישראל
  else if (w.endsWith("ית") && w.length >= 5) {
    w = w.slice(0, -2);
  }
  // Feminine singular: גדולה → גדול
  else if (w.endsWith("ה") && w.length >= 4) {
    w = w.slice(0, -1);
  }

  return w;
}

// Tokenizer for Orama: normalize → split → filter stops → stem.
// Returns an array of stemmed tokens. For non-Hebrew configs, falls back
// to a plain lowercase word-split so Orama's BM25 still works without
// any Hebrew-specific processing.
export function tokenize(text) {
  if (!HEBREW_ACTIVE) {
    return text
      .toLowerCase()
      .split(/\W+/u)
      .filter((w) => w.length > 0);
  }
  return text
    .toLowerCase()
    .replace(/[\u0591-\u05C7]/g, "")          // strip niqqud
    .split(/[^\w\u05D0-\u05EA]+/)             // split on non-word/non-Hebrew
    .filter((w) => w.length > 0 && !STOP_WORDS.has(w))
    .map(stem);
}
