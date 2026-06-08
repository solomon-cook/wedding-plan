import { Clock, Package, Search, UserRound } from "lucide-react";
import { useMemo, useState } from "react";
import { getSearchResults } from "../lib/timelineFilters";
import type { SearchResult, TimelineEntry } from "../types/timeline";

type SearchBoxProps = {
  entries: TimelineEntry[];
  onSelectResult: (result: SearchResult) => void;
  onSubmitSearch: (query: string) => void;
};

function getResultIcon(kind: SearchResult["kind"]): JSX.Element {
  if (kind === "person") {
    return <UserRound size={15} />;
  }

  if (kind === "item") {
    return <Package size={15} />;
  }

  return <Clock size={15} />;
}

export function SearchBox({
  entries,
  onSelectResult,
  onSubmitSearch,
}: SearchBoxProps): JSX.Element {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const trimmedQuery = query.trim();
  const results = useMemo(() => getSearchResults(entries, query), [entries, query]);

  function submit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    if (!trimmedQuery) {
      return;
    }

    if (results[0]) {
      onSelectResult(results[0]);
    } else {
      onSubmitSearch(trimmedQuery);
    }

    setIsOpen(false);
  }

  function selectResult(result: SearchResult): void {
    onSelectResult(result);
    setQuery("");
    setIsOpen(false);
  }

  return (
    <div className="search-box">
      <form className="search-box__form" role="search" onSubmit={submit}>
        <Search size={17} />
        <input
          aria-label="Search timeline"
          placeholder="Search person, item, event"
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.currentTarget.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
        />
      </form>

      {isOpen && trimmedQuery ? (
        <div className="search-box__results">
          {results.length > 0 ? (
            results.map((result) => (
              <button
                className="search-result"
                type="button"
                key={`${result.kind}-${result.label}-${result.kind === "entry" ? result.entryId : ""}`}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectResult(result)}
              >
                {getResultIcon(result.kind)}
                <span>
                  <strong>{result.label}</strong>
                  <small>{result.kind === "entry" ? result.meta : result.kind}</small>
                </span>
              </button>
            ))
          ) : (
            <button
              className="search-result"
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onSubmitSearch(trimmedQuery);
                setIsOpen(false);
              }}
            >
              <Search size={15} />
              <span>
                <strong>{trimmedQuery}</strong>
                <small>search</small>
              </span>
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}
