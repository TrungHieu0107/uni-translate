
function formatSQL(sql) {
  if (!sql) return "";

  let formatted = sql.replace(/\s+/g, " ").trim();
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
      result += "\n" + "\t".repeat(nestLevel + sectionIndent) + "(";
      nestLevel++;
      sectionIndent = 0;
    } else if (token === ")") {
      nestLevel = Math.max(0, nestLevel - 1);
      result += "\n" + "\t".repeat(nestLevel + sectionIndent) + ")";
    } else if (isBreaker) {
      result += " " + upperToken;
    } else {
      const prevUpper = lastToken.toUpperCase();
      const prevIsBreaker = breakers.includes(prevUpper);
      const prevIsSection = sectionKeywords.includes(prevUpper);
      const prevIsParen = lastToken === "(";
      
      if (prevIsSection || prevIsBreaker || prevIsParen) {
        result += "\n" + "\t".repeat(nestLevel + sectionIndent) + token;
      } else {
        result += " " + token;
      }
    }
    lastToken = token;
  }
  return result.trim();
}

console.log("--- SUBQUERY TEST ---");
const sql = "SELECT * FROM TABLE1 WHERE ID IN ( SELECT ID FROM TABLE2 )";
console.log(formatSQL(sql));
