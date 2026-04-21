import { useState, useEffect } from "react";
import { useDictionary, SearchResult } from "./hooks/use-dictionary";
import { FileManager } from "./components/file-manager";
import { SearchBox } from "./components/search-box";
import { ResultList } from "./components/result-list";
import { BulkTranslator } from "./components/bulk-translator";
import { SQLAnalyzerTab } from "./components/sql-analyzer-tab";
import { SQLResolverTab } from "./components/sql-resolver-tab";
import { SQLVisualizerTab } from "./components/sql-visualizer-tab";
import { TableSelectorPanel } from "./components/table-selector-panel";
import { useTableSelection } from "./hooks/use-table-selection";

type ViewMode = "dictionary" | "translator" | "analyzer" | "resolver" | "visualizer";

import { useParseProgress } from "./hooks/use-parse-progress";
import { ParseProgressBar } from "./components/parse-progress-bar";
import { SplashLoading } from "./components/splash-loading";

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
    toggleAllFiles,
    error: dictError,
    clearError: clearDictError
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
    refreshScan,
    addAutoSelection,
    removeAutoSelection,
    error: tableError,
    clearError: clearTableError
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
        {(dictError || tableError) && (
          <div className="bg-red-500/10 border-b border-red-500/20 px-4 py-2 flex items-center justify-between shrink-0">
            <span className="text-red-400 text-sm font-medium">
              {dictError || tableError}
            </span>
            <button 
              onClick={() => { clearDictError(); clearTableError(); }}
              className="text-red-400 hover:text-red-300 text-sm p-1"
            >
              Dismiss
            </button>
          </div>
        )}
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
                <div className="absolute inset-0 bg-drac-bg-primary/20 backdrop-blur-[3px] z-10 flex items-center justify-center animate-fade-in pointer-events-none">
                  <div className="bg-drac-bg-secondary/60 p-8 rounded-3xl border border-drac-accent/30 shadow-2xl backdrop-blur-xl flex flex-col items-center gap-4">
                    <div className="relative">
                      <div className="w-12 h-12 border-2 border-drac-accent/30 rounded-full animate-ping opacity-20"></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-8 h-8 border-4 border-drac-accent border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] font-black tracking-[0.5em] text-drac-accent animate-pulse uppercase">Searching Index</span>
                      <span className="text-[8px] font-bold text-drac-text-secondary/50 tracking-widest uppercase mt-1">Direct Memory Access</span>
                    </div>
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
            onAutoAdd={addAutoSelection}
            onAutoRemove={removeAutoSelection}
            isApplying={isApplying}
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
