import { useState, useCallback, useEffect, useRef } from "react";
import { SheetMeta } from "./use-dictionary";
import { DetectionResult, detectTableNames } from "../lib/table-name-detector";

/**
 * Hook to manage auto-detection of table names on paste.
 * Now fully automatic: detects and applies without user intervention.
 */
export function useAutoTableDetect(
  knownSheets: SheetMeta[],
  activeSelection: Set<string>,
  onSelectionAdd: (sheetNames: string[]) => Promise<void>,
  onSelectionRemove: (sheetNames: string[]) => Promise<void>,
) {
  const [detectionResult, setDetectionResult] = useState<DetectionResult | null>(null);
  const [excludedTables, setExcludedTables] = useState<Set<string>>(new Set());
  const lastAppliedRef = useRef<string[]>([]);
  
  const debounceTimerRef = useRef<number | null>(null);

  const handleInput = useCallback(async (text: string) => {
    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = window.setTimeout(async () => {
      const result = detectTableNames(text, knownSheets, activeSelection);
      
      // Find what's actually new in this specific input
      const matchedNames = result.matched.map(t => t.tableName);
      
      // 1. Identify tables that are no longer in this text (to be removed)
      const toRemove = lastAppliedRef.current.filter(name => !matchedNames.includes(name));
      if (toRemove.length > 0) {
        await onSelectionRemove(toRemove);
      }

      // 2. Identify tables that are newly found in this text (to be added)
      // Respect user exclusion: don't add if user manually removed it
      const toAdd = matchedNames.filter(name => 
        !lastAppliedRef.current.includes(name) && !excludedTables.has(name)
      );
      
      if (toAdd.length > 0) {
        await onSelectionAdd(toAdd);
      }

      lastAppliedRef.current = matchedNames;

      // Show banner only if we have active matches or unmatched warnings
      if (result.matched.length > 0 || result.unmatched.length > 0) {
        setDetectionResult(result);
      } else {
        setDetectionResult(null);
      }
      debounceTimerRef.current = null;
    }, 300);
  }, [knownSheets, activeSelection, onSelectionAdd, onSelectionRemove, excludedTables]);

  const toggleExclusion = useCallback(async (tableName: string) => {
    const isExcluded = excludedTables.has(tableName);
    
    if (isExcluded) {
      setExcludedTables(prev => {
        const next = new Set(prev);
        next.delete(tableName);
        return next;
      });
      // Re-add to auto selection when un-excluding
      await onSelectionAdd([tableName]);
    } else {
      setExcludedTables(prev => {
        const next = new Set(prev);
        next.add(tableName);
        return next;
      });
      // Remove from active selection immediately when excluding
      await onSelectionRemove([tableName]);
    }
  }, [excludedTables, onSelectionAdd, onSelectionRemove]);

  const dismissBanner = useCallback(() => {
    setDetectionResult(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (lastAppliedRef.current.length > 0) {
        onSelectionRemove(lastAppliedRef.current);
      }
    };
  }, [onSelectionRemove]);

  return {
    detectionResult,
    handleInput,
    dismissBanner,
    toggleExclusion,
    excludedTables,
  };
}
