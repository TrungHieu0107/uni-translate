import { useState, useEffect } from "react";
import { SearchBox } from "./search-box";
import { ResultList } from "./result-list";
import { SearchResult } from "../hooks/use-dictionary";
import { LoadingOverlay } from "./ui/loading-overlay";

interface DictionaryTabProps {
  files: any[];
  search: (keyword: string) => Promise<SearchResult>;
}

export function DictionaryTab({ files, search }: DictionaryTabProps) {
  const [isSearching, setIsSearching] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [results, setResults] = useState<SearchResult | null>(null);

  useEffect(() => {
    let active = true;
    
    if (!keyword) {
      setResults(null);
      setIsSearching(false);
      return;
    }

    const performSearch = async () => {
      setIsSearching(true);
      try {
        const res = await search(keyword);
        if (active) {
          setResults(res);
        }
      } finally {
        if (active) setIsSearching(false);
      }
    };

    performSearch();

    return () => {
      active = false;
    };
  }, [keyword, search, files]);

  return (
    <div className="flex-1 flex flex-col min-h-0 relative">
      <SearchBox 
        onSearch={setKeyword}
        disabled={files.length === 0}
      />
      
      <div className="flex-1 overflow-hidden relative">
        <LoadingOverlay 
          visible={isSearching} 
          message="Searching Index..."
          subMessage="Direct Memory Access"
        />
        <ResultList 
          results={results}
          keyword={keyword}
        />
      </div>
    </div>
  );
}
