import { useState, useCallback, useEffect } from "react";
import { ScanResult, FileInfo, useDictionary } from "./useDictionary";

export function useTableSelection(files: FileInfo[]) {
  const { 
    scanExcelSheets, 
    updateTableSelection, 
    getActiveSheets,
    isLoading: isDictionaryLoading 
  } = useDictionary();
  
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [selectedSheets, setSelectedSheets] = useState<string[]>([]);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem("table_selector_collapsed") === "true";
  });
  const [isApplying, setIsApplying] = useState(false);

  useEffect(() => {
    localStorage.setItem("table_selector_collapsed", String(isCollapsed));
  }, [isCollapsed]);

  // Initial load: scan existing files and get active selection
  // Only re-scan if the list of paths changes (upload/unload/manual reload)
  const pathsKey = files.map(f => `${f.path}:${f.enabled}`).sort().join(',');
  
  useEffect(() => {
    const init = async () => {
      // We still use files.filter(f => f.enabled) to determine what to scan
      // but the EFFECT only triggers when the global paths change
      const activeFiles = files.filter(f => f.enabled);
      if (activeFiles.length > 0) {
        try {
          const paths = activeFiles.map(f => f.path);
          const scan = await scanExcelSheets(paths);
          setScanResult(scan);
          
          const active = await getActiveSheets();
          setSelectedSheets(active);
        } catch (err) {
          console.error("Failed to initialize table selection", err);
        }
      } else {
        setScanResult(null);
      }
    };
    init();
  }, [pathsKey]); // Only re-run when paths change

  const toggleSheet = useCallback((cacheKey: string) => {
    setSelectedSheets(prev => 
      prev.includes(cacheKey) ? prev.filter(k => k !== cacheKey) : [...prev, cacheKey]
    );
  }, []);

  const toggleAllVisible = useCallback((visibleKeys: string[], shouldSelect: boolean) => {
    setSelectedSheets(prev => {
      const otherKeys = prev.filter(k => !visibleKeys.includes(k));
      return shouldSelect ? [...otherKeys, ...visibleKeys] : otherKeys;
    });
  }, []);

  const applySelection = useCallback(async (currentSelection: string[]) => {
    try {
      setIsApplying(true);
      await updateTableSelection(currentSelection);
    } catch (err) {
      console.error("Failed to apply selection", err);
    } finally {
      setIsApplying(false);
    }
  }, [updateTableSelection]);

  // Auto-apply logic: whenever selectedSheets changes, trigger apply after a debounce
  useEffect(() => {
    // Skip the very first run if selection is empty or already handled by init
    if (selectedSheets.length === 0 && scanResult === null) return;
    
    const handler = setTimeout(() => {
      applySelection(selectedSheets);
    }, 600); // 600ms debounce

    return () => clearTimeout(handler);
  }, [selectedSheets, applySelection, scanResult === null]);

  const refreshScan = useCallback(async () => {
    if (files.length === 0) return;
    try {
      setIsApplying(true);
      const paths = files.map(f => f.path);
      const scan = await scanExcelSheets(paths);
      setScanResult(scan);
      
      const active = await getActiveSheets();
      setSelectedSheets(active);
    } catch (err) {
      console.error("Failed to refresh table selection", err);
    } finally {
      setIsApplying(false);
    }
  }, [files, scanExcelSheets, getActiveSheets]);

  return {
    scanResult,
    selectedSheets,
    isCollapsed,
    setIsCollapsed,
    isApplying: isApplying || isDictionaryLoading,
    toggleSheet,
    toggleAllVisible,
    applySelection: () => applySelection(selectedSheets),
    refreshScan,
    setSelectedSheets
  };
}
