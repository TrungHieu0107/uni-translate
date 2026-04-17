
function formatSQL(sql) {
  if (!sql) return "";

  // 1. Normalize whitespace
  let formatted = sql.replace(/\s+/g, " ").trim();

  // 2. Tokenize by space but keep parentheses and commas as separate tokens
  formatted = formatted
    .replace(/\(/g, " ( ")
    .replace(/\)/g, " ) ")
    .replace(/,/g, " , ");
    
  const tokens = formatted.split(/\s+/).filter(t => t.length > 0);

  const sectionKeywords = [
    "SELECT", "FROM", "WHERE", "GROUP BY", "ORDER BY", "HAVING", 
    "LEFT JOIN", "RIGHT JOIN", "INNER JOIN", "CROSS JOIN", "JOIN",
    "UPDATE", "SET", "INSERT INTO", "VALUES", "DELETE FROM", "WITH"
  ];
  const breakers = ["AND", "OR", ","];
  
  // Keywords that usually precede a block-starting parenthesis
  const blockStarters = ["IN", "VALUES", "AND", "OR", "ON", "WHERE", "FROM", "JOIN", "("];

  let result = "";
  let nestLevel = 0;
  let sectionIndent = 0;
  let lastToken = "";

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const upperToken = token.toUpperCase();
    const isSection = sectionKeywords.includes(upperToken);
    const isBreaker = breakers.includes(upperToken);

    if (isSection) {
      if (result) result += "\n";
      result += "\t".repeat(nestLevel) + upperToken;
      sectionIndent = 1;
    } else if (token === "(") {
      const prevUpper = lastToken.toUpperCase();
      const isFunction = lastToken && !blockStarters.includes(prevUpper) && !sectionKeywords.includes(prevUpper);
      
      if (isFunction) {
        // Function call - stay inline
        result += "(";
      } else {
        // Block starter - newline and indent
        result += "\n" + "\t".repeat(nestLevel + sectionIndent) + "(";
      }
      nestLevel++;
      sectionIndent = 0;
    } else if (token === ")") {
      nestLevel = Math.max(0, nestLevel - 1);
      
      // Peek ahead: if last token was (, and this is ), we have ()
      // Wait, can't peek back easily without checking result.
      const lastChar = result[result.length - 1];
      if (lastChar === "(") {
        // Empty parens - join back
        result += ")";
      } else {
        result += "\n" + "\t".repeat(nestLevel + sectionIndent) + ")";
      }
    } else if (isBreaker) {
      result += " " + upperToken;
    } else {
      const prevUpper = lastToken.toUpperCase();
      const prevIsBreaker = breakers.includes(prevUpper);
      const prevIsSection = sectionKeywords.includes(prevUpper);
      const prevIsParen = lastToken === "(";
      
      const lastChar = result[result.length - 1];
      
      if (lastChar === "(") {
        // Content after function paren? 
        // We need to decide if this is a function body or block body.
        // If the result ends in " (", it was a block. If it ends in "(", it was a function.
        if (result.endsWith(" (")) {
             result += "\n" + "\t".repeat(nestLevel + sectionIndent) + token;
        } else {
             result += token;
        }
      } else if (prevIsSection || prevIsBreaker) {
        result += "\n" + "\t".repeat(nestLevel + sectionIndent) + token;
      } else {
        result += " " + token;
      }
    }
    lastToken = token;
  }
  return result.trim();
}

console.log("--- FUNCTION TEST ---");
console.log("rank() -> ", formatSQL("SELECT rank ( ) FROM table"));
console.log("count(*) -> ", formatSQL("SELECT count ( * ) FROM table"));

console.log("\n--- SUBQUERY TEST (SHOULD STILL INDENT) ---");
console.log(formatSQL("WHERE ID IN ( SELECT ID FROM TABLE2 )"));
