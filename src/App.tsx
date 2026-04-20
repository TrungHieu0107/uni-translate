import { useState, useEffect } from "react";
import { useDictionary, SearchResult } from "./hooks/useDictionary";
import { FileManager } from "./components/FileManager";
import { SearchBox } from "./components/SearchBox";
import { ResultList } from "./components/ResultList";
import { BulkTranslator } from "./components/BulkTranslator";
import { SQLAnalyzerTab } from "./components/SQLAnalyzerTab";
import { SQLResolverTab } from "./components/SQLResolverTab";
import { SQLVisualizerTab } from "./components/SQLVisualizerTab";

type ViewMode = "dictionary" | "translator" | "analyzer" | "resolver" | "visualizer";

function App() {
  const { 
    files, 
    isLoading, 
    loadFiles,
    loadFilesByPath,
    removeFile, 
    resetDictionary, 
    reloadFiles,
    reloadFile,
    search,
    toggleFileEnabled,
    toggleAllFiles
  } = useDictionary();

  const [keyword, setKeyword] = useState("");
  const [results, setResults] = useState<SearchResult | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(() => (localStorage.getItem("app_viewMode") as ViewMode) || "dictionary");

  useEffect(() => {
    localStorage.setItem("app_viewMode", viewMode);
  }, [viewMode]);

  useEffect(() => {
    let active = true;
    
    if (!keyword) {
      setResults(null);
      return;
    }

    const performSearch = async () => {
      const res = await search(keyword);
      if (active) {
        setResults(res);
      }
    };

    performSearch();

    return () => {
      active = false;
    };
  }, [keyword, search, files]);

  return (
    <div className="flex h-screen font-outfit text-drac-text-primary bg-drac-bg-primary overflow-hidden">
      <FileManager 
        files={files}
        isLoading={isLoading}
        onLoadFiles={loadFiles}
        onLoadFilesByPath={loadFilesByPath}
        onRemoveFile={removeFile}
        onToggleFileEnabled={toggleFileEnabled}
        onToggleAllFiles={toggleAllFiles}
        onReset={resetDictionary}
        onReload={reloadFiles}
        onReloadFile={reloadFile}
      />
      
      <main className="flex-1 flex flex-col bg-drac-bg-primary relative min-w-0">
        {/* App Top Tabs */}
        <div className="flex bg-drac-bg-secondary border-b border-drac-border px-4 py-2 gap-2 shrink-0">
          <button 
            className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${viewMode === "dictionary" ? "bg-drac-bg-tertiary text-drac-accent" : "text-drac-text-secondary hover:text-drac-text-primary"}`}
            onClick={() => setViewMode("dictionary")}
          >
            Dictionary Search
          </button>
          <button 
            className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${viewMode === "translator" ? "bg-drac-bg-tertiary text-drac-accent" : "text-drac-text-secondary hover:text-drac-text-primary"}`}
            onClick={() => setViewMode("translator")}
          >
            Bulk Text Translator
          </button>
          <button 
            className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${viewMode === "analyzer" ? "bg-drac-bg-tertiary text-drac-accent" : "text-drac-text-secondary hover:text-drac-text-primary"}`}
            onClick={() => setViewMode("analyzer")}
          >
            SQL Analyzer
          </button>
          <button 
            className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${viewMode === "resolver" ? "bg-drac-bg-tertiary text-drac-accent" : "text-drac-text-secondary hover:text-drac-text-primary"}`}
            onClick={() => setViewMode("resolver")}
          >
            SQL Resolver
          </button>
          <button 
            className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${viewMode === "visualizer" ? "bg-drac-bg-tertiary text-drac-accent" : "text-drac-text-secondary hover:text-drac-text-primary"}`}
            onClick={() => setViewMode("visualizer")}
          >
            SQL Visualizer
          </button>
        </div>

        {viewMode === "dictionary" && (
          <div className="flex-1 flex flex-col min-h-0">
            <SearchBox 
              onSearch={setKeyword}
              disabled={files.length === 0}
            />
            
            <div className="flex-1 overflow-hidden">
              <ResultList 
                results={results}
                keyword={keyword}
              />
            </div>
          </div>
        )}

        {viewMode === "translator" && (
          <BulkTranslator disabled={files.length === 0} />
        )}

        {viewMode === "analyzer" && (
          <SQLAnalyzerTab />
        )}

        {viewMode === "resolver" && (
          <SQLResolverTab />
        )}

        {viewMode === "visualizer" && (
          <SQLVisualizerTab />
        )}
      </main>
    </div>
  );
}

export default App;
