
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
    "LEFT", "RIGHT", "INNER", "CROSS", "JOIN",
    "UPDATE", "SET", "INSERT", "INTO", "VALUES", "DELETE", "WITH"
  ];
  const breakers = ["AND", "OR", ","];
  const blockStarters = ["IN", "VALUES", "AND", "OR", "ON", "WHERE", "FROM", "JOIN", "INTO", "("];

  let result = "";
  let nestStack = [];
  let sectionIndent = 0;
  let lastToken = "";
  let currentSection = "";

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const upperToken = token.toUpperCase();
    let isSection = sectionKeywords.includes(upperToken);
    const isBreaker = breakers.includes(upperToken);

    if (isSection) {
      if (upperToken === "INTO" && lastToken.toUpperCase() === "INSERT") {
        isSection = false;
        result += " INTO";
        currentSection = "INSERT";
      } else if (upperToken === "BY" && (lastToken.toUpperCase() === "GROUP" || lastToken.toUpperCase() === "ORDER")) {
        isSection = false;
        result += " BY";
      } else {
        if (result) result += "\n";
        result += "\t".repeat(nestStack.length) + upperToken;
        sectionIndent = 1;
        currentSection = upperToken;
      }
    } else if (token === "(") {
      const prevUpper = lastToken.toUpperCase();
      const isInsert = currentSection === "INSERT" || currentSection === "VALUES" || currentSection === "INTO";
      const isFunction = lastToken && !blockStarters.includes(prevUpper) && !sectionKeywords.includes(prevUpper) && !isInsert;
      
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

console.log("--- FINAL INSERT TEST ---");
const sql = "INSERT INTO WK_DT_TOKUBAI_GENKA(TENPO_CD , SYOHIN_CD , SIIRESAKI_CD) VALUES ( 'A' , 'B' , 'C' )";
console.log(formatSQL(sql));
