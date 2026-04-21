import { useState, useCallback, useEffect, useRef } from "react";
import { SheetMeta } from "./useDictionary";
import { DetectionResult, detectTableNames } from "../lib/tableNameDetector";

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
  const lastAppliedRef = useRef<string[]>([]);
  
  const handleInput = useCallback(async (text: string) => {
    const result = detectTableNames(text, knownSheets, activeSelection);
    
    // Find what's actually new in this specific input
    const matchedNames = result.matched.map(t => t.tableName);
    
    // 1. Identify tables that are no longer in this text (to be removed)
    const toRemove = lastAppliedRef.current.filter(name => !matchedNames.includes(name));
    if (toRemove.length > 0) {
      await onSelectionRemove(toRemove);
    }

    // 2. Identify tables that are newly found in this text (to be added)
    // Note: detectTableNames already filtered against activeSelection, 
    // but we also filter against what we already applied in this session
    const toAdd = matchedNames.filter(name => !lastAppliedRef.current.includes(name));
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
  }, [knownSheets, activeSelection, onSelectionAdd, onSelectionRemove]);

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
  };
}
