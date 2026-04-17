
function resolveJavaContent(raw) {
  const parts = raw.split(/\s*\+\s*/);
  let result = "";
  for (const part of parts) {
    const literalMatch = part.match(/"([^"]*)"/);
    if (literalMatch) {
      result += literalMatch[1];
    } else {
      result += `__VAR_START__${part.trim()}__VAR_END__`;
    }
  }
  return result
    .replace(/'__VAR_START__(.*?)__VAR_END__'/g, "$1")
    .replace(/__VAR_START__(.*?)__VAR_END__/g, "$1");
}

function formatSQL(sql) {
  if (!sql) return "";
  let formatted = sql.replace(/\s+/g, " ").trim();
  formatted = formatted
    .replace(/\(/g, " ( ")
    .replace(/\)/g, " ) ")
    .replace(/,/g, " , ");
    
  const tokens = formatted.split(/\s+/).filter(t => t.length > 0);
  const sectionKeywords = ["SELECT", "FROM", "WHERE", "JOIN", "UPDATE", "SET", "INSERT", "INTO", "VALUES", "DELETE"];
  const breakers = ["AND", "OR", ","];

  let result = "";
  let nestStack = [];
  let sectionIndent = 0;
  let lastToken = "";

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const upperToken = token.toUpperCase();
    const isSection = sectionKeywords.includes(upperToken);
    const isBreaker = breakers.includes(upperToken);

    if (isSection) {
      if (result) result += "\n";
      result += "\t".repeat(nestStack.length) + upperToken;
      sectionIndent = 1;
    } else if (token === "(") {
      result += "\n" + "\t".repeat(nestStack.length + sectionIndent) + "(";
      nestStack.push("block");
    } else if (token === ")") {
      nestStack.pop();
      result += "\n" + "\t".repeat(nestStack.length + sectionIndent) + ")";
    } else if (isBreaker) {
      result += " " + upperToken;
    } else {
      const prevUpper = lastToken.toUpperCase();
      if (sectionKeywords.includes(prevUpper) || breakers.includes(prevUpper) || lastToken === "(") {
        result += "\n" + "\t".repeat(nestStack.length + sectionIndent) + token;
      } else {
        result += " " + token;
      }
    }
    lastToken = token;
  }
  return result.trim();
}

const javaCode = "\" HANSOKU1.HANSOKU_KB IN( '\" + mst000101_ConstDictionary.TIRASI + \"' ,\"";
const resolved = resolveJavaContent(javaCode);
console.log("RESOLVED CONTENT:");
console.log(resolved);

const fullSql = resolved + " 'mst000101_ConstDictionary.SUPOTTO_TOKUBAI_RENDO' ) AND";
console.log("\nFORMATTED OUTPUT:");
console.log(formatSQL(fullSql));
