import React, { useState, useRef, useMemo } from "react";
import { Copy, Check, Table as TableIcon, FileText, Languages } from "lucide-react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { SearchResult, DictionaryEntry } from "../hooks/use-dictionary";
import HighlightedText from "./highlighted-text";

interface ResultListProps {
  results: SearchResult | null;
  keyword: string;
}

type RowType = 
  | { type: 'header'; title: string; colorClass: string }
  | { type: 'entry'; entry: DictionaryEntry; isExact: boolean };

// Standardized grid layout for perfect alignment
const GRID_LAYOUT = "grid grid-cols-[1.2fr_1.2fr_240px_160px_48px] gap-4 items-center px-6";

const ResultItem = React.memo(({ 
  entry, 
  keyword, 
  isExact,
  isFocused,
  onFocus 
}: { 
  entry: DictionaryEntry, 
  keyword: string, 
  isExact: boolean,
  isFocused: boolean,
  onFocus: () => void
}) => {
  const [copied, setCopied] = useState(false);
  const [copyType, setCopyType] = useState<'ja' | 'en' | 'all' | null>(null);

  const handleCopy = (e: React.MouseEvent, text: string, type: 'ja' | 'en' | 'all') => {
    e.stopPropagation();
    onFocus();
    
    navigator.clipboard.writeText(text);
    setCopied(true);
    setCopyType(type);
    setTimeout(() => {
      setCopied(false);
      setCopyType(null);
    }, 1500);
  };

  return (
    <div 
      onClick={onFocus}
      className={`${GRID_LAYOUT} py-3 group transition-all duration-75 relative cursor-pointer border-y border-transparent z-0
        ${isFocused 
          ? 'bg-drac-accent/20 border-drac-accent/40 shadow-[inset_0_0_40px_rgba(189,147,249,0.15)] ring-1 ring-drac-accent/30 z-10' 
          : 'bg-transparent hover:bg-drac-bg-secondary hover:border-drac-border/50 hover:shadow-xl hover:z-10'
        }
        ${isExact && !isFocused ? 'bg-drac-accent/5' : ''}
      `}
    >
      {/* Selection/Hover Indicator Line */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 transition-all duration-200 ${
        isFocused 
          ? 'bg-drac-accent opacity-100' 
          : 'bg-drac-accent opacity-0 group-hover:opacity-40 group-hover:w-0.5'
      }`} />
      
      {/* Column highlights on hover */}
      <div className="absolute inset-0 bg-drac-accent/5 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity" />
      
      {/* Japanese Column */}
      <div 
        className="relative flex items-center min-w-0 z-10" 
        onClick={(e) => handleCopy(e, entry.ja, 'ja')}
      >
        <div className="text-sm font-bold text-drac-text-primary truncate group-hover:text-drac-accent transition-colors w-full" title={entry.ja}>
          <HighlightedText text={entry.ja} query={keyword} />
        </div>
        {copied && copyType === 'ja' && (
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-drac-accent text-drac-bg-primary text-[10px] font-black px-3 py-1 rounded shadow-[0_0_20px_rgba(189,147,249,0.8)] z-[100] border border-drac-bg-primary whitespace-nowrap animate-bounce-in">
            COPIED
          </div>
        )}
      </div>

      {/* English Column */}
      <div 
        className="relative flex items-center min-w-0 z-10" 
        onClick={(e) => handleCopy(e, entry.en, 'en')}
      >
        <div className="text-[13px] font-mono text-drac-text-secondary truncate bg-drac-bg-primary/50 px-2 py-1 rounded border border-drac-border/30 group-hover:border-drac-accent/30 group-hover:text-drac-accent transition-all w-full" title={entry.en}>
          <HighlightedText text={entry.en} query={keyword} />
        </div>
        {copied && copyType === 'en' && (
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-drac-accent text-drac-bg-primary text-[10px] font-black px-3 py-1 rounded shadow-[0_0_20px_rgba(189,147,249,0.8)] z-[100] border border-drac-bg-primary whitespace-nowrap animate-bounce-in">
            COPIED
          </div>
        )}
      </div>

      {/* Table Column */}
      <div className="flex items-center gap-2 text-[10px] font-bold text-drac-purple/80 uppercase tracking-tight bg-drac-purple/10 px-2 py-1 rounded border border-drac-purple/20 truncate z-10" title={entry.source_sheet}>
        <TableIcon size={11} className="shrink-0" />
        <span className="truncate">{entry.source_sheet}</span>
      </div>

      {/* File Column */}
      <div className="flex items-center gap-2 text-[9px] font-medium text-drac-text-secondary/60 truncate group-hover:text-drac-text-secondary transition-colors z-10" title={entry.source_file}>
        <FileText size={11} className="shrink-0 opacity-50" />
        <span className="truncate">{entry.source_file}</span>
      </div>

      {/* Actions */}
      <div className="flex justify-end relative z-10">
        <button 
          className={`p-1.5 rounded-lg border transition-all duration-300 transform hover:scale-110 active:scale-95 ${
            copied && copyType === 'all'
              ? "bg-drac-success text-drac-bg-primary border-drac-success shadow-[0_0_20px_rgba(80,250,123,0.5)]" 
              : "bg-drac-bg-secondary border-drac-border text-drac-text-secondary hover:border-drac-accent hover:text-drac-accent"
          }`} 
          onClick={(e) => handleCopy(e, `${entry.ja}\t${entry.en}`, 'all')}
          title="Copy Both (Tab separated)"
        >
          {copied && copyType === 'all' ? <Check size={14} /> : <Copy size={14} />}
        </button>
        {copied && copyType === 'all' && (
          <div className="absolute -top-10 right-0 bg-drac-success text-drac-bg-primary text-[10px] font-black px-3 py-1 rounded shadow-[0_0_20px_rgba(80,250,123,0.8)] whitespace-nowrap z-[100] border border-drac-bg-primary animate-bounce-in">
            COPIED ALL
          </div>
        )}
      </div>
    </div>
  );
});
  );
});

const SectionHeader = React.memo(({ title, className }: { title: string, className: string }) => {
  return (
    <div className={`px-6 py-3 flex items-center gap-3 bg-drac-bg-primary sticky top-0 z-20`}>
      <div className={`h-3 w-1 rounded-full ${className.includes('success') ? 'bg-drac-success' : 'bg-drac-accent'}`} />
      <span className={`text-[10px] font-black uppercase tracking-[0.3em] ${className}`}>
        {title}
      </span>
      <div className="h-px flex-1 bg-gradient-to-r from-drac-border/50 to-transparent" />
    </div>
  );
});

export function ResultList({ results, keyword }: ResultListProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);

  const rows = useMemo(() => {
    if (!results) return [];
    
    const flattened: RowType[] = [];
    
    if (results.exact.length > 0) {
      flattened.push({ type: 'header', title: 'Exact Matches', colorClass: 'text-drac-success' });
      results.exact.forEach(entry => flattened.push({ type: 'entry', entry, isExact: true }));
    }
    
    if (results.prefix.length > 0) {
      flattened.push({ type: 'header', title: 'Prefix Matches', colorClass: 'text-drac-accent' });
      results.prefix.forEach(entry => flattened.push({ type: 'entry', entry, isExact: false }));
    }
    
    if (results.substring.length > 0) {
      flattened.push({ type: 'header', title: 'Partial Matches', colorClass: 'text-drac-text-secondary' });
      results.substring.forEach(entry => flattened.push({ type: 'entry', entry, isExact: false }));
    }
    
    return flattened;
  }, [results]);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => rows[index].type === 'header' ? 40 : 44,
    overscan: 15,
  });

  if (!keyword) {
    return (
      <div className="flex flex-col items-center justify-center p-16 h-full text-center animate-fade-in">
        <div className="w-16 h-16 bg-drac-accent/10 rounded-2xl flex items-center justify-center mb-6 border border-drac-accent/20">
          <Languages size={32} className="text-drac-accent" />
        </div>
        <h2 className="text-xl font-black text-drac-text-primary tracking-tight mb-2 uppercase">NEURAL SEARCH READY</h2>
        <p className="text-drac-text-secondary/70 text-xs max-w-xs leading-relaxed">
          Type keywords in the search bar to access the cross-path translation matrix.
        </p>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-16 h-full text-center animate-fade-in">
        <div className="w-16 h-16 bg-drac-error/10 rounded-2xl flex items-center justify-center mb-6 border border-drac-error/20">
          <TableIcon size={32} className="text-drac-error opacity-50" />
        </div>
        <h2 className="text-lg font-bold text-drac-text-primary mb-2 uppercase tracking-wide">ZERO MATCHES</h2>
        <p className="text-drac-text-secondary text-xs">
          No records found for <span className="text-drac-accent font-mono">"{keyword}"</span>
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Grid Headers */}
      <div className={`${GRID_LAYOUT} py-2 bg-drac-bg-secondary/50 border-b border-drac-border sticky top-0 z-30 backdrop-blur-md`}>
        <span className="text-[9px] font-black text-drac-text-secondary/60 uppercase tracking-[0.2em]">Original (JA)</span>
        <span className="text-[9px] font-black text-drac-text-secondary/60 uppercase tracking-[0.2em]">Translation (EN)</span>
        <span className="text-[9px] font-black text-drac-text-secondary/60 uppercase tracking-[0.2em]">Table / Sheet</span>
        <span className="text-[9px] font-black text-drac-text-secondary/60 uppercase tracking-[0.2em]">Source File</span>
        <div />
      </div>

      <div ref={parentRef} className="flex-1 overflow-y-auto scrollbar-dracula relative">
        <div style={{ height: `${virtualizer.getTotalSize()}px`, position: "relative", width: "100%" }}>
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const row = rows[virtualRow.index];
            const rowId = row.type === 'entry' ? `${row.entry.ja}-${row.entry.en}-${row.entry.source_sheet}` : null;
            
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
                  <ResultItem 
                    entry={row.entry} 
                    keyword={keyword} 
                    isExact={row.isExact} 
                    isFocused={focusedId === rowId}
                    onFocus={() => rowId && setFocusedId(rowId)}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
