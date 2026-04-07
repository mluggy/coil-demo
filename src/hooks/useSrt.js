import { useState, useEffect, useMemo } from "react";
import { parseSrt, currentCue } from "../utils/srt";

export default function useSrt(episode) {
  const [cues, setCues] = useState([]);

  useEffect(() => {
    if (!episode?.hasSrt || !episode?.srtFile) {
      setCues([]);
      return;
    }
    let cancelled = false;
    fetch(`/${episode.srtFile}`)
      .then((r) => {
        if (!r.ok) throw new Error("SRT fetch failed");
        return r.text();
      })
      .then((text) => {
        if (!cancelled) setCues(parseSrt(text));
      })
      .catch(() => {
        if (!cancelled) setCues([]);
      });
    return () => { cancelled = true; };
  }, [episode?.id, episode?.hasSrt, episode?.srtFile]);

  return cues;
}

export function useActiveCue(cues, currentTime) {
  return useMemo(() => currentCue(cues, currentTime), [cues, currentTime]);
}
