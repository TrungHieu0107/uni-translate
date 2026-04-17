
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
  const subKeywords = ["AND", "OR", "ON", "AS", "IN", "IS NULL", "IS NOT NULL", "LIKE"];

  let result = "";
  let indent = 0;
  let lastToken = "";

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const upperToken = token.toUpperCase();
    
    const isSection = sectionKeywords.includes(upperToken);
    const isSub = subKeywords.includes(upperToken);

    if (isSection) {
      if (result) result += "\n";
      result += upperToken;
      indent = 1;
    } else if (isSub) {
      result += "\n" + "\t".repeat(indent) + upperToken;
    } else if (token === "(") {
      result += "\n" + "\t".repeat(indent) + "(";
      indent++;
    } else if (token === ")") {
      indent = Math.max(0, indent - 1);
      result += "\n" + "\t".repeat(indent) + ")";
    } else if (token === ",") {
      result += " ,";
    } else {
      const prevIsComma = lastToken === ",";
      const prevIsParen = lastToken === "(";
      const prevIsKeyword = sectionKeywords.includes(lastToken.toUpperCase()) || subKeywords.includes(lastToken.toUpperCase());
      
      if (prevIsComma || prevIsParen || prevIsKeyword) {
        result += "\n" + "\t".repeat(indent) + token;
      } else {
        result += " " + token;
      }
    }
    lastToken = token;
  }
  return result.trim();
}

const mockContents = [
    " HANSOKU1.HANSOKU_KB IN( 'mst000101_ConstDictionary.TIRASI' ,",
    " 'mst000101_ConstDictionary.SUPOTTO_TOKUBAI_RENDO' ,",
    " 'mst000101_ConstDictionary.SUPOTTO_TOKUBAI_HI_RENDO' ,",
    " 'mst000101_ConstDictionary.EDLP' ) AND"
];

const fullSqlRaw = mockContents.join(" ");
console.log("FINAL FORMATTED SQL:");
console.log(formatSQL(fullSqlRaw));
