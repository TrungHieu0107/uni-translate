
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
  
  // These should trigger a newline but stay at the current indent level
  const lineBreakers = ["AND", "OR", " ,"]; 
  // Wait, tokens don't include spaces, so just ","
  const breakers = ["AND", "OR", ","];

  // These stay on the same line
  const inlineKeywords = ["AS", "ON", "IN", "IS", "NULL", "NOT", "LIKE"];

  let result = "";
  let indent = 0;
  let lastToken = "";

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const upperToken = token.toUpperCase();
    
    const isSection = sectionKeywords.includes(upperToken);
    const isBreaker = breakers.includes(upperToken);
    const isInline = inlineKeywords.includes(upperToken);

    if (isSection) {
      if (result) result += "\n";
      result += upperToken;
      indent = 1;
    } else if (token === "(") {
      result += "\n" + "\t".repeat(indent) + "(";
      indent++;
    } else if (token === ")") {
      indent = Math.max(0, indent - 1);
      result += "\n" + "\t".repeat(indent) + ")";
    } else if (isBreaker) {
      result += " " + upperToken; // Add to current line
      // But we want a newline AFTER it for the next token?
      // "ID = 1 AND" \n "STATUS = 'ACTIVE'"
    } else {
      // Regular token
      const prevUpper = lastToken.toUpperCase();
      const prevIsBreaker = breakers.includes(prevUpper);
      const prevIsSection = sectionKeywords.includes(prevUpper);
      const prevIsParen = lastToken === "(";
      
      if (prevIsSection || prevIsBreaker || prevIsParen) {
        result += "\n" + "\t".repeat(indent) + token;
      } else {
        result += " " + token;
      }
    }
    
    lastToken = token;
  }

  return result.trim();
}

console.log("--- TEST 1: WHERE ---");
const sql1 = "WHERE ID = 1 AND STATUS = 'ACTIVE'";
console.log(formatSQL(sql1));

console.log("\n--- TEST 2: SELECT AS ---");
const sql2 = "SELECT COL1 AS ALIAS1 , COL2 AS ALIAS2";
console.log(formatSQL(sql2));

console.log("\n--- TEST 3: IN ---");
const sql3 = "WHERE COL IN ( 'A' , 'B' )";
console.log(formatSQL(sql3));
