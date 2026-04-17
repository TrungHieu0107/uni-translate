
function formatSQL(sql) {
  if (!sql) return "";

  let formatted = sql.replace(/\s+/g, " ").trim();

  const sectionKeywords = [
    "SELECT", "FROM", "WHERE", "GROUP BY", "ORDER BY", "HAVING", 
    "LEFT JOIN", "RIGHT JOIN", "INNER JOIN", "CROSS JOIN", "JOIN",
    "UPDATE", "SET", "INSERT INTO", "VALUES", "DELETE FROM", "WITH"
  ];

  for (const keyword of sectionKeywords) {
    const regex = new RegExp(`\\s*\\b${keyword}\\b\\s*`, "gi");
    formatted = formatted.replace(regex, (match) => `\n${keyword.toUpperCase()}\n\t`);
  }

  const subKeywords = ["AND", "OR", "ON", "AS", "IN", "IS NULL", "IS NOT NULL", "LIKE"];
  for (const keyword of subKeywords) {
    const regex = new RegExp(`\\s*\\b${keyword}\\b\\s*`, "gi");
    formatted = formatted.replace(regex, (match) => `\n\t${keyword.toUpperCase()}\n\t\t`);
  }

  formatted = formatted.replace(/,\s*/g, ",\n\t");

  const lines = formatted.split("\n").map(l => l.trim()).filter(l => l.length > 0);
  
  let result = "";
  let indent = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isSection = sectionKeywords.includes(line.toUpperCase());
    const isSub = subKeywords.includes(line.toUpperCase());
    
    if (isSection) {
      result += (result ? "\n" : "") + line.toUpperCase();
      indent = 1;
    } else if (isSub) {
      result += "\n" + "\t".repeat(indent) + line.toUpperCase();
      indent++;
    } else {
      result += "\n" + "\t".repeat(indent) + line;
    }
  }

  return result.trim();
}

const sql = "SELECT a, b, c FROM table1 JOIN table2 ON a=b WHERE c=1 AND d=2 ORDER BY a";
console.log("FINAL FORMAT:");
console.log(formatSQL(sql).replace(/\t/g, "[TAB]"));
console.log("\nRAW OUTPUT:");
console.log(formatSQL(sql));
