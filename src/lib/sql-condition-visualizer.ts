/**
 * SQL Condition Visualizer Logic
 * Parses Java SQL construction code into a unified visual representation.
 */

import { formatSql, FormatterState } from "./sql-formatter";

export type IRNode =
  | { kind: "sql"; value: string }
  | { kind: "if_group"; id: string; branches: Branch[] };

export interface Branch {
  condition: string | null; // null means "else"
  children: IRNode[]; // Recursive tree
  id?: string; // Pre-computed hierarchical ID (e.g. A1, A1-1)
}

/**
 * Normalizes dynamic expressions in append calls.
 * Example: "WHERE X = '" + code + "'" -> WHERE X = code
 */
export function normalizeAppendValue(raw: string): string {
  // 1. Split by '+' while respecting quotes (simple split for now, robust enough for most cases)
  // We look for '+' that are not inside double quotes.
  // Using a simple regex-based split for Java string concatenation
  const parts: string[] = [];
  let current = "";
  let inQuotes = false;
  
  for (let i = 0; i < raw.length; i++) {
    const char = raw[i];
    if (char === '"' && (i === 0 || raw[i-1] !== '\\')) {
      inQuotes = !inQuotes;
      current += char;
    } else if (char === '+' && !inQuotes) {
      parts.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  parts.push(current.trim());

  let result = "";
  const processedParts: { type: 'literal' | 'expression', value: string }[] = [];

  for (const part of parts) {
    const literalMatch = part.match(/^"([\s\S]*)"$/);
    if (literalMatch) {
      processedParts.push({ type: 'literal', value: literalMatch[1] });
    } else if (part.length > 0) {
      processedParts.push({ type: 'expression', value: part });
    }
  }

  // Combine and remove surrounding single quotes for expressions
  for (let i = 0; i < processedParts.length; i++) {
    const part = processedParts[i];
    if (part.type === 'expression') {
      const prev = processedParts[i-1];
      const next = processedParts[i+1];
      
      if (prev && prev.type === 'literal' && prev.value.endsWith("'")) {
        prev.value = prev.value.slice(0, -1);
      }
      if (next && next.type === 'literal' && next.value.startsWith("'")) {
        next.value = next.value.slice(1);
      }
    }
  }

  // Second pass to combine
  for (const part of processedParts) {
    result += part.value;
  }

  return result;
}

/**
 * Finds the closing parenthesis for an opening parenthesis at openPos.
 */
function findClosingParen(text: string, openPos: number): number {
  let count = 0;
  let inDoubleQuotes = false;
  let inSingleQuotes = false;
  
  for (let i = openPos; i < text.length; i++) {
    const char = text[i];
    const prev = text[i - 1];
    const isEscaped = prev === '\\';

    if (char === '"' && !inSingleQuotes && !isEscaped) {
      inDoubleQuotes = !inDoubleQuotes;
    } else if (char === "'" && !inDoubleQuotes && !isEscaped) {
      inSingleQuotes = !inSingleQuotes;
    }

    if (!inDoubleQuotes && !inSingleQuotes) {
      if (char === "(") count++;
      else if (char === ")") {
        count--;
        if (count === 0) return i;
      }
    }
  }
  return -1;
}


/**
 * Finds the closing brace for an opening brace at openPos.
 */
function findClosingBrace(text: string, openPos: number): number {
  let count = 0;
  let inDoubleQuotes = false;
  let inSingleQuotes = false;

  for (let i = openPos; i < text.length; i++) {
    const char = text[i];
    const prev = text[i - 1];
    const isEscaped = prev === '\\';

    if (char === '"' && !inSingleQuotes && !isEscaped) {
      inDoubleQuotes = !inDoubleQuotes;
    } else if (char === "'" && !inDoubleQuotes && !isEscaped) {
      inSingleQuotes = !inSingleQuotes;
    }

    if (!inDoubleQuotes && !inSingleQuotes) {
      if (text[i] === "{") count++;
      else if (text[i] === "}") {
        count--;
        if (count === 0) return i;
      }
    }
  }
  return -1;
}

/**
 * Strips Java comments from code while being mindful of quotes.
 */
function stripComments(code: string): string {
  let result = "";
  let i = 0;
  let inDoubleQuotes = false;
  let inSingleQuotes = false;

  while (i < code.length) {
    const char = code[i];
    const next = code[i + 1];
    const prev = code[i - 1];
    const isEscaped = prev === '\\';

    if (char === '"' && !inSingleQuotes && !isEscaped) {
      inDoubleQuotes = !inDoubleQuotes;
      result += char;
    } else if (char === "'" && !inDoubleQuotes && !isEscaped) {
      inSingleQuotes = !inSingleQuotes;
      result += char;
    } else if (!inDoubleQuotes && !inSingleQuotes) {
      if (char === "/" && next === "/") {
        // Line comment
        while (i < code.length && code[i] !== "\n") i++;
        result += "\n";
      } else if (char === "/" && next === "*") {
        // Block comment
        i += 2;
        while (i < code.length && !(code[i] === "*" && code[i + 1] === "/")) i++;
        i++; // Skip /
      } else {
        result += char;
      }
    } else {
      result += char;
    }
    i++;
  }
  return result;
}

/**
 * Parses Java code into a recursive IR tree.
 */
export function parseToIR(javaCode: string): IRNode[] {
  const stripped = stripComments(javaCode);
  const nodes = parseToIRRecursive(stripped);
  return assignGroupIds(nodes);
}

function parseToIRRecursive(javaCode: string): IRNode[] {
  const nodes: IRNode[] = [];
  let remaining = javaCode;

  while (remaining.trim()) {
    // Find next interesting token: if, else if, else, .append
    const nextMatch = remaining.match(/(if\s*\(|else\s*if\s*\(|else\s*\{|\.append\s*\()/);
    
    if (!nextMatch || nextMatch.index === undefined) {
      // Just some remaining text, might contain appends? 
      // Actually match() should find them if regex is correct.
      break;
    }

    const before = remaining.substring(0, nextMatch.index);
    if (before.trim()) {
        // This shouldn't happen if regex is exhaustive for SQL appends, 
        // but for safety we don't do anything here as extractSqlNodesFromBlock 
        // is now integrated into the main loop.
    }

    const token = nextMatch[1];
    const startIdx = nextMatch.index + token.length;

    if (token.includes(".append")) {
      const endIdx = findClosingParen(remaining, startIdx - 1);
      if (endIdx === -1) break;
      const content = remaining.substring(startIdx, endIdx);
      nodes.push({ kind: "sql", value: normalizeAppendValue(content) });
      remaining = remaining.substring(endIdx + 1);
      continue;
    }

    if (token.startsWith("else") && token.includes("{")) {
        // Standalone else
        const endBrace = findClosingBrace(remaining, startIdx - 1);
        if (endBrace === -1) break;
        const body = remaining.substring(startIdx, endBrace);
        
        const lastNode = nodes[nodes.length - 1];
        if (lastNode && lastNode.kind === "if_group") {
          lastNode.branches.push({
            condition: null,
            children: parseToIRRecursive(body)
          });
        }
        remaining = remaining.substring(endBrace + 1);
        continue;
    }

    // if or else if
    const endParen = findClosingParen(remaining, startIdx - 1);
    if (endParen === -1) break;
    const condition = remaining.substring(startIdx, endParen);
    
    // Find brace
    const braceIdx = remaining.indexOf("{", endParen);
    if (braceIdx === -1) break;
    
    const endBrace = findClosingBrace(remaining, braceIdx);
    if (endBrace === -1) break;
    const body = remaining.substring(braceIdx + 1, endBrace);

    if (token.startsWith("else")) {
        // else if
        const lastNode = nodes[nodes.length - 1];
        if (lastNode && lastNode.kind === "if_group") {
          lastNode.branches.push({
            condition: condition.trim(),
            children: parseToIRRecursive(body)
          });
        }
    } else {
        // new if group
        nodes.push({
          kind: "if_group",
          id: "", // assigned later
          branches: [{
            condition: condition.trim(),
            children: parseToIRRecursive(body)
          }]
        });
    }

    remaining = remaining.substring(endBrace + 1);
  }

  return nodes;
}

/**
 * Assigns hierarchical group IDs to a list of IR nodes.
 */
function assignGroupIds(nodes: IRNode[], parentBranchId?: string, groupLetter: { char: string } = { char: 'A' }): IRNode[] {
  for (const node of nodes) {
    if (node.kind === "if_group") {
      const currentGroupLetter = parentBranchId ? "" : groupLetter.char;
      if (!parentBranchId) {
        groupLetter.char = String.fromCharCode(groupLetter.char.charCodeAt(0) + 1);
      }
      
      node.branches.forEach((branch, bIdx) => {
        const branchId = parentBranchId 
          ? `${parentBranchId}-${bIdx + 1}`
          : `${currentGroupLetter}${bIdx + 1}`;
        
        branch.id = branchId;
        assignGroupIds(branch.children, branchId, groupLetter);
      });
    }
  }
  return nodes;
}


import { SnippetMatcher } from "./snippet-matcher";

export interface RenderResult {
  output: string;
  unmatched: string[];
}

/**
 * Splits a condition by && or || at the top level only.
 */
export function splitConditionParts(condition: string): { parts: string[], operators: Array<"&&" | "||"> } {
  const parts: string[] = [];
  const operators: Array<"&&" | "||"> = [];
  let depth = 0;
  let inQuotes = false;
  let quoteChar = "";
  let current = "";
  let i = 0;

  while (i < condition.length) {
    const char = condition[i];
    
    if (!inQuotes && (char === '"' || char === "'")) {
      inQuotes = true;
      quoteChar = char;
      current += char;
    } else if (inQuotes && char === quoteChar && condition[i-1] !== '\\') {
      inQuotes = false;
      current += char;
    } else if (!inQuotes && char === "(") {
      depth++;
      current += char;
    } else if (!inQuotes && char === ")") {
      depth--;
      current += char;
    } else if (!inQuotes && depth === 0 && (condition.startsWith("&&", i) || condition.startsWith("||", i))) {
      parts.push(current.trim());
      operators.push(condition.startsWith("&&", i) ? "&&" : "||");
      current = "";
      i += 1; // Skip one extra char (the second char of && or ||)
    } else {
      current += char;
    }
    i++;
  }
  if (current.trim()) parts.push(current.trim());
  return { parts, operators };
}

/**
 * Detects if a SQL line starts with AND or OR (Leading Style).
 */
export function detectLeadingAndOr(sqlLine: string): { isAndOr: boolean, keyword: "AND" | "OR" | null, content: string } {
  const trimmed = sqlLine.trim();
  const match = trimmed.match(/^(AND|OR)\s+(.*)$/i);
  if (match) {
    return {
      isAndOr: true,
      keyword: match[1].toUpperCase() as "AND" | "OR",
      content: match[2]
    };
  }
  return {
    isAndOr: false,
    keyword: null,
    content: trimmed
  };
}

/**
 * Renders SQL lines with look-ahead for trailing AND/OR.
 */
function renderSqlLines(
  nodes: IRNode[], 
  startIndex: number, 
  indent: string, 
  context: { depth: number, formatterState: FormatterState }
): { result: string, lastIndex: number } {
  let result = "";
  let i = startIndex;
  
  while (i < nodes.length && nodes[i].kind === "sql") {
    const node = nodes[i] as { kind: "sql", value: string };
    
    // Check if THIS line starts with AND/OR
    const split = detectLeadingAndOr(node.value);
    
    // Check if NEXT line starts with AND/OR (to move it here)
    const nextNode = nodes[i + 1];
    const nextSplit = nextNode && nextNode.kind === "sql" ? detectLeadingAndOr(nextNode.value) : null;
    const trailing = nextSplit && nextSplit.isAndOr ? `\t${nextSplit.keyword}` : "";
    
    const formatRes = formatSql(split.content, context.formatterState);
    context.formatterState = formatRes.state;
    
    // Indent and attach trailing
    const displayLines = formatRes.result.split("\n").filter(l => l.trim() !== "");
    const formattedLines = displayLines.map((line, idx) => {
      const lineTrailing = (idx === displayLines.length - 1) ? trailing : "";
      return `${indent}\t${line}${lineTrailing}`;
    }).join("\n") + "\n";

    result += formattedLines;
    i++;
  }
  
  return { result, lastIndex: i - 1 };
}

/**
 * Renders a condition header with potential multi-line splitting.
 */
function renderConditionHeader(
  indent: string,
  branchId: string, 
  displayText: string,
  rawCondition: string | null,
  matcher?: SnippetMatcher
): string {
  if (rawCondition === null) {
    return `${indent}◆【条件】${branchId}\t上記以外\n`;
  }
  
  // Use the matcher result if available, otherwise use parts of the raw condition
  // Requirement says: "multi-part — trailing AND/OR per line"
  // If matched by snippet, it might be a single description.
  // But patterns don't split compound conditions, so exact match would be the whole thing.
  
  const { parts, operators } = splitConditionParts(rawCondition);
  
  if (parts.length === 1) {
    return `${indent}◆【条件】${branchId}\t${displayText}\n`;
  }
  
  let result = "";
  for (let i = 0; i < parts.length; i++) {
    const isLast = i === parts.length - 1;
    const op = operators[i];
    const trailing = isLast ? "" : `\t${op === "&&" ? "AND" : "OR"}`;
    
    // We should try to translate individual parts? 
    // The requirement says: "displayText = matchResult?.text ?? conditionText"
    // But if we split, we might need to translate each part.
    // For now, let's keep it simple: if matched, use displayText. If not, use parts.
    
    let partText = parts[i];
    if (matcher) {
        const match = matcher.match(partText);
        if (match.matched) partText = match.text;
    }

    if (i === 0) {
      result += `${indent}◆【条件】${branchId}\t${partText}${trailing}\n`;
    } else {
      result += `${indent}\t${partText}${trailing}\n`;
    }
  }
  return result;
}

/**
 * Renders IR nodes into the final SQL document string.
 */
export function renderIR(
  nodes: IRNode[], 
  options: { matcher?: SnippetMatcher } = {}, 
  context: { depth: number, formatterState: FormatterState } = { 
    depth: 0, 
    formatterState: { nestStack: [], lastToken: "", currentSection: "", inBetween: false, lastWasInlineAnd: false, afterSection: false } 
  }
): RenderResult {
  let output = "";
  const unmatched: string[] = [];
  const indent = "\t".repeat(context.depth);

  let i = 0;
  while (i < nodes.length) {
    const node = nodes[i];
    
    if (node.kind === "sql") {
      const { result, lastIndex } = renderSqlLines(nodes, i, indent, context);
      output += result;
      i = lastIndex + 1;
      continue;
    } 
    
    if (node.kind === "if_group") {
      node.branches.forEach((branch) => {
        const branchId = branch.id || "??";
        
        let displayText = branch.condition ?? "上記以外";
        let matchKindMarker = "";
        if (branch.condition && options.matcher) {
          const match = options.matcher.match(branch.condition);
          if (match.matchKind === "exact") {
            displayText = match.text;
            matchKindMarker = "[E]";
          } else if (match.matchKind === "pattern") {
            displayText = `~${match.text}`;
            matchKindMarker = "[P]";
          } else {
            matchKindMarker = "[F]";
            if (!unmatched.includes(branch.condition)) unmatched.push(branch.condition);
          }
        }

        output += renderConditionHeader(indent, branchId, matchKindMarker + displayText, branch.condition, options.matcher);
        
        // Recurse with cloned state so branches don't interfere
        const subRes = renderIR(branch.children, options, { 
          depth: context.depth + 1,
          formatterState: { 
            ...context.formatterState, 
            nestStack: [...context.formatterState.nestStack] 
          }
        });
        output += subRes.output + (subRes.output ? "\n" : "");
        unmatched.push(...subRes.unmatched.filter(u => !unmatched.includes(u)));
      });
      output += `${indent}◆【条件ここまで】\n`;
    }
    i++;
  }

  return {
    output: output.trimEnd(),
    unmatched
  };
}
