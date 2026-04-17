/**
 * SQL Alias Resolver
 * Tokenizes SQL and resolves table aliases. Features Complex Pattern Parsing: Subqueries, Comma JOINs, CTEs.
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
}

export type AliasTarget =
  | { kind: "table";    name: string; originalAlias?: string }        // real table → expand
  | { kind: "subquery"; sql: string }                                 // (SELECT ...) → keep as-is
  | { kind: "cte";      name: string }                                // WITH x AS (...) → keep as-is

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
  "ORDER", "BY", "GROUP", "HAVING", "LIMIT", "OFFSET", "UNION", "ALL", "DISTINCT", "INSERT", "INTO", "UPDATE", "SET", "DELETE", "WITH"
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
    { kind: "punctuation", regex: /^[,;]/ }, // parenthesis handled separately
    { kind: "identifier", regex: /^([a-zA-Z_][a-zA-Z0-9_$]*|"[^"]*"|`[^`]*`|\[[^\]]*\])/ },
  ];

  while (pos < sql.length) {
    if (sql[pos] === '(') {
      // Find matching parenthesis
      let depth = 1;
      let endPos = pos + 1;
      let inString = false;
      let inComment = false;

      while (endPos < sql.length && depth > 0) {
        if (inString) {
          if (sql[endPos] === "'" && sql[endPos - 1] !== '\\') inString = false;
        } else if (inComment) {
          if (sql[endPos] === '\n') {
            inComment = false;
          } else if (sql[endPos] === '*' && sql[endPos + 1] === '/') {
            inComment = false;
            endPos++;
          }
        } else {
          if (sql[endPos] === "'") inString = true;
          else if (sql[endPos] === '-' && sql[endPos + 1] === '-') {
            inComment = true;
            endPos++;
          } else if (sql[endPos] === '/' && sql[endPos + 1] === '*') {
             inComment = true;
             endPos++;
          }
          else if (sql[endPos] === '(') depth++;
          else if (sql[endPos] === ')') depth--;
        }
        endPos++;
      }
      tokens.push({ kind: "subquery", value: sql.substring(pos, endPos) });
      pos = endPos;
      continue;
    }

    if (sql[pos] === ')') {
      // Stray close parenthesis
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

function parseCTEs(tokens: Token[], aliasMap: Map<string, AliasTarget>) {
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.kind === "keyword" && t.value.toUpperCase() === "WITH") {
       let j = i + 1;
       while (j < tokens.length) {
         if (tokens[j].kind === "whitespace" || tokens[j].kind === "comment") { j++; continue; }
         if (tokens[j].kind === "keyword" && tokens[j].value.toUpperCase() === "SELECT") break;
         
         if (tokens[j].kind === "identifier") {
            const cteName = tokens[j].value.replace(/["`\[\]]/g, "");
            aliasMap.set(cteName.toUpperCase(), { kind: "cte", name: cteName });
            
            while(j < tokens.length && !(tokens[j].kind === "punctuation" && tokens[j].value === ",") && !(tokens[j].kind === "keyword" && tokens[j].value.toUpperCase() === "SELECT")) {
               j++;
            }
            if (j < tokens.length && tokens[j].kind === "punctuation" && tokens[j].value === ",") {
                j++; 
                continue; 
            }
         }
         j++;
       }
       break;
    }
  }
}

function parseFromAndJoin(tokens: Token[], aliasMap: Map<string, AliasTarget>, tableMappings?: Record<string, string>) {
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].kind === "keyword" && tokens[i].value.toUpperCase() === "FROM") {
      let j = i + 1;
      
      while (j < tokens.length) {
        if (tokens[j].kind === "whitespace" || tokens[j].kind === "comment") { j++; continue; }
        
        if (tokens[j].kind === "keyword") {
           const val = tokens[j].value.toUpperCase();
           if (["WHERE", "GROUP", "ORDER", "JOIN", "INNER", "LEFT", "RIGHT", "HAVING", "LIMIT", "UNION", "SELECT"].includes(val)) {
             break;
           }
        }

        let target: AliasTarget | null = null;
        
        if (tokens[j].kind === "identifier") {
          target = { kind: "table", name: tokens[j].value.replace(/["`\[\]]/g, "") };
          j++;
        } else if (tokens[j].kind === "subquery") {
          target = { kind: "subquery", sql: tokens[j].value };
          j++;
        } else {
           j++;
           continue; 
        }

        let alias = "";

        while(j < tokens.length) {
          if (tokens[j].kind === "whitespace" || tokens[j].kind === "comment") { j++; continue; }
          
          if (tokens[j].kind === "punctuation" && tokens[j].value === ",") {
            break; 
          }
          
          if (tokens[j].kind === "keyword") {
            const val = tokens[j].value.toUpperCase();
            if (val === "AS") {
              j++;
              continue;
            } else if (["WHERE", "GROUP", "ORDER", "JOIN", "INNER", "LEFT", "RIGHT", "HAVING", "LIMIT", "UNION"].includes(val)) {
              break; 
            }
          }
          
          if (tokens[j].kind === "identifier") {
             if (!alias) {
               alias = tokens[j].value.replace(/["`\[\]]/g, "");
             }
          }
          j++;
        }

        if (alias && alias.toUpperCase() !== "AS") {
           if (target.kind === "table") {
             const upperName = target.name.toUpperCase();
             if (upperName === "__DYNAMIC__" && tableMappings && tableMappings[alias.toUpperCase()]) {
               target.name = tableMappings[alias.toUpperCase()];
             } else if (upperName === "__DYNAMIC__" && tableMappings && tableMappings["__DEFAULT__"]) {
               target.name = tableMappings["__DEFAULT__"];
             }
             
             // Normalize alias if needed (e.g. RHS -> HS)
             let normalizedAlias = alias;
             if (alias.toUpperCase() === "RPROFILE") {
                normalizedAlias = "PROFILE";
             }
             target.originalAlias = normalizedAlias;
           }

           aliasMap.set(alias.toUpperCase(), target);
           // NOTE: We no longer clear tokens[aliasIdx] here because we want to use them in the formatting pass
        }
        
        if (j < tokens.length && tokens[j].kind === "punctuation" && tokens[j].value === ",") {
          j++;
        }
      }
    } else if (tokens[i].kind === "keyword" && tokens[i].value.toUpperCase() === "JOIN") {
       let j = i + 1;
       let target: AliasTarget | null = null;

       while (j < tokens.length && (tokens[j].kind === "whitespace" || tokens[j].kind === "comment")) j++;
       
       if (j < tokens.length) {
         if (tokens[j].kind === "identifier") {
            target = { kind: "table", name: tokens[j].value.replace(/["`\[\]]/g, "") };
            j++;
         } else if (tokens[j].kind === "subquery") {
            target = { kind: "subquery", sql: tokens[j].value };
            j++;
         }
       }

       if (target) {
          let alias = "";

          while (j < tokens.length) {
            if (tokens[j].kind === "whitespace" || tokens[j].kind === "comment") { j++; continue; }
            if (tokens[j].kind === "keyword") {
              const val = tokens[j].value.toUpperCase();
              if (val === "AS") {
                j++; continue;
              } else if (val === "ON" || val === "USING" || ["WHERE", "GROUP", "ORDER", "JOIN", "INNER", "LEFT", "RIGHT"].includes(val)) {
                break;
              }
            }
            if (tokens[j].kind === "identifier") {
              if (!alias) {
                alias = tokens[j].value.replace(/["`\[\]]/g, "");
              }
            }
            j++;
          }

          if (alias && alias.toUpperCase() !== "AS") {
            if (target.kind === "table") {
               const upperName = target.name.toUpperCase();
               if (upperName === "__DYNAMIC__" && tableMappings && tableMappings[alias.toUpperCase()]) {
                 target.name = tableMappings[alias.toUpperCase()];
               } else if (upperName === "__DYNAMIC__" && tableMappings && tableMappings["__DEFAULT__"]) {
                 target.name = tableMappings["__DEFAULT__"];
               }

               let normalizedAlias = alias;
               if (alias.toUpperCase() === "RPROFILE") normalizedAlias = "PROFILE";
               target.originalAlias = normalizedAlias;
            }
            aliasMap.set(alias.toUpperCase(), target);
          }
       }
    }
  }
}

/**
 * Resolves aliases in the token stream.
 */
export function resolveAliasesFromSQL(sql: string, tableMappings?: Record<string, string>): ResolveResult {
  const tokens = tokenizeWithDepth(sql);
  const aliasMap = new Map<string, AliasTarget>();
  const unknownAliasesSet = new Set<string>();
  let changeCount = 0;

  parseCTEs(tokens, aliasMap);
  parseFromAndJoin(tokens, aliasMap, tableMappings);

  // Second pass: Replace table definitions in FROM/JOIN with TableName[Alias]
  // and handle column references.
  
  const resultTokens: Token[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    
    // Check if this token is a table name in a FROM/JOIN that was resolved
    // We already have the aliasMap. To replace definition:
    // Pattern: [TABLE_NAME] [WHITESPACE] [ALIAS]
    let isDefinition = false;
    if (token.kind === "identifier" || token.kind === "unknown") {
       // Look ahead for whitespace + alias
       let nextIdx = i + 1;
       while (nextIdx < tokens.length && (tokens[nextIdx].kind === "whitespace" || tokens[nextIdx].kind === "comment")) nextIdx++;
       
       if (nextIdx < tokens.length && tokens[nextIdx].kind === "identifier") {
          const possibleAlias = tokens[nextIdx].value.replace(/["`\[\]]/g, "").toUpperCase();
          const target = aliasMap.get(possibleAlias);
          if (target && target.kind === "table") {
             // This is the table name for an alias.
             // Replace it with TableName[Alias]
             const normalizedAlias = target.originalAlias || tokens[nextIdx].value.replace(/["`\[\]]/g, "");
             const resolvedValue = `${target.name}[${normalizedAlias}]`;
             
             resultTokens.push({
               ...token,
               value: resolvedValue,
               originalValue: token.value,
               isResolved: true
             });
             changeCount++;
             
             // If alias normalization happened, update the alias token too
             if (normalizedAlias !== tokens[nextIdx].value.replace(/["`\[\]]/g, "")) {
                // We'll update the alias token when we reach it, or handle it here
             }
             
             isDefinition = true;
          }
       }
    }

    if (isDefinition) continue;

    // Pattern: [IDENTIFIER] [DOT] [IDENTIFIER] (Column reference)
    if (token.kind === "identifier" && i + 2 < tokens.length && tokens[i+1].kind === "dot" && tokens[i+2].kind === "identifier") {
      const alias = token.value.replace(/["`\[\]]/g, "").toUpperCase();
      const target = aliasMap.get(alias);

      if (target) {
        if (target.kind === "table") {
            const originalValue = token.value;
            const resolvedValue = `${target.name}[${target.originalAlias || originalValue}]`;
            
            resultTokens.push({
              ...token,
              value: resolvedValue,
              originalValue,
              isResolved: true
            });
            changeCount++;
            resultTokens.push(tokens[i+1]);
            resultTokens.push(tokens[i+2]);
            i += 2; 
            continue;
        } else {
            // subquery or cte, do NOT expand alias
            resultTokens.push(token);
            resultTokens.push(tokens[i+1]);
            resultTokens.push(tokens[i+2]);
            i += 2;
            continue;
        }
      } else {
        unknownAliasesSet.add(token.value);
      }
    }
    
    // If it's an alias token that needs normalization
    if (token.kind === "identifier") {
       const upper = token.value.replace(/["`\[\]]/g, "").toUpperCase();
       const target = aliasMap.get(upper);
       if (target && target.kind === "table" && target.originalAlias && target.originalAlias !== token.value.replace(/["`\[\]]/g, "")) {
           // Check if this token is actually used as an alias here
           // (Simple heuristic: not followed by dot, and is either after a table name or just an alias ref)
           // Actually, let's look at the previous context to be sure it's the alias definition
           let prevIdx = i - 1;
           while (prevIdx >= 0 && (tokens[prevIdx].kind === "whitespace" || tokens[prevIdx].kind === "comment")) prevIdx--;
           
           if (prevIdx >= 0 && (tokens[prevIdx].kind === "identifier" || tokens[prevIdx].kind === "keyword")) {
              // Usually [TABLE_NAME] [ALIAS]
              // If it's not a keyword (except maybe AS), it's likely the alias definition
              const prevVal = tokens[prevIdx].value.toUpperCase();
              if (prevVal !== "AS" && !KEYWORDS.has(prevVal)) {
                  resultTokens.push({
                    ...token,
                    value: target.originalAlias,
                    originalValue: token.value,
                    isResolved: true
                  });
                  changeCount++;
                  continue;
              }
           }
       }
    }

    if (token.value !== "" || token.kind === "whitespace") {
      resultTokens.push(token);
    }
  }

  const resolvedSQL = resultTokens.map(t => t.value).join("");
  
  const exportAliasMap: Record<string, AliasTarget> = {};
  for (const [k, v] of aliasMap.entries()) exportAliasMap[k] = v;

  return {
    resolvedSQL,
    aliasMap: exportAliasMap,
    unknownAliases: Array.from(unknownAliasesSet),
    changeCount,
    tokens: resultTokens
  };
}
