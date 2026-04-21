import { useState, useRef, useMemo } from "react";
import { Copy, Check } from "lucide-react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { SearchResult, DictionaryEntry } from "../hooks/useDictionary";

interface ResultListProps {
  results: SearchResult | null;
  keyword: string;
}

type RowType = 
  | { type: 'header'; title: string; colorClass: string }
  | { type: 'entry'; entry: DictionaryEntry; isExact: boolean };

import HighlightedText from "./HighlightedText";

function ResultItem({ entry, keyword, isExact }: { entry: DictionaryEntry, keyword: string, isExact: boolean }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const keywordLower = keyword.toLowerCase();
    const isEnMatch = entry.en.toLowerCase().includes(keywordLower);
    navigator.clipboard.writeText(isEnMatch ? entry.ja : entry.en);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto] items-center gap-6 px-4 py-3 rounded-md transition-colors hover:bg-drac-bg-tertiary ${isExact ? 'bg-drac-success-bg border-l-4 border-drac-success pl-[calc(1rem-4px)]' : 'bg-transparent'}`}>
      <div className="text-base font-medium text-drac-text-primary whitespace-nowrap overflow-hidden text-ellipsis" title={entry.ja}>
        <HighlightedText text={entry.ja} query={keyword} />
      </div>
      <div className="text-[0.95rem] font-mono text-drac-text-secondary whitespace-nowrap overflow-hidden text-ellipsis" title={entry.en}>
        <HighlightedText text={entry.en} query={keyword} />
      </div>
      <div className="text-xs text-[#6272A4] bg-black/20 px-2 py-0.5 rounded-sm border border-drac-border whitespace-nowrap">
        {entry.source_file}
      </div>
      <button 
        className="p-1.5 rounded-md border border-drac-border text-drac-text-primary hover:bg-drac-bg-tertiary transition-colors" 
        onClick={handleCopy}
        title="Copy Translation"
      >
        {copied ? <Check size={16} className="text-drac-success" /> : <Copy size={16} />}
      </button>
    </div>
  );
}

function SectionHeader({ title, className }: { title: string, className: string }) {
  return (
    <div className={`text-xs uppercase tracking-widest font-bold pb-2 border-b border-drac-border mt-4 mb-2 ${className}`}>
      {title}
    </div>
  );
}

export function ResultList({ results, keyword }: ResultListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const rows = useMemo(() => {
    if (!results) return [];
    
    const flattened: RowType[] = [];
    
    if (results.exact.length > 0) {
      flattened.push({ type: 'header', title: 'Exact Matches', colorClass: 'text-drac-success' });
      results.exact.forEach(entry => flattened.push({ type: 'entry', entry, isExact: true }));
    }
    
    if (results.prefix.length > 0) {
      flattened.push({ type: 'header', title: 'Prefixed Matches', colorClass: 'text-drac-accent' });
      results.prefix.forEach(entry => flattened.push({ type: 'entry', entry, isExact: false }));
    }
    
    if (results.substring.length > 0) {
      flattened.push({ type: 'header', title: 'Partial Matches', colorClass: 'text-drac-accent hover' });
      results.substring.forEach(entry => flattened.push({ type: 'entry', entry, isExact: false }));
    }
    
    return flattened;
  }, [results]);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => rows[index].type === 'header' ? 45 : 55, // Estimate 55px for rows, 45px for headers
    overscan: 10,
  });

  if (!keyword) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-drac-text-secondary h-full text-center">
        <h2 className="text-xl font-semibold mb-2">Dictionary Ready</h2>
        <p>Start typing in the search bar above to translate.</p>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-drac-text-secondary h-full text-center">
        <h2 className="text-xl font-semibold mb-2">No Results Found</h2>
        <p>No matches for "{keyword}"</p>
      </div>
    );
  }

  return (
    <div ref={parentRef} className="h-full overflow-y-auto scrollbar-dracula py-6 px-8 w-full">
      <div style={{ height: `${virtualizer.getTotalSize()}px`, position: "relative" }}>
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const row = rows[virtualRow.index];
          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              {row.type === 'header' ? (
                <SectionHeader title={row.title} className={row.colorClass} />
              ) : (
                <ResultItem entry={row.entry} keyword={keyword} isExact={row.isExact} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
