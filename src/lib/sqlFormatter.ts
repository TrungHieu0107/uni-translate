/**
 * Shared SQL Formatter Utility
 *
 * Indentation model:
 *   keyword level = nestStack.length
 *   content level = nestStack.length + 1
 *   ( at content level, then push block
 *   ) matches ( level
 */
export interface FormatterState {
  nestStack: ("block" | "func")[];
  lastToken: string;
  currentSection: string;
  inBetween: boolean;
  lastWasInlineAnd: boolean;
  afterSection: boolean;
}

export function formatSql(sql: string, state?: FormatterState): { result: string; state: FormatterState } {
  const defaultState: FormatterState = {
    nestStack: [], lastToken: "", currentSection: "",
    inBetween: false, lastWasInlineAnd: false, afterSection: false
  };
  if (!sql) return { result: "", state: state || defaultState };

  let formatted = sql.replace(/\s+/g, " ").trim();
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
  const blockStarters = ["IN", "VALUES", "AND", "OR", "ON", "WHERE", "FROM", "JOIN", "INTO", "(", "OVER"];

  let result = "";
  let nestStack = state?.nestStack ? [...state.nestStack] : [];
  let lastToken = state?.lastToken ?? "";
  let currentSection = state?.currentSection ?? "";
  let inBetween = state?.inBetween ?? false;
  let lastWasInlineAnd = state?.lastWasInlineAnd ?? false;
  let afterSection = state?.afterSection ?? false;

  // keyword level = nestStack.length
  // content level = nestStack.length + 1
  const blockCount = () => nestStack.filter(x => x === "block").length;
  const kwIndent = () => "\t".repeat(nestStack.length + blockCount());
  const contentIndent = () => "\t".repeat(nestStack.length + blockCount() + 1);

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const upperToken = token.toUpperCase();
    let isSection = sectionKeywords.includes(upperToken);
    const isBreaker = breakers.includes(upperToken);
    const wasInlineAnd = lastWasInlineAnd;
    lastWasInlineAnd = false;

    if (isSection) {
      if (upperToken === "INTO" && currentSection === "INSERT") {
        isSection = false;
        result += " INTO";
      } else if (upperToken === "BY" && (lastToken.toUpperCase() === "GROUP" || lastToken.toUpperCase() === "ORDER")) {
        isSection = false;
        result += " BY";
      } else {
        if (result) result += "\n";
        result += kwIndent() + upperToken;
        currentSection = upperToken;
        afterSection = true;
      }
    } else if (token === "(") {
      const prevUpper = lastToken.toUpperCase();
      const isInsert = currentSection === "INSERT" || currentSection === "VALUES" || currentSection === "INTO";
      const isFunction = lastToken && !blockStarters.includes(prevUpper) && !sectionKeywords.includes(prevUpper) && !isInsert;

      if (isFunction) {
        result += "(";
        nestStack.push("func");
      } else {
        result += "\n" + contentIndent() + "(";
        nestStack.push("block");
        afterSection = false;
      }
    } else if (token === ")") {
      const type = nestStack.pop();
      if (type === "func") {
        result += ")";
      } else {
        result += "\n" + contentIndent() + ")";
      }
    } else if (isBreaker) {
      if (upperToken === ",") {
        result += ",";
      } else if (upperToken === "AND" && inBetween) {
        result += " " + upperToken;
        inBetween = false;
        lastWasInlineAnd = true;
      } else {
        result += "\t" + upperToken;
      }
    } else {
      const currentNest = nestStack[nestStack.length - 1];
      const prevUpper = lastToken.toUpperCase();

      if (upperToken === "BETWEEN") inBetween = true;

      // Hint detection
      const isHintStart = token.startsWith("/*");
      const isHintEnd = token.endsWith("*/");
      const isInsideHint = result.includes("/*") && !result.includes("*/");

      if (currentNest === "func") {
        const needsSpace = lastToken !== "(" && token !== ")";
        result += (needsSpace ? " " : "") + token;
      } else if (isHintStart || isHintEnd || isInsideHint) {
        result += " " + token;
      } else {
        const prevIsBreaker = breakers.includes(prevUpper);
        const prevIsSection = sectionKeywords.includes(prevUpper);
        const prevIsParen = lastToken === "(";

        if ((prevIsSection || prevIsBreaker || prevIsParen) && !wasInlineAnd) {
          result += "\n" + contentIndent() + token;
        } else {
          result += " " + token;
        }
      }
    }

    lastToken = token;
  }

  return {
    result,
    state: { nestStack, lastToken, currentSection, inBetween, lastWasInlineAnd, afterSection }
  };
}
