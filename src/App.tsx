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

  const handleReloadFiles = async () => {
    try {
      startProgress();
      await reloadFiles();
    } finally {
      resetProgress();
    }
  };

  const handleReloadFile = async (path: string) => {
    try {
      startProgress();
      await reloadFile(path);
    } finally {
      resetProgress();
    }
  };

  const {
    scanResult,
    selectedSheets,
    manualSelectedSheets,
    isCollapsed,
    setIsCollapsed,
    isApplying,
    isApplyingManual,
    toggleSheet,
    toggleAllVisible,
    refreshScan,
    addAutoSelection,
    forceRemoveSelection,
    error: tableError,
    clearError: clearTableError
  } = useTableSelection(files);

  const [isSearching, setIsSearching] = useState(false);
  const [internalLoading, setInternalLoading] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);

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

  useEffect(() => {
    if (isSearching) {
      setInternalLoading(true);
      setIsFadingOut(false);
    } else if (internalLoading) {
      // Data has arrived. Wait for DOM update & paint.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsFadingOut(true);
          setTimeout(() => {
            setInternalLoading(false);
            setIsFadingOut(false);
          }, 400); // 400ms transition duration
        });
      });
    }
  }, [isSearching, internalLoading]);

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
        onReload={handleReloadFiles}
        onReloadFile={handleReloadFile}
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
              {internalLoading && (
                <div className={`absolute inset-0 bg-drac-bg-primary/80 backdrop-blur-md z-20 flex flex-col items-center justify-center overflow-hidden transition-all duration-400 ease-out ${isFadingOut ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'}`}>
                  {/* Cyber Grid Background */}
                  <div className="absolute inset-0 bg-[linear-gradient(rgba(139,233,253,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(139,233,253,0.05)_1px,transparent_1px)] bg-[size:20px_20px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_10%,transparent_100%)]" />
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-drac-text-secondary/10 to-transparent h-32 w-full animate-scanline opacity-40" />
                  
                  <div className="relative flex flex-col items-center justify-center p-10">
                    <div className="relative w-28 h-28 flex items-center justify-center">
                      {/* Outer Rings */}
                      <svg className="absolute inset-0 w-full h-full text-drac-text-secondary/30 drop-shadow-[0_0_15px_rgba(139,233,253,0.5)]" viewBox="0 0 100 100" style={{ animation: 'spin 5s linear infinite' }}>
                        <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="15 5 20 10" />
                        <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="60 30" opacity="0.6" />
                      </svg>
                      
                      {/* Inner Ring */}
                      <svg className="absolute inset-3 w-22 h-22 text-drac-accent/60" viewBox="0 0 100 100" style={{ animation: 'spin 3s linear infinite reverse' }}>
                        <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="10 20 5 10" />
                      </svg>
                      
                      {/* Center Core */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-12 h-12 bg-drac-text-secondary/20 rounded-full blur-xl animate-pulse-glow absolute" />
                        <div className="w-6 h-6 border-2 border-drac-text-secondary rounded-sm rotate-45 animate-pulse drop-shadow-[0_0_10px_rgba(139,233,253,1)]" />
                      </div>
                    </div>
                    
                    {/* Status Text Area */}
                    <div className="mt-8 flex flex-col items-center gap-2">
                      <div className="flex items-center gap-3">
                        <div className="h-px w-10 bg-gradient-to-r from-transparent to-drac-text-secondary/80" />
                        <span className="text-[12px] font-black tracking-[0.5em] text-drac-text-secondary animate-pulse uppercase drop-shadow-[0_0_8px_rgba(139,233,253,0.8)]">
                          Searching Index
                        </span>
                        <div className="h-px w-10 bg-gradient-to-l from-transparent to-drac-text-secondary/80" />
                      </div>
                      
                      {/* Data Stream */}
                      <div className="flex gap-1.5 opacity-80">
                        <div className="w-2 h-1.5 bg-drac-text-secondary rounded-sm animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-1.5 bg-drac-text-secondary rounded-sm animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-1.5 bg-drac-text-secondary rounded-sm animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                      <span className="text-[9px] font-mono font-bold text-drac-text-secondary/60 tracking-[0.4em] uppercase mt-2">
                        Direct Memory Access
                      </span>
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
            onAutoRemove={forceRemoveSelection}
            isApplying={isApplying && !progress}
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
          selectedSheets={manualSelectedSheets}
          onToggleSheet={toggleSheet}
          onToggleAll={toggleAllVisible}
          onRefresh={refreshScan}
          isCollapsed={isCollapsed}
          onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
          isApplying={isApplying}
          isApplyingManual={isApplyingManual}
        />
      )}

      <ParseProgressBar progress={progress} />
    </div>
  );
}

export default App;
