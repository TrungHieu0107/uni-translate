import React, { useMemo } from 'react';

interface HighlightedTextProps {
  text: string;
  query: string;
}

const HighlightedText: React.FC<HighlightedTextProps> = React.memo(({ text, query }) => {
  const parts = useMemo(() => {
    if (!query.trim()) return [{ text, highlight: false }];
    
    try {
      // Escape special characters for regex
      const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(${escapedQuery})`, 'gi');
      
      return text.split(regex).map((part, i) => ({
        text: part,
        highlight: i % 2 === 1,
      }));
    } catch (e) {
      return [{ text, highlight: false }];
    }
  }, [text, query]);

  return (
    <>
      {parts.map((part, i) => (
        part.highlight ? (
          <span key={i} className="bg-drac-accent/30 text-drac-accent-hover rounded-[2px] font-bold">
            {part.text}
          </span>
        ) : (
          <span key={i}>{part.text}</span>
        )
      ))}
    </>
  );
});

export default HighlightedText;
