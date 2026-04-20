import { normalizeCondition } from "./conditionNormalizer";

export interface SnippetFile {
  exact: Record<string, string>;
  patterns: Array<{ pattern: string; template: string }>;
}

export interface MatchResult {
  matched: boolean;
  text: string;          // Japanese description if matched, original condition if not
  matchKind: "exact" | "pattern" | "fallback";
  patternUsed?: string;  // which pattern matched, for debug display
}

export class SnippetMatcher {
  private snippetFile: SnippetFile;
  private normalizedExact: Record<string, string> = {};

  constructor(snippetFile: SnippetFile) {
    this.snippetFile = snippetFile;
    // Pre-normalize exact keys for faster lookup
    for (const [key, value] of Object.entries(snippetFile.exact)) {
      this.normalizedExact[normalizeCondition(key)] = value;
    }
  }

  /**
   * Matches a raw condition against the snippet file.
   */
  match(rawCondition: string): MatchResult {
    const normalized = normalizeCondition(rawCondition);

    // Step 1: Exact match
    if (this.normalizedExact[normalized]) {
      return {
        matched: true,
        text: this.normalizedExact[normalized],
        matchKind: "exact"
      };
    }

    // Step 2: Pattern match (in order)
    for (const { pattern, template } of this.snippetFile.patterns) {
      const result = this.tryMatchPattern(normalized, pattern, template);
      if (result) {
        return {
          matched: true,
          text: result,
          matchKind: "pattern",
          patternUsed: pattern
        };
      }
    }

    // Step 3: Fallback
    return {
      matched: false,
      text: rawCondition,
      matchKind: "fallback"
    };
  }

  /**
   * Tries to match a normalized condition against a pattern.
   */
  private tryMatchPattern(condition: string, pattern: string, template: string): string | null {
    // Normalize pattern once (could be cached if needed)
    const normalizedPattern = normalizeCondition(pattern);
    

    // Escape remaining regex special characters that are NOT part of placeholders
    // This is tricky. Let's try a different approach:
    // Split by placeholders, escape literals, then join with capture groups.
    
    const literalParts = normalizedPattern.split(/\{\w+\}/);
    const placeholderMatches = normalizedPattern.match(/\{\w+\}/g) || [];
    
    let finalRegexStr = "^";
    for (let i = 0; i < literalParts.length; i++) {
      // Escape literal part
      finalRegexStr += literalParts[i].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (i < placeholderMatches.length) {
        const name = placeholderMatches[i].slice(1, -1);
        finalRegexStr += `(?<${name}>.+?)`;
      }
    }
    finalRegexStr += "$";

    try {
      const regex = new RegExp(finalRegexStr);
      const match = condition.match(regex);
      
      if (match && match.groups) {
        let result = template;
        for (const name of Object.keys(match.groups)) {
          const val = match.groups[name];
          // Rule: Patterns never split compound conditions (&& or ||)
          if (val.includes("&&") || val.includes("||")) {
            return null;
          }
          result = result.replace(new RegExp(`\\{${name}\\}`, 'g'), val);
        }
        return result;
      }
    } catch (e) {
      console.error("Invalid regex generated from pattern:", pattern, e);
    }

    return null;
  }
}

/**
 * Loads a SnippetFile from a JSON string.
 */
export function loadSnippetFile(json: string): SnippetFile {
  try {
    const data = JSON.parse(json);
    return {
      exact: data.exact || {},
      patterns: data.patterns || []
    };
  } catch (e) {
    console.error("Failed to parse snippet file:", e);
    return { exact: {}, patterns: [] };
  }
}

/**
 * Exports a SnippetFile to a JSON string.
 */
export function exportSnippetFile(snippetFile: SnippetFile): string {
  return JSON.stringify(snippetFile, null, 2);
}
