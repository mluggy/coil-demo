import { forwardRef } from "react";
import { MagnifyingGlass, X } from "@phosphor-icons/react";
import config from "../utils/config";

const SearchBar = forwardRef(function SearchBar({ query, setQuery, searchRef, onFocus, onBlur }, ref) {
  const inputRef = searchRef || ref;

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <span
        style={{
          position: "absolute",
          insetInlineStart: 12,
          top: "50%",
          transform: "translateY(-50%)",
          pointerEvents: "none",
          color: "var(--text-faint)",
          display: "flex",
        }}
      >
        <MagnifyingGlass size={16} />
      </span>
      <label htmlFor="podcast-search" className="sr-only">{config.labels.search}</label>
      <input
        id="podcast-search"
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={config.labels.search}
        style={{
          width: "100%",
          paddingBlock: 9,
          paddingInlineStart: 36,
          paddingInlineEnd: 36,
          borderRadius: 10,
          border: "1.5px solid var(--border)",
          background: "var(--card)",
          color: "var(--text)",
          fontSize: 14,
          fontFamily: "var(--font-body)",
          outline: "none",
          transition: "border-color 0.15s",
        }}
        onFocus={(e) => {
          e.target.style.borderColor = "var(--accent)";
          onFocus?.(e);
        }}
        onBlur={(e) => {
          e.target.style.borderColor = "var(--border)";
          onBlur?.(e);
        }}
      />
      {query && (
        <button
          onClick={() => setQuery("")}
          aria-label={config.labels.clear || "Clear search"}
          style={{
            position: "absolute",
            insetInlineEnd: 10,
            top: "50%",
            transform: "translateY(-50%)",
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--text-dim)",
            padding: 4,
            display: "flex",
          }}
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
});

export default SearchBar;
