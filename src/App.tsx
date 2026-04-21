import { useState, useEffect } from "react";
import { useDictionary, SearchResult } from "./hooks/useDictionary";
import { FileManager } from "./components/FileManager";
import { SearchBox } from "./components/SearchBox";
import { ResultList } from "./components/ResultList";
import { BulkTranslator } from "./components/BulkTranslator";
import { SQLAnalyzerTab } from "./components/SQLAnalyzerTab";
import { SQLResolverTab } from "./components/SQLResolverTab";
import { SQLVisualizerTab } from "./components/SQLVisualizerTab";
import { TableSelectorPanel } from "./components/TableSelectorPanel";
import { useTableSelection } from "./hooks/useTableSelection";

type ViewMode = "dictionary" | "translator" | "analyzer" | "resolver" | "visualizer";

import { useParseProgress } from "./hooks/useParseProgress";
import { ParseProgressBar } from "./components/ParseProgressBar";
import { SplashLoading } from "./components/SplashLoading";

function App() {
  const { progress, startProgress, resetProgress } = useParseProgress();
  const { 
    files, 
    isLoading, 
    loadFiles,
    loadFilesByPath: originalLoadFilesByPath,
    removeFile, 
    resetDictionary, 
    reloadFiles,
    reloadFile,
    search,
    toggleFileEnabled,
    toggleAllFiles
  } = useDictionary();

  // Show splash only on initial empty load
  const isInitialLoading = isLoading && files.length === 0;

  const loadFilesByPath = async (paths: string[], selectedSheets: string[] = []) => {
    if (paths.length === 0) return;
    try {
      startProgress();
      await originalLoadFilesByPath(paths, selectedSheets);
    } finally {
      resetProgress();
    }
  };

  const handleLoadFiles = async () => {
    try {
      startProgress();
      await loadFiles();
    } finally {
      resetProgress();
    }
  };

  const {
    scanResult,
    selectedSheets,
    isCollapsed,
    setIsCollapsed,
    isApplying,
    toggleSheet,
    toggleAllVisible,
    refreshScan
  } = useTableSelection(files);

  const [isSearching, setIsSearching] = useState(false);
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

  if (isInitialLoading) {
    return <SplashLoading />;
  }

  return (
    <div className="flex h-screen font-outfit text-drac-text-primary bg-drac-bg-primary overflow-hidden">
      <FileManager 
        files={files}
        isLoading={isLoading}
        onLoadFiles={handleLoadFiles}
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
            
            <div className="flex-1 overflow-hidden relative">
              {isSearching && (
                <div className="absolute inset-0 bg-drac-bg-primary/50 backdrop-blur-[2px] z-10 flex items-center justify-center animate-fade-in">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-4 border-drac-accent border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-drac-accent font-bold text-sm tracking-widest animate-pulse">SEARCHING DICTIONARY...</span>
                  </div>
                </div>
              )}
              <ResultList 
                results={results}
                keyword={keyword}
              />
            </div>
          </div>
        )}

        {viewMode === "translator" && (
          <BulkTranslator 
            disabled={files.length === 0} 
            scanResult={scanResult}
            selectedSheets={selectedSheets}
            onToggleSheet={toggleSheet}
          />
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

      {viewMode === "translator" && (
        <TableSelectorPanel 
          scanResult={scanResult}
          selectedSheets={selectedSheets}
          onToggleSheet={toggleSheet}
          onToggleAll={toggleAllVisible}
          onRefresh={refreshScan}
          isCollapsed={isCollapsed}
          onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
          isApplying={isApplying}
        />
      )}

      <ParseProgressBar progress={progress} />
    </div>
  );
}

export default App;
