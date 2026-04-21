/**
 * SQL Alias Resolver
 * Tokenizes SQL and resolves table aliases. 
 * Features Complex Pattern Parsing: Subqueries, Comma JOINs, CTEs.
 */

export type TokenKind = 
  | "keyword" 
  | "identifier" 
  | "dot" 
  | "whitespace" 
  | "string" 
  | "comment" 
  | "operator" 
  | "punctuation" 
  | "subquery"
  | "unknown";

export interface Token {
  kind: TokenKind;
  value: string;
  originalValue?: string; // used for diffing
  isResolved?: boolean;
  isAliasDefinition?: boolean;
}

export type AliasTarget =
  | { kind: "table";    name: string; originalAlias?: string }        // real table ↁEexpand
  | { kind: "subquery"; sql: string }                                 // (SELECT ...) ↁEkeep as-is
  | { kind: "cte";      name: string }                                // WITH x AS (...) ↁEkeep as-is

export interface ResolveResult {
  resolvedSQL: string;
  aliasMap: Record<string, AliasTarget>;
  unknownAliases: string[];
  changeCount: number;
  tokens: Token[]; // for DiffView
}

const KEYWORDS = new Set([
  "SELECT", "FROM", "JOIN", "INNER", "LEFT", "RIGHT", "OUTER", "FULL", "CROSS", "ON", 
  "WHERE", "AND", "OR", "NOT", "IN", "IS", "NULL", "EXISTS", "BETWEEN", "LIKE", "AS", 
  "ORDER", "BY", "GROUP", "HAVING", "LIMIT", "OFFSET", "UNION", "ALL", "DISTINCT", "INSERT", "INTO", "UPDATE", "SET", "DELETE", "WITH", "RECURSIVE"
]);

/**
 * Tokenizes a SQL string into a stream of tokens, capturing subqueries.
 */
export function tokenizeWithDepth(sql: string): Token[] {
  const tokens: Token[] = [];
  let pos = 0;

  const patterns: { kind: TokenKind; regex: RegExp }[] = [
    { kind: "whitespace", regex: /^\s+/ },
    { kind: "comment", regex: /^(--[^\n]*|\/\*[\s\S]*?\*\/)/ },
    { kind: "string", regex: /^'([^'\\]|\\.)*'/ },
    { kind: "dot", regex: /^\./ },
    { kind: "operator", regex: /^(<>|>=|<=|!=|\|\||[-+*/%=<>!])/ },
    { kind: "punctuation", regex: /^[,;]/ },
    { kind: "identifier", regex: /^([a-zA-Z_][a-zA-Z0-9_$]*|"[^"]*"|`[^`]*`|\[[^\]]*\])/ },
  ];

  while (pos < sql.length) {
    if (sql[pos] === '(') {
      const endPos = findMatchingParenthesis(sql, pos);
      tokens.push({ kind: "subquery", value: sql.substring(pos, endPos) });
      pos = endPos;
      continue;
    }

    if (sql[pos] === ')') {
      tokens.push({ kind: "punctuation", value: ")" });
      pos++;
      continue;
    }

    const remaining = sql.substring(pos);
    let matched = false;

    for (const pattern of patterns) {
      const match = remaining.match(pattern.regex);
      if (match) {
        let value = match[0];
        let kind = pattern.kind;

        if (kind === "identifier") {
          const upper = value.toUpperCase();
          if (KEYWORDS.has(upper)) {
            kind = "keyword";
          }
        }

        tokens.push({ kind, value });
        pos += value.length;
        matched = true;
        break;
      }
    }

    if (!matched) {
      tokens.push({ kind: "unknown", value: sql[pos] });
      pos++;
    }
  }

  return tokens;
}

function findMatchingParenthesis(sql: string, startPos: number): number {
  let depth = 1;
  let pos = startPos + 1;
  let inString = false;
  let inComment = false;

  while (pos < sql.length && depth > 0) {
    if (inString) {
      if (sql[pos] === "'" && sql[pos - 1] !== '\\') inString = false;
    } else if (inComment) {
      if (sql[pos] === '\n') inComment = false;
      else if (sql[pos] === '*' && sql[pos + 1] === '/') {
        inComment = false;
        pos++;
      }
    } else {
      if (sql[pos] === "'") inString = true;
      else if (sql[pos] === '-' && sql[pos + 1] === '-') { inComment = true; pos++; }
      else if (sql[pos] === '/' && sql[pos + 1] === '*') { inComment = true; pos++; }
      else if (sql[pos] === '(') depth++;
      else if (sql[pos] === ')') depth--;
    }
    pos++;
  }
  return pos;
}

function skipIgnored(tokens: Token[], index: number): number {
  let k = index;
  while (k < tokens.length && (tokens[k].kind === "whitespace" || tokens[k].kind === "comment")) {
    k++;
  }
  return k;
}

function peekDottedName(tokens: Token[], index: number): { fullName: string, nextIndex: number } {
  let fullName = tokens[index].value;
  let k = index + 1;
  while (k + 1 < tokens.length && tokens[k].kind === "dot" && tokens[k + 1].kind === "identifier") {
    fullName += "." + tokens[k + 1].value;
    k += 2;
  }
  return { fullName, nextIndex: k };
}

function parseCTEs(tokens: Token[], aliasMap: Map<string, AliasTarget>) {
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.kind === "keyword" && token.value.toUpperCase() === "WITH") {
       let j = i + 1;
       while (j < tokens.length) {
         j = skipIgnored(tokens, j);
         if (j >= tokens.length) break;
         
         const val = tokens[j].value.toUpperCase();
         if (val === "RECURSIVE") { j++; continue; }
         if (val === "SELECT") break;
         
         if (tokens[j].kind === "identifier") {
            const cteName = tokens[j].value.replace(/["`\[\]]/g, "");
            aliasMap.set(cteName.toUpperCase(), { kind: "cte", name: cteName });
            
            // Skip until the body subquery
            while(j < tokens.length && tokens[j].kind !== "subquery") {
               j++;
            }
            
            if (j < tokens.length && tokens[j].kind === "subquery") {
               j++;
            }

            j = skipIgnored(tokens, j);
            if (j < tokens.length && tokens[j].kind === "punctuation" && tokens[j].value === ",") {
                j++; 
                continue; 
            } else {
               break; 
            }
         }
         j++;
       }
       break;
    }
  }
}

function parseFromAndJoin(tokens: Token[], aliasMap: Map<string, AliasTarget>, tableMappings?: Record<string, string>) {
  const JOIN_BREAKERS = ["WHERE", "GROUP", "ORDER", "JOIN", "INNER", "LEFT", "RIGHT", "HAVING", "LIMIT", "UNION", "SELECT"];
  const ALIAS_BREAKERS = ["WHERE", "GROUP", "ORDER", "JOIN", "INNER", "LEFT", "RIGHT", "HAVING", "LIMIT", "UNION", "ON", "USING"];

  for (let i = 0; i < tokens.length; i++) {
    const isFrom = tokens[i].kind === "keyword" && tokens[i].value.toUpperCase() === "FROM";
    const isJoin = tokens[i].kind === "keyword" && tokens[i].value.toUpperCase() === "JOIN";
    
    if (isFrom || isJoin) {
      let j = i + 1;
      
      while (j < tokens.length) {
        j = skipIgnored(tokens, j);
        if (j >= tokens.length) break;
        
        if (tokens[j].kind === "keyword" && JOIN_BREAKERS.includes(tokens[j].value.toUpperCase())) {
           break;
        }

        let target: AliasTarget | null = null;
        
        if (tokens[j].kind === "identifier") {
          const upperId = tokens[j].value.replace(/["`\[\]]/g, "").toUpperCase();
          const existingCTE = aliasMap.get(upperId);
          
          if (existingCTE && existingCTE.kind === "cte") {
            target = existingCTE;
            j++;
          } else {
            const { fullName, nextIndex } = peekDottedName(tokens, j);
            target = { kind: "table", name: fullName.replace(/["`\[\]]/g, "") };
            j = nextIndex;
          }
        } else if (tokens[j].kind === "subquery") {
          target = { kind: "subquery", sql: tokens[j].value };
          j++;
        } else {
           j++; continue; 
        }

        let alias = "";
        while(j < tokens.length) {
          j = skipIgnored(tokens, j);
          if (j >= tokens.length) break;
          
          if (tokens[j].kind === "punctuation" && tokens[j].value === ",") break; 
          
          if (tokens[j].kind === "keyword") {
            const val = tokens[j].value.toUpperCase();
            if (val === "AS") { j++; continue; }
            if (ALIAS_BREAKERS.includes(val)) break; 
          }
          
          if (tokens[j].kind === "identifier") {
             if (!alias) {
               alias = tokens[j].value.replace(/["`\[\]]/g, "");
               tokens[j].isAliasDefinition = true;
             }
          }
          j++;
        }

        if (alias && alias.toUpperCase() !== "AS") {
           if (target.kind === "table") {
             applyTableMappings(target, alias, tableMappings);
           }
           aliasMap.set(alias.toUpperCase(), target);
        }
        
        if (isFrom && j < tokens.length && tokens[j].kind === "punctuation" && tokens[j].value === ",") {
          j++;
        } else {
          break; 
        }
      }
    }
  }
}

function applyTableMappings(target: { name: string, originalAlias?: string }, alias: string, tableMappings?: Record<string, string>) {
  const upperName = target.name.toUpperCase();
  if (upperName === "__DYNAMIC__" && tableMappings) {
    target.name = tableMappings[alias.toUpperCase()] || tableMappings["__DEFAULT__"] || target.name;
  }
  
  let normalizedAlias = alias;
  if (alias.toUpperCase() === "RPROFILE") normalizedAlias = "PROFILE";
  target.originalAlias = normalizedAlias;
}

/**
 * Resolves aliases in the token stream.
 */
export function resolveAliasesFromSQL(
  sql: string, 
  tableMappings?: Record<string, string>,
  initialAliasMap?: Map<string, AliasTarget>
): ResolveResult {
  const tokens = tokenizeWithDepth(sql);
  const aliasMap = initialAliasMap ? new Map(initialAliasMap) : new Map<string, AliasTarget>();
  const unknownAliasesSet = new Set<string>();
  let changeCount = 0;

  parseCTEs(tokens, aliasMap);
  parseFromAndJoin(tokens, aliasMap, tableMappings);

  const resultTokens: Token[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    
    if (token.kind === "subquery") {
       const innerSQL = token.value.substring(1, token.value.length - 1);
       const subResult = resolveAliasesFromSQL(innerSQL, tableMappings, aliasMap);
       resultTokens.push({ kind: "punctuation", value: "(" });
       resultTokens.push(...subResult.tokens);
       resultTokens.push({ kind: "punctuation", value: ")" });
       changeCount += subResult.changeCount;
       subResult.unknownAliases.forEach(a => unknownAliasesSet.add(a));
       continue;
    }

    let resolvedDefinition = false;
    if (token.kind === "identifier" || token.kind === "unknown") {
       const { fullName, nextIndex } = peekDottedName(tokens, i);
       const afterNameIndex = skipIgnored(tokens, nextIndex);
       
       if (afterNameIndex < tokens.length && tokens[afterNameIndex].kind === "identifier") {
          const possibleAlias = tokens[afterNameIndex].value.replace(/["`\[\]]/g, "").toUpperCase();
          const target = aliasMap.get(possibleAlias);
          if (target && target.kind === "table") {
            const newValue = target.name;
            const hasChanged = newValue !== fullName;
            resultTokens.push({
              ...token,
              value: newValue,
              originalValue: fullName,
              isResolved: hasChanged
            });
            if (hasChanged) changeCount++;
            i = nextIndex - 1;
            resolvedDefinition = true;
          }
       }
    }

    if (resolvedDefinition) continue;

    // Handle column references: alias.column
    if (token.kind === "identifier" && i + 2 < tokens.length && tokens[i+1].kind === "dot" && tokens[i+2].kind === "identifier") {
      const alias = token.value.replace(/["`\[\]]/g, "");
      const target = aliasMap.get(alias.toUpperCase());

      if (target && (target.kind === "table" || target.kind === "cte")) {
          const targetName = target.name;
          const newValue = `${targetName}[${alias}]`;
          const hasChanged = newValue !== token.value;

          resultTokens.push({
            ...token,
            value: newValue,
            originalValue: token.value,
            isResolved: hasChanged
          });
          
          if (hasChanged) changeCount++;
          resultTokens.push(tokens[i+1], tokens[i+2]);
          i += 2; 
          continue;
      } else if (target) {
          resultTokens.push(token, tokens[i+1], tokens[i+2]);
          i += 2; continue;
      } else {
        if (!KEYWORDS.has(alias.toUpperCase())) unknownAliasesSet.add(token.value);
      }
    }
    
    // Handle standalone aliases or keywords
    if (token.kind === "identifier") {
       const rawVal = token.value.replace(/["`\[\]]/g, "");
       const upper = rawVal.toUpperCase();
       const target = aliasMap.get(upper);
       
       if (target && (target.kind === "table" || target.kind === "cte")) {
           const targetName = target.name;
           const prevIdx = skipIgnoredBackwards(tokens, i - 1);
           if (prevIdx >= 0) {
              const prevVal = tokens[prevIdx].value.toUpperCase();
              if (prevVal !== "AS" && !KEYWORDS.has(prevVal)) {
                  const newValue = `${targetName}[${rawVal}]`;
                  const hasChanged = newValue !== token.value;

                  resultTokens.push({
                    ...token,
                    value: newValue,
                    originalValue: token.value,
                    isResolved: hasChanged
                  });
                  if (hasChanged) changeCount++;
                  continue;
              }
           }
       }
    }

    if (token.value !== "" || token.kind === "whitespace") {
      resultTokens.push(token);
    }
  }

  return buildResult(resultTokens, aliasMap, Array.from(unknownAliasesSet), changeCount);
}

function skipIgnoredBackwards(tokens: Token[], index: number): number {
  let k = index;
  while (k >= 0 && (tokens[k].kind === "whitespace" || tokens[k].kind === "comment")) {
    k--;
  }
  return k;
}

function buildResult(tokens: Token[], aliasMap: Map<string, AliasTarget>, unknownAliases: string[], changeCount: number): ResolveResult {
  const resolvedSQL = tokens.map(t => t.value).join("");
  const exportAliasMap: Record<string, AliasTarget> = {};
  for (const [k, v] of aliasMap.entries()) exportAliasMap[k] = v;

  return {
    resolvedSQL,
    aliasMap: exportAliasMap,
    unknownAliases,
    changeCount,
    tokens
  };
}

