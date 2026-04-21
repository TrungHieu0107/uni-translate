/**
 * Normalizes Java condition strings for consistent matching.
 */

const RESERVED_KEYWORDS = new Set(["null", "true", "false", "and", "or", "not", "instanceof"]);


/**
 * Normalizes a condition string.
 * 1. Collapses whitespace.
 * 2. Lowercases reserved keywords.
 * 3. Normalizes binary operator spacing.
 * 4. Strips outer parentheses.
 */
export function normalizeCondition(raw: string): string {
  if (!raw) return "";

  // Step 1: Collapse all whitespace including newlines
  let normalized = raw.replace(/\s+/g, " ").trim();

  // Step 2: Lowercase reserved keywords only
  // We tokenize to avoid lowercasing inside string literals or variable names that might contain keywords
  // However, the requirement says "Lowercase reserved keywords only".
  // A simple word-boundary regex is usually enough for these specific keywords.
  normalized = normalized.replace(/\b(NULL|TRUE|FALSE|AND|OR|NOT|INSTANCEOF)\b/gi, (match) => {
    const lower = match.toLowerCase();
    return RESERVED_KEYWORDS.has(lower) ? lower : match;
  });

  // Step 3: Normalize binary operators (add spaces around)
  // Use a single regex to find all operators, prioritizing longer ones
  const opRegex = /(!=|==|>=|<=|>|<|&&|\|\||=)/g;
  normalized = normalized.replace(opRegex, " $1 ");
  
  // Collapse multiple spaces
  normalized = normalized.replace(/\s+/g, " ").trim();

  // Step 4: Strip outer parentheses (single wrap only)
  if (normalized.startsWith("(") && normalized.endsWith(")")) {
    // Check if they are matching outer parens
    let count = 0;
    let matching = true;
    for (let i = 0; i < normalized.length - 1; i++) {
      if (normalized[i] === "(") count++;
      else if (normalized[i] === ")") count--;
      if (count === 0) {
        matching = false;
        break;
      }
    }
    if (matching) {
      normalized = normalized.slice(1, -1).trim();
    }
  }

  return normalized;
}
