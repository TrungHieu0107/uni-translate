
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
  const blockStarters = ["IN", "VALUES", "AND", "OR", "ON", "WHERE", "FROM", "JOIN", "("];

  let result = "";
  let nestStack = [];
  let sectionIndent = 0;
  let lastToken = "";
  let currentSection = "";

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const upperToken = token.toUpperCase();
    const isSection = sectionKeywords.includes(upperToken);
    const isBreaker = breakers.includes(upperToken);

    if (isSection) {
      if (result) result += "\n";
      result += "\t".repeat(nestStack.length) + upperToken;
      sectionIndent = 1;
      currentSection = upperToken;
    } else if (token === "(") {
      const prevUpper = lastToken.toUpperCase();
      // Heuristic: if preceded by a known keyword/operator, it's a block. 
      // Also, if we are in an INSERT INTO or VALUES section, it's a block.
      let isFunction = lastToken && !blockStarters.includes(prevUpper) && !sectionKeywords.includes(prevUpper);
      
      if (currentSection === "INSERT INTO" || currentSection === "VALUES") {
        isFunction = false;
      }
      
      if (isFunction) {
        result += "(";
        nestStack.push("func");
      } else {
        result += "\n" + "\t".repeat(nestStack.length + sectionIndent) + "(";
        nestStack.push("block");
        sectionIndent = 0;
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

console.log("--- INSERT TEST ---");
const sql = "INSERT INTO WK_DT_TOKUBAI_GENKA(TENPO_CD , SYOHIN_CD , SIIRESAKI_CD) VALUES ( 'A' , 'B' , 'C' )";
console.log(formatSQL(sql));

console.log("\n--- FUNCTION TEST (STILL SHOULD WORK) ---");
console.log(formatSQL("SELECT rank() FROM dual"));
