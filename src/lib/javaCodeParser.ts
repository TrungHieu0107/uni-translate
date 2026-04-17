/**
 * Java SQL Code Parser (Multi-Pattern Support)
 */

export interface ColumnAppend {
  variable: string;
  content: string; 
  isDynamic: boolean;
}

export type Segment =
  | { kind: "unconditional"; content: string; appends: ColumnAppend[] }
  | { 
      kind: "conditional"; 
      condition: string; 
      thenSegment: Segment[]; 
      elseSegment: Segment[]; 
    };

export interface ColumnMapping {
  en: string;
  value: string;
  isPlaceholder: boolean;
  category: "SET" | "VALUES" | "WHERE" | "JOIN_ON" | "OTHER";
}

export interface TableRef {
  name: string;
  alias?: string;
  joinType?: string;
}

export interface PathResult {
  conditions: Record<string, boolean>;
  type: "SELECT" | "INSERT" | "UPDATE" | "DELETE" | "MERGE" | "UNKNOWN";
  tableName: string;
  tables: TableRef[];
  columns: ColumnMapping[];
  fullSql: string;
  pattern: "single_buffer" | "dual_buffer" | "multi_buffer";
}

/**
 * Main Entry Point
 */
export function parseJavaSQL(code: string): PathResult[] {
  const cleanCode = code
    .replace(/\/\/.*/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "");

  const segments = parseRecursive(cleanCode);
  const variables = extractConditionVariables(segments);
  
  const bufferNames = new Set<string>();
  const walkAppends = (segs: Segment[]) => {
    for (const s of segs) {
      if (s.kind === "unconditional") {
        s.appends.forEach(a => bufferNames.add(a.variable));
      } else {
        walkAppends(s.thenSegment);
        walkAppends(s.elseSegment);
      }
    }
  };
  walkAppends(segments);

  const pattern = bufferNames.size === 1 ? "single_buffer" : 
                  bufferNames.size === 2 ? "dual_buffer" : "multi_buffer";

  return generatePaths(segments, variables, pattern);
}

export function parseJavaSegments(code: string): Segment[] {
  const cleanCode = code
    .replace(/\/\/.*/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "");

  return parseRecursive(cleanCode);
}

function parseRecursive(code: string): Segment[] {
  const segments: Segment[] = [];
  let remaining = code;

  while (remaining.trim()) {
    const ifMatch = remaining.match(/if\s*\(([^)]+)\)\s*\{/);
    
    if (ifMatch && ifMatch.index !== undefined) {
      const before = remaining.substring(0, ifMatch.index);
      if (before.trim()) {
        segments.push({
          kind: "unconditional",
          content: before,
          appends: extractAppends(before)
        });
      }

      const braceStart = ifMatch.index + ifMatch[0].length;
      const blockEnd = findClosingBrace(remaining, braceStart - 1);
      
      if (blockEnd === -1) break;

      const condition = ifMatch[1].trim();
      const thenContent = remaining.substring(braceStart, blockEnd);
      
      let elseContent = "";
      let nextRemainingStart = blockEnd + 1;

      const elseRegex = /^\s*else\s*\{/;
      const elseMatch = remaining.substring(blockEnd + 1).match(elseRegex);
      if (elseMatch) {
        const elseBraceStart = blockEnd + 1 + (elseMatch.index || 0) + elseMatch[0].length;
        const elseBlockEnd = findClosingBrace(remaining, elseBraceStart - 1);
        if (elseBlockEnd !== -1) {
          elseContent = remaining.substring(elseBraceStart, elseBlockEnd);
          nextRemainingStart = elseBlockEnd + 1;
        }
      }

      segments.push({
        kind: "conditional",
        condition,
        thenSegment: parseRecursive(thenContent),
        elseSegment: parseRecursive(elseContent)
      });

      remaining = remaining.substring(nextRemainingStart);
    } else {
      segments.push({
        kind: "unconditional",
        content: remaining,
        appends: extractAppends(remaining)
      });
      break;
    }
  }

  return segments;
}

function findClosingBrace(text: string, openPos: number): number {
  let count = 0;
  for (let i = openPos; i < text.length; i++) {
    if (text[i] === "{") count++;
    else if (text[i] === "}") {
      count--;
      if (count === 0) return i;
    }
  }
  return -1;
}

/**
 * Extract appends, handling string concatenation.
 * e.g. .append("ID = '" + var + "'") -> ID = '__DYNAMIC__'
 */
function extractAppends(code: string): ColumnAppend[] {
  const appends: ColumnAppend[] = [];
  // Match: var.append( ... )
  // We look specifically for the content inside parens
  const regex = /([\w\d_]+)\.append\s*\(\s*([\s\S]*?)\s*\)\s*;/g;
  let match;
  while ((match = regex.exec(code)) !== null) {
    const varName = match[1];
    const rawContent = match[2];
    
    // Process content to extract string literals and replace dynamic parts
    const { content, isDynamic } = resolveJavaContent(rawContent);
    
    appends.push({
      variable: varName,
      content,
      isDynamic
    });
  }
  return appends;
}

function resolveJavaContent(raw: string): { content: string, isDynamic: boolean } {
  // Simple heuristic for Java string concatenation
  // "STR" + VAR + "STR"
  const parts = raw.split(/\s*\+\s*/);
  let isDynamic = false;
  let result = "";

  for (const part of parts) {
    const literalMatch = part.match(/"([^"]*)"/);
    if (literalMatch) {
      result += literalMatch[1];
    } else {
      isDynamic = true;
      // Mark as variable temporarily
      result += `__VAR_START__${part.trim()}__VAR_END__`;
    }
  }

  // Cleanup: remove single quotes around marked variables
  // e.g. ' + VAR + ' => 'VAR' => VAR
  const cleaned = result
    .replace(/'__VAR_START__(.*?)__VAR_END__'/g, "$1")
    .replace(/__VAR_START__(.*?)__VAR_END__/g, "$1");

  return { content: cleaned, isDynamic };
}

export function extractConditionVariables(segments: Segment[]): string[] {
  const vars = new Set<string>();
  const walk = (segs: Segment[]) => {
    for (const s of segs) {
      if (s.kind === "conditional") {
        const pureVar = s.condition.replace(/[!\s()]/g, "");
        if (pureVar && !["true", "false"].includes(pureVar.toLowerCase())) vars.add(pureVar);
        walk(s.thenSegment);
        walk(s.elseSegment);
      }
    }
  };
  walk(segments);
  return Array.from(vars);
}

function generatePaths(segments: Segment[], variables: string[], pattern: "single_buffer" | "dual_buffer" | "multi_buffer"): PathResult[] {
  const combinationsCount = Math.pow(2, variables.length);
  const results: PathResult[] = [];

  for (let i = 0; i < combinationsCount; i++) {
    const combination: Record<string, boolean> = {};
    variables.forEach((v, index) => {
      combination[v] = !!(i & (1 << index));
    });

    const pathAppends: ColumnAppend[] = [];
    const walk = (segs: Segment[]) => {
      for (const s of segs) {
        if (s.kind === "unconditional") {
          pathAppends.push(...s.appends);
        } else {
          const isNegated = s.condition.startsWith("!");
          const varName = s.condition.replace(/[!\s()]/g, "");
          const val = combination[varName];
          const isActive = isNegated ? !val : val;
          if (isActive) walk(s.thenSegment);
          else walk(s.elseSegment);
        }
      }
    };
    walk(segments);

    let pathResult: Partial<PathResult>;
    if (pattern === "single_buffer") {
      pathResult = processSingleBuffer(pathAppends);
    } else {
      pathResult = processMultiBuffer(pathAppends);
    }

    results.push({
      conditions: combination,
      pattern,
      type: pathResult.type || "UNKNOWN",
      tableName: pathResult.tableName || "UNKNOWN",
      tables: pathResult.tables || [],
      columns: pathResult.columns || [],
      fullSql: pathResult.fullSql || "",
    });
  }

  return deduplicatePaths(results);
}

/**
 * STRATEGY: Single Buffer Sequential Extraction
 */
function processSingleBuffer(appends: ColumnAppend[]): Partial<PathResult> {
  const sql = appends.map(a => a.content).join(" ");
  
  // 2. Structural Parsing
  const typeMatch = sql.match(/^\s*(UPDATE|SELECT|INSERT|DELETE|MERGE)/i);
  const type = (typeMatch ? typeMatch[1].toUpperCase() : "UNKNOWN") as PathResult["type"];

  const columns: ColumnMapping[] = [];
  const tables: TableRef[] = [];
  let tableName = "UNKNOWN";

  if (type === "UPDATE") {
    // Table name
    const updateMatch = sql.match(/UPDATE\s+([\w\d_.]+)/i);
    if (updateMatch) tableName = updateMatch[1];

    // SET columns: COL = VAL, COL = VAL
    const setPart = (sql.match(/SET\s+([\s\S]*?)(FROM|WHERE|$)/i) || [])[1] || "";
    const setRegex = /([\w\d_.]+)\s*=\s*([^,]+)/g;
    let match;
    while ((match = setRegex.exec(setPart)) !== null) {
      columns.push({
        en: match[1].trim().split('.').pop() || match[1].trim(),
        value: match[2].trim(),
        isPlaceholder: match[2].includes("__DYNAMIC__"),
        category: "SET"
      });
    }
  }

  // FROM / JOIN tables
  const fromPart = (sql.match(/FROM\s+([\s\S]*?)(WHERE|ORDER|GROUP|LIMIT|$)/i) || [])[1] || "";
  const joinRegex = /(INNER\s+JOIN|LEFT\s+JOIN|RIGHT\s+JOIN|JOIN)?\s*([\w\d_.]+)\s*(?:AS\s+)?([\w\d_]+)?/gi;
  let jMatch;
  while ((jMatch = joinRegex.exec(fromPart)) !== null) {
    if (jMatch[2] && !["INNER", "LEFT", "RIGHT", "JOIN", "ON"].includes(jMatch[2].toUpperCase())) {
      tables.push({
        name: jMatch[2],
        alias: jMatch[3],
        joinType: jMatch[1] ? jMatch[1].toUpperCase() : undefined
      });
    }
  }

  // WHERE columns
  const wherePart = (sql.match(/WHERE\s+([\s\S]*?)(ORDER|GROUP|LIMIT|$)/i) || [])[1] || "";
  const whereRegex = /([\w\d_.]+)\s*(=|<>|>|<|>=|<=|LIKE|IN|IS)\s*/g;
  let wMatch;
  while ((wMatch = whereRegex.exec(wherePart)) !== null) {
      columns.push({
        en: wMatch[1].trim().split('.').pop() || wMatch[1].trim(),
        value: "condition",
        isPlaceholder: false,
        category: "WHERE"
      });
  }

  return {
    type,
    tableName,
    tables,
    columns: deduplicateCols(columns),
    fullSql: formatSQL(sql)
  };
}

/**
 * STRATEGY: Multi Buffer parallel list extraction (INSERT)
 */
function processMultiBuffer(appends: ColumnAppend[]): Partial<PathResult> {
  const colAppends = appends.filter(a => a.variable === "sql1" || a.variable.includes("Col"));
  const valAppends = appends.filter(a => a.variable === "sql2" || a.variable.includes("Val"));

  const cleanCols = colAppends
    .map(a => a.content.replace(/[,\s()]/g, "").trim())
    .filter(c => c && !["INSERT", "INTO", "VALUES"].includes(c.toUpperCase()));

  const cleanVals = valAppends
    .map(a => a.content.replace(/[,\s()]/g, "").trim())
    .filter(v => v !== "");

  const columns: ColumnMapping[] = [];
  for (let i = 0; i < cleanCols.length; i++) {
    const val = cleanVals[i] || "?";
    columns.push({
      en: cleanCols[i],
      value: val,
      isPlaceholder: val.includes("__DYNAMIC__") || val === "?",
      category: "VALUES"
    });
  }

  let tableName = "UNKNOWN";
  const rawSql = appends.map(a => a.content).join(" ");
  const tableMatch = rawSql.match(/INSERT\s+INTO\s+([\w\d_]+)/i);
  if (tableMatch) tableName = tableMatch[1];

  // Reconstruct formatted INSERT
  const colList = cleanCols.join(",\n    ");
  const valList = cleanVals.join(",\n    ");
  const formattedInsert = `INSERT INTO ${tableName} (\n    ${colList}\n) VALUES (\n    ${valList}\n)`;

  return {
    type: "INSERT",
    tableName,
    columns,
    fullSql: formattedInsert
  };
}

/**
 * Lightweight SQL Formatter
 */
export function formatSQL(sql: string): string {
  if (!sql) return "";

  // 1. Normalize whitespace to a single space
  let formatted = sql.replace(/\s+/g, " ").trim();

  // 2. Tokenize by space but keep parentheses and commas as separate tokens
  formatted = formatted
    .replace(/\(/g, " ( ")
    .replace(/\)/g, " ) ")
    .replace(/,/g, " , ");
    
  const tokens = formatted.split(/\s+/).filter(t => t.length > 0);

  const sectionKeywords = [
    "SELECT", "FROM", "WHERE", "GROUP BY", "ORDER BY", "HAVING", 
    "LEFT", "RIGHT", "INNER", "CROSS", "JOIN",
    "UPDATE", "SET", "INSERT", "INTO", "VALUES", "DELETE", "WITH"
  ];
  const breakers = ["AND", "OR", ","];
  
  // Keywords that usually precede a block-starting parenthesis (not a function)
  const blockStarters = ["IN", "VALUES", "AND", "OR", "ON", "WHERE", "FROM", "JOIN", "INTO", "("];

  let result = "";
  let nestStack: ("block" | "func")[] = []; // Tracks if current depth is a block or function
  let sectionIndent = 0; // Tracks if we are inside a section
  let lastToken = "";
  let currentSection = "";

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const upperToken = token.toUpperCase();
    
    let isSection = sectionKeywords.includes(upperToken);
    const isBreaker = breakers.includes(upperToken);

    // Special handling for multi-token sections like "INSERT INTO" or "GROUP BY"
    if (isSection) {
      if (upperToken === "INTO" && lastToken.toUpperCase() === "INSERT") {
        isSection = false; // "INTO" follows "INSERT", don't start a new section line
        result += " INTO";
        currentSection = "INSERT";
      } else if (upperToken === "BY" && (lastToken.toUpperCase() === "GROUP" || lastToken.toUpperCase() === "ORDER")) {
        isSection = false;
        result += " BY";
      } else {
        if (result) result += "\n";
        result += "\t".repeat(nestStack.length) + upperToken;
        sectionIndent = 1;
        currentSection = upperToken;
      }
    } else if (token === "(") {
      const prevUpper = lastToken.toUpperCase();
      // Heuristic: if preceded by a known keyword/operator, it's a block. 
      // Also, in INSERT context, the parentheses are blocks (for field lists or values).
      const isInsert = currentSection === "INSERT" || currentSection === "VALUES" || currentSection === "INTO";
      const isFunction = lastToken && !blockStarters.includes(prevUpper) && !sectionKeywords.includes(prevUpper) && !isInsert;
      
      if (isFunction) {
        result += "(";
        nestStack.push("func");
      } else {
        result += "\n" + "\t".repeat(nestStack.length + sectionIndent) + "(";
        nestStack.push("block");
      }
    } else if (token === ")") {
      const type = nestStack.pop();
      if (type === "func") {
        result += ")";
      } else {
        result += "\n" + "\t".repeat(nestStack.length + sectionIndent) + ")";
      }
    } else if (isBreaker) {
      result += " " + upperToken;
    } else {
      const currentNest = nestStack[nestStack.length - 1];
      const prevUpper = lastToken.toUpperCase();
      
      if (currentNest === "func") {
        // Function argument - stay inline
        const needsSpace = lastToken !== "(" && token !== ")";
        result += (needsSpace ? " " : "") + token;
      } else {
        const prevIsBreaker = breakers.includes(prevUpper);
        const prevIsSection = sectionKeywords.includes(prevUpper);
        const prevIsParen = lastToken === "(";
        
        if (prevIsSection || prevIsBreaker || prevIsParen) {
          result += "\n" + "\t".repeat(nestStack.length + sectionIndent) + token;
        } else {
          result += " " + token;
        }
      }
    }
    
    lastToken = token;
  }

  return result.trim();
}

function deduplicateCols(cols: ColumnMapping[]): ColumnMapping[] {
    const seen = new Set<string>();
    return cols.filter(c => {
        const key = `${c.en}-${c.category}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

function deduplicatePaths(paths: PathResult[]): PathResult[] {
  const map = new Map<string, PathResult>();
  for (const p of paths) {
    const key = JSON.stringify({ type: p.type, table: p.tableName, cols: p.columns });
    if (!map.has(key)) map.set(key, p);
  }
  return Array.from(map.values());
}
