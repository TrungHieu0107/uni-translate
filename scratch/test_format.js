
function formatSQL(sql) {
  if (!sql) return "";

  // 1. Normalize whitespace
  let formatted = sql.replace(/\s+/g, " ").trim();

  // 2. Keywords to put on new lines
  const newlines = [
    "SELECT", "FROM", "WHERE", "GROUP BY", "ORDER BY", "HAVING", 
    "LEFT JOIN", "RIGHT JOIN", "INNER JOIN", "CROSS JOIN", "JOIN",
    "UPDATE", "SET", "INSERT INTO", "VALUES", "DELETE FROM"
  ];

  for (const keyword of newlines) {
    const regex = new RegExp(`\\b${keyword}\\b`, "gi");
    formatted = formatted.replace(regex, (match) => `\n${match.toUpperCase()}`);
  }

  // 3. Keywords to uppercase but not necessarily new line
  const keywords = ["AND", "OR", "IN", "IS NULL", "IS NOT NULL", "LIKE", "AS", "ON"];
  for (const keyword of keywords) {
    const regex = new RegExp(`\\b${keyword}\\b`, "gi");
    formatted = formatted.replace(regex, (match) => match.toUpperCase());
  }

  // 4. Cleanup and indentation for SET clauses specifically
  formatted = formatted.replace(/\nSET\s+/gi, "\nSET\n    ");
  formatted = formatted.replace(/\nFROM\s+/gi, "\nFROM\n    ");
  formatted = formatted.replace(/\nWHERE\s+/gi, "\nWHERE\n    ");
  
  if (formatted.includes("\nSET")) {
    const parts = formatted.split("\nWHERE");
    parts[0] = parts[0].replace(/,\s*/g, ",\n    ");
    formatted = parts.join("\nWHERE");
  }

  return formatted.trim();
}

const sql = "SELECT a, b, c FROM table1 JOIN table2 ON a=b WHERE c=1 AND d=2 ORDER BY a";
console.log("OLD FORMAT:");
console.log(formatSQL(sql));
