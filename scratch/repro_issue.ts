import { detectTableNames } from "../src/lib/tableNameDetector";
import { SheetMeta } from "../hooks/useDictionary";

const knownSheets: SheetMeta[] = [
  { name: "WK_R_HANBAI_SYOHIN_RECENT", kind: "Table", entry_count: 100, cache_key: "f1|WK_R_HANBAI_SYOHIN_RECENT" },
];

const text = `
	INSERT INTO
		WK_R_HANBAI_SYOHIN_RECENT
`;

const result = detectTableNames(text, knownSheets, new Set());
console.log("Matched Tables:", result.matched.map(m => m.tableName));
console.log("Unmatched Tables:", result.unmatched);
console.log("Methods:", result.detectionMethod);
