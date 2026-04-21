import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { ScanResult, FileInfo, useDictionary, SheetMeta } from "./use-dictionary";

export function useTableSelection(files: FileInfo[]) {
  const { 
    scanExcelSheets, 
    updateTableSelection, 
    getActiveSheets,
    isLoading: isDictionaryLoading 
  } = useDictionary();
  
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const clearError = useCallback(() => setError(null), []);
  
  const knownSheets = useMemo(() => {
    if (!scanResult) return [];
    const all: SheetMeta[] = [];
    scanResult.files.forEach((f: any) => {
      f.table_sheets.forEach((s: SheetMeta) => all.push(s));
    });
    return all;
  }, [scanResult]);
  const [autoSelectionCounts, setAutoSelectionCounts] = useState<Map<string, number>>(new Map());
  const [manualSelectedSheets, setManualSelectedSheets] = useState<string[]>([]);

  // Union of manual and auto-detected sheets
  const selectedSheets = useMemo(() => {
    const autoSheets = Array.from(autoSelectionCounts.keys());
    const union = new Set([...manualSelectedSheets, ...autoSheets]);
    return Array.from(union);
  }, [manualSelectedSheets, autoSelectionCounts]);

  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem("table_selector_collapsed") === "true";
  });
  const [isApplying, setIsApplying] = useState(false);

  useEffect(() => {
    localStorage.setItem("table_selector_collapsed", String(isCollapsed));
  }, [isCollapsed]);

  // Initial load: scan existing files and get active selection
  const pathsKey = files.map(f => `${f.path}:${f.enabled}`).sort().join(',');
  
  useEffect(() => {
    const init = async () => {
      const activeFiles = files.filter(f => f.enabled);
      if (activeFiles.length > 0) {
        try {
          const paths = activeFiles.map(f => f.path);
          const scan = await scanExcelSheets(paths);
          setScanResult(scan);
          
          const active = await getActiveSheets();
          lastAppliedRef.current = [...active].sort().join('|');
          setManualSelectedSheets(active);
        } catch (err: any) {
          console.error("Failed to initialize table selection", err);
          setError(err.toString());
        }
      } else {
        setScanResult(null);
      }
    };
    init();
  }, [pathsKey]);

  const toggleSheet = useCallback((cacheKey: string) => {
    setManualSelectedSheets(prev => 
      prev.includes(cacheKey) ? prev.filter(k => k !== cacheKey) : [...prev, cacheKey]
    );
  }, []);

  const toggleAllVisible = useCallback((visibleKeys: string[], shouldSelect: boolean) => {
    setManualSelectedSheets(prev => {
      const otherKeys = prev.filter(k => !visibleKeys.includes(k));
      return shouldSelect ? [...otherKeys, ...visibleKeys] : otherKeys;
    });
  }, []);

  const addAutoSelection = useCallback(async (sheetNames: string[]) => {
    const cacheKeys = sheetNames.map(name => {
      const found = knownSheets.find(s => s.name === name);
      return found?.cache_key;
    }).filter(Boolean) as string[];

    if (cacheKeys.length === 0) return;

    setAutoSelectionCounts(prev => {
      const next = new Map(prev);
      cacheKeys.forEach(key => {
        next.set(key, (next.get(key) || 0) + 1);
      });
      return next;
    });
  }, [knownSheets]);

  const removeAutoSelection = useCallback(async (sheetNames: string[]) => {
    const cacheKeys = sheetNames.map(name => {
      const found = knownSheets.find(s => s.name === name);
      return found?.cache_key;
    }).filter(Boolean) as string[];

    if (cacheKeys.length === 0) return;

    setAutoSelectionCounts(prev => {
      const next = new Map(prev);
      cacheKeys.forEach(key => {
        const count = next.get(key) || 0;
        if (count <= 1) {
          next.delete(key);
        } else {
          next.set(key, count - 1);
        }
      });
      return next;
    });
  }, [knownSheets]);
  const applySelection = useCallback(async (currentSelection: string[]) => {
    try {
      setIsApplying(true);
      await updateTableSelection(currentSelection);
    } catch (err: any) {
      console.error("Failed to apply selection", err);
      setError(err.toString());
    } finally {
      setIsApplying(false);
    }
  }, [updateTableSelection]);

  const debounceRef = useRef<number | null>(null);
  const pendingRef = useRef<string[]>([]);
  const lastAppliedRef = useRef<string>("");

  // Auto-apply logic: whenever selectedSheets changes, trigger apply after a debounce
  useEffect(() => {
    if (selectedSheets.length === 0 && scanResult === null) {
      // If we cleared everything, we should still tell the backend
      if (lastAppliedRef.current !== "") {
        applySelection([]);
        lastAppliedRef.current = "";
      }
      return;
    }
    
    const currentKey = [...selectedSheets].sort().join('|');
    if (currentKey === lastAppliedRef.current) return;

    pendingRef.current = selectedSheets;
    if (debounceRef.current) window.clearTimeout(debounceRef.current);

    debounceRef.current = window.setTimeout(() => {
      lastAppliedRef.current = currentKey;
      applySelection(pendingRef.current);
    }, 400); // Slightly faster debounce for auto-apply

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [selectedSheets, applySelection, scanResult === null]);

  const refreshScan = useCallback(async () => {
    if (files.length === 0) return;
    try {
      setIsApplying(true);
      const paths = files.map(f => f.path);
      const scan = await scanExcelSheets(paths);
      setScanResult(scan);
      
      const active = await getActiveSheets();
      setManualSelectedSheets(active);
    } catch (err: any) {
      console.error("Failed to refresh table selection", err);
      setError(err.toString());
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
    refreshScan,
    addAutoSelection,
    removeAutoSelection,
    setManualSelectedSheets,
    error,
    clearError
  };
}
