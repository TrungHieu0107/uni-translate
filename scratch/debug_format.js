
function formatSQL(sql) {
  if (!sql) return "";

  // 1. Normalize whitespace to a single space
  let formatted = sql.replace(/\s+/g, " ").trim();
  console.log('Step 1:', JSON.stringify(formatted));

  // 2. Major Keywords that start a section
  const sectionKeywords = [
    "SELECT", "FROM", "WHERE", "GROUP BY", "ORDER BY", "HAVING", 
    "LEFT JOIN", "RIGHT JOIN", "INNER JOIN", "CROSS JOIN", "JOIN",
    "UPDATE", "SET", "INSERT INTO", "VALUES", "DELETE FROM", "WITH"
  ];

  for (const keyword of sectionKeywords) {
    const regex = new RegExp(`\\s*\\b${keyword}\\b\\s*`, "gi");
    formatted = formatted.replace(regex, (match) => `\n${keyword.toUpperCase()}\n\t`);
  }
  console.log('Step 2:', JSON.stringify(formatted));

  // 3. Sub-keywords (conjunctions and operators)
  const subKeywords = ["AND", "OR", "ON", "AS", "IN", "IS NULL", "IS NOT NULL", "LIKE"];
  for (const keyword of subKeywords) {
    const regex = new RegExp(`\\s*\\b${keyword}\\b\\s*`, "gi");
    formatted = formatted.replace(regex, (match) => `\n\t${keyword.toUpperCase()} `);
  }
  console.log('Step 3:', JSON.stringify(formatted));

  // 4. Multi-level comma handling (for column lists, SET clauses, etc.)
  formatted = formatted.replace(/,\s*/g, ",\n\t");
  console.log('Step 4:', JSON.stringify(formatted));

  // 5. Hierarchy & Cleanup
  formatted = formatted.replace(/    /g, "\t");
  
  formatted = formatted
    .split("\n")
    .map(line => line.trimEnd())
    .filter(line => line.trim().length > 0)
    .join("\n");

  return formatted.trim();
}

const sql = "SELECT a, b, c FROM table1";
console.log(formatSQL(sql));
