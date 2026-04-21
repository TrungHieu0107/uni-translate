import { useState, useCallback } from "react";
import { SheetMeta } from "./useDictionary";
import { DetectionResult, detectTableNames } from "../lib/tableNameDetector";

/**
 * Hook to manage auto-detection of table names on paste.
 */
export function useAutoTableDetect(
  knownSheets: SheetMeta[],
  activeSelection: Set<string>, // active cache keys
  onSelectionAdd: (sheetNames: string[]) => Promise<void>,
  onTranslate: () => Promise<void>,
) {
  const [detectionResult, setDetectionResult] = useState<DetectionResult | null>(null);
  
  // User's checkbox state within the banner (table names)
  const [pendingChecked, setPendingChecked] = useState<Set<string>>(new Set());

  const handlePaste = useCallback((text: string) => {
    const result = detectTableNames(text, knownSheets, activeSelection);

    // Only show banner if there are NEW tables to add
    const hasNew = result.matched.some(t => !t.alreadySelected);
    if (hasNew) {
      setDetectionResult(result);
      // Pre-check all new tables by default
      setPendingChecked(
        new Set(
          result.matched
            .filter(t => !t.alreadySelected)
            .map(t => t.tableName)
        )
      );
    } else {
      // If no new tables detected, we don't show the banner
      setDetectionResult(null);
    }
  }, [knownSheets, activeSelection]);

  const applyAndTranslate = useCallback(async () => {
    if (pendingChecked.size > 0) {
      await onSelectionAdd(Array.from(pendingChecked));
    }
    setDetectionResult(null);
    await onTranslate();
  }, [pendingChecked, onSelectionAdd, onTranslate]);

  const translateWithoutApplying = useCallback(async () => {
    setDetectionResult(null);
    await onTranslate();
  }, [onTranslate]);

  const dismissBanner = useCallback(() => {
    setDetectionResult(null);
  }, []);

  const togglePending = useCallback((tableName: string) => {
    setPendingChecked(prev => {
      const next = new Set(prev);
      if (next.has(tableName)) {
        next.delete(tableName);
      } else {
        next.add(tableName);
      }
      return next;
    });
  }, []);

  return {
    detectionResult,
    pendingChecked,
    handlePaste,
    applyAndTranslate,
    translateWithoutApplying,
    dismissBanner,
    togglePending,
  };
}
