import React, { useMemo, forwardRef } from 'react';

interface MatchSpan {
  start: number;
  end: number;
  match_id: number;
}

interface SegmentedViewerProps {
  text: string;
  spans: MatchSpan[];
  className?: string;
  placeholder?: string;
  onManualClick?: () => void;
  hoverMatchId: number | null;
  setHoverMatchId: (id: number | null) => void;
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
}

export const SegmentedViewer = React.memo(forwardRef<HTMLDivElement, SegmentedViewerProps>(
  ({ text, spans, className = '', placeholder, onManualClick, hoverMatchId, setHoverMatchId, onScroll }, ref) => {
    const elements = useMemo(() => {
      if (!text && placeholder) return null;

      const result: React.ReactNode[] = [];
      let lastPos = 0;

      spans.forEach((span, idx) => {
        // Add plain text before match
        if (span.start > lastPos) {
          result.push(<span key={`p-${idx}`}>{text.slice(lastPos, span.start)}</span>);
        }
        // Add highlighted match
        result.push(
          <span
            key={`m-${idx}`}
            className={`transition-all duration-150 rounded text-drac-accent font-bold cursor-help ${
              hoverMatchId !== null && span.match_id === hoverMatchId 
                ? "bg-drac-accent/30 text-drac-accent-hover ring-1 ring-drac-accent/50" 
                : ""
            }`}
            onMouseEnter={() => setHoverMatchId(span.match_id)}
            onMouseLeave={() => setHoverMatchId(null)}
          >
            {text.slice(span.start, span.end)}
          </span>
        );
        lastPos = span.end;
      });

      // Add remaining text
      if (lastPos < text.length) {
        result.push(<span key="final">{text.slice(lastPos)}</span>);
      }
      return result;
    }, [text, spans, placeholder, hoverMatchId, setHoverMatchId]);

    if (!text && placeholder) {
      return (
        <div className={`p-4 text-drac-text-secondary italic text-sm ${className}`} onClick={onManualClick}>
          {placeholder}
        </div>
      );
    }

    return (
      <div 
        ref={ref}
        className={`p-3 font-mono text-sm leading-relaxed whitespace-pre-wrap break-words overflow-y-auto scrollbar-dracula ${className}`}
        onClick={onManualClick}
        onScroll={onScroll}
      >
        {elements}
      </div>
    );
  })
);

SegmentedViewer.displayName = "SegmentedViewer";
