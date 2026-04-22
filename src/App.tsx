import { useState, useEffect } from "react";
import { useDictionary } from "./hooks/use-dictionary";
import { FileManager } from "./components/file-manager";
import { BulkTranslator } from "./components/bulk-translator";
import { SQLAnalyzerTab } from "./components/sql-analyzer-tab";
import { SQLResolverTab } from "./components/sql-resolver-tab";
import { SQLVisualizerTab } from "./components/sql-visualizer-tab";
import { DictionaryTab } from "./components/dictionary-tab";
import { TableSelectorPanel } from "./components/table-selector-panel";
import { useTableSelection } from "./hooks/use-table-selection";
import { useParseProgress } from "./hooks/use-parse-progress";
import { ParseProgressBar } from "./components/parse-progress-bar";
import { SplashLoading } from "./components/splash-loading";
import { Button } from "./components/ui/button";

type ViewMode = "dictionary" | "translator" | "analyzer" | "resolver" | "visualizer";

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

  const [viewMode, setViewMode] = useState<ViewMode>(() => (localStorage.getItem("app_viewMode") as ViewMode) || "dictionary");

  useEffect(() => {
    localStorage.setItem("app_viewMode", viewMode);
  }, [viewMode]);

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
          <div className="bg-drac-danger/20 border-b border-drac-danger/30 px-6 py-2.5 flex items-center justify-between shrink-0 animate-slide-up">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-drac-danger animate-pulse" />
              <span className="text-drac-danger text-sm font-bold uppercase tracking-tight">
                {dictError || tableError}
              </span>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => { clearDictError(); clearTableError(); }}
              className="text-drac-danger hover:bg-drac-danger/10"
            >
              Dismiss
            </Button>
          </div>
        )}

        {/* App Navigation Tabs */}
        <nav className="flex bg-drac-bg-secondary border-b border-drac-border px-6 py-2 gap-1 shrink-0 overflow-x-auto no-scrollbar">
          <Button
            variant={viewMode === "dictionary" ? "accent" : "ghost"}
            size="sm"
            onClick={() => setViewMode("dictionary")}
            className="rounded-full px-5 h-9"
          >
            Dictionary
          </Button>
          <Button
            variant={viewMode === "translator" ? "accent" : "ghost"}
            size="sm"
            onClick={() => setViewMode("translator")}
            className="rounded-full px-5 h-9"
          >
            Bulk Translator
          </Button>
          <Button
            variant={viewMode === "analyzer" ? "accent" : "ghost"}
            size="sm"
            onClick={() => setViewMode("analyzer")}
            className="rounded-full px-5 h-9"
          >
            SQL Analyzer
          </Button>
          <Button
            variant={viewMode === "resolver" ? "accent" : "ghost"}
            size="sm"
            onClick={() => setViewMode("resolver")}
            className="rounded-full px-5 h-9"
          >
            SQL Resolver
          </Button>
          <Button
            variant={viewMode === "visualizer" ? "accent" : "ghost"}
            size="sm"
            onClick={() => setViewMode("visualizer")}
            className="rounded-full px-5 h-9"
          >
            SQL Visualizer
          </Button>
        </nav>

        {viewMode === "dictionary" && (
          <DictionaryTab files={files} search={search} />
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

export default App;
