import { useState, useEffect, useMemo, useRef } from "react";
import { create, insertMultiple, search } from "@orama/orama";
import config from "../utils/config";
import { tokenize } from "../utils/hebrew";
import { extractSnippet } from "../utils/highlight";

const W = config.search_weights || {};

export default function useSearch(episodes, externalQuery) {
  const [searchTexts, setSearchTexts] = useState({});
  const [db, setDb] = useState(null);
  const fetchedRef = useRef(false);
  const buildingRef = useRef(false);

  // Lazy-load full-text search index on first query
  useEffect(() => {
    if (!externalQuery || fetchedRef.current) return;
    fetchedRef.current = true;
    fetch("/search-index.json")
      .then((r) => r.json())
      .then(setSearchTexts)
      .catch(() => {});
  }, [externalQuery]);

  // Build Orama index when episodes + transcripts are available
  useEffect(() => {
    if (!episodes.length || !Object.keys(searchTexts).length || buildingRef.current) return;
    buildingRef.current = true;

    const orama = create({
      schema: {
        epId: "number",
        title: "string",
        desc: "string",
        transcript: "string",
      },
      components: {
        tokenizer: { tokenize },
      },
    });

    const docs = episodes.map((ep) => ({
      epId: ep.id,
      title: ep.title || "",
      desc: ep.desc || "",
      transcript: searchTexts[ep.id] || "",
    }));

    insertMultiple(orama, docs);
    setDb(orama);
  }, [episodes, searchTexts]);

  // Search with BM25 + field boosting
  const searchResults = useMemo(() => {
    if (!externalQuery || !db) return null;
    return search(db, {
      term: externalQuery,
      properties: ["title", "desc", "transcript"],
      boost: {
        title: W.title ?? 10,
        desc: W.description ?? 5,
        transcript: W.transcript ?? 2,
      },
    });
  }, [externalQuery, db]);

  // Build snippets for matched episodes
  const snippets = useMemo(() => {
    if (!searchResults || !externalQuery) return {};
    const map = {};
    for (const hit of searchResults.hits) {
      const id = hit.document.epId;
      const raw = searchTexts[id];
      if (raw) {
        const snip = extractSnippet(raw, externalQuery);
        if (snip) map[id] = snip;
      }
    }
    return map;
  }, [searchResults, searchTexts, externalQuery]);

  // Map Orama hits back to episode objects, preserving BM25 rank order
  const filtered = useMemo(() => {
    if (!searchResults) return externalQuery ? [] : episodes;
    const ranked = searchResults.hits.map((h) => h.document.epId);
    const idOrder = new Map(ranked.map((id, i) => [id, i]));
    return episodes
      .filter((ep) => idOrder.has(ep.id))
      .sort((a, b) => idOrder.get(a.id) - idOrder.get(b.id));
  }, [searchResults, episodes, externalQuery]);

  return { filtered, snippets };
}
