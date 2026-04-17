
function formatSQL(sql) {
  if (!sql) return "";

  // 1. Normalize whitespace
  let formatted = sql.replace(/\s+/g, " ").trim();

  // 2. Major Keywords that start a section
  const sectionKeywords = [
    "SELECT", "FROM", "WHERE", "GROUP BY", "ORDER BY", "HAVING", 
    "LEFT JOIN", "RIGHT JOIN", "INNER JOIN", "CROSS JOIN", "JOIN",
    "UPDATE", "SET", "INSERT INTO", "VALUES", "DELETE FROM", "WITH"
  ];

  for (const keyword of sectionKeywords) {
    const regex = new RegExp(`\\b${keyword}\\b`, "gi");
    // Newline before AND after for section keywords
    formatted = formatted.replace(regex, (match) => `\n${match.toUpperCase()}\n\t`);
  }

  // 3. Sub-keywords (conjunctions and operators)
  const subKeywords = ["AND", "OR", "ON", "AS", "IN", "IS NULL", "IS NOT NULL", "LIKE"];
  for (const keyword of subKeywords) {
    const regex = new RegExp(`\\b${keyword}\\b`, "gi");
    // Sub-keywords get a newline before them, and indentation increase for what follows
    formatted = formatted.replace(regex, (match) => `\n\t${match.toUpperCase()} `);
  }

  // 4. Multi-level comma handling (for column lists, SET clauses, etc.)
  // We want to put each item on a new line with a tab
  formatted = formatted.replace(/,\s+/g, ",\n\t");

  // 5. Hierarchy & Cleanup
  // Replace 4 spaces with tabs everywhere
  formatted = formatted.replace(/    /g, "\t");
  
  // Remove redundant consecutive newlines or leading extra whitespace on lines
  formatted = formatted
    .split("\n")
    .map(line => line.trimEnd())
    .filter(line => line.trim().length > 0)
    .join("\n");

  return formatted.trim();
}

const sql = "SELECT a, b, c FROM table1 JOIN table2 ON a=b WHERE c=1 AND d=2 ORDER BY a";
console.log("NEW FORMAT:");
console.log(formatSQL(sql).replace(/\t/g, "[TAB]"));
console.log("\nRAW OUTPUT:");
console.log(formatSQL(sql));
