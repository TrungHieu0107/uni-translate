import { SheetMeta } from "../hooks/use-dictionary";

export type DetectionMethod = "sql-keyword" | "token-match";

export interface MatchedTable {
  tableName: string;
  alreadySelected: boolean;
  entryCount: number;
}

export interface DetectionResult {
  matched: MatchedTable[];
  unmatched: string[];
  detectionMethod: Record<string, DetectionMethod>;
}

/**
 * Fallback token matching against known sheet names
 */
function tokenMatchAgainstSheets(text: string, knownSheetNames: string[]): string[] {
  // Tokenize: split on any non-word character except underscore
  const tokens = text
    .split(/[^a-zA-Z0-9_]+/)
    .map(t => t.trim().toUpperCase())
    .filter(t => t.length >= 3);

  const sheetNameSet = new Set(knownSheetNames.map(s => s.toUpperCase()));
  const results: Set<string> = new Set();

  for (const token of tokens) {
    if (sheetNameSet.has(token)) {
      results.add(token);
    }
  }

  return Array.from(results);
}

/**
 * Detects table names in the given text by matching against known sheet names.
 * Just checks if any token in the text matches a known sheet name.
 * 
 * @param text The pasted text to analyze
 * @param knownSheets All loaded table sheets
 * @param activeSelection Currently selected sheet cache keys
 */
export function detectTableNames(
  text: string,
  knownSheets: SheetMeta[],
  activeSelection: Set<string>
): DetectionResult {
  const tokensFound = tokenMatchAgainstSheets(
    text,
    knownSheets.map(s => s.name)
  );

  const detectionMethod: Record<string, DetectionMethod> = {};
  
  tokensFound.forEach(name => {
    detectionMethod[name] = "token-match";
  });

  const sheetMap = new Map(knownSheets.map(s => [s.name.toUpperCase(), s]));
  
  // Extract names from activeSelection (which are cache_keys "file|sheet")
  const activeSheetNames = new Set(
    Array.from(activeSelection).map(key => {
      const parts = key.split('|');
      return (parts[1] || "").toUpperCase();
    })
  );

  const matched: MatchedTable[] = [];
  const unmatched: string[] = [];

  for (const name of tokensFound) {
    const sheet = sheetMap.get(name);
    if (sheet) {
      matched.push({
        tableName: sheet.name,
        alreadySelected: activeSheetNames.has(name),
        entryCount: sheet.entry_count,
      });
    }
  }

  return {
    matched,
    unmatched,
    detectionMethod,
  };
}
