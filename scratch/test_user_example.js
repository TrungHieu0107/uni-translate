
function resolveJavaContent(raw) {
  const parts = raw.split(/\s*\+\s*/);
  let result = "";
  for (const part of parts) {
    const literalMatch = part.match(/"([^"]*)"/);
    if (literalMatch) {
      result += literalMatch[1];
    } else {
      result += part.trim();
    }
  }
  return result;
}

function formatSQL(sql) {
  if (!sql) return "";

  let formatted = sql.replace(/\s+/g, " ").trim();
  formatted = formatted.replace(/\(/g, " ( ").replace(/\)/g, " ) ");
  formatted = formatted.replace(/\s+/g, " ").trim();

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
    const upperLine = line.toUpperCase();
    if (line === ")") {
      indent = Math.max(0, indent - 1);
    }
    const isSection = sectionKeywords.some(k => upperLine === k);
    const isSub = subKeywords.some(k => upperLine === k);
    if (isSection) {
      result += (result ? "\n" : "") + upperLine;
      indent = 1;
    } else if (isSub) {
      result += "\n" + "\t".repeat(indent) + upperLine;
    } else if (line === "(") {
      result += "\n" + "\t".repeat(indent) + "(";
      indent++;
    } else {
      result += "\n" + "\t".repeat(indent) + line;
    }
  }
  return result.trim();
}

// User's Java snippets
const javaAppends = [
  " HANSOKU1.HANSOKU_KB IN( '\" + mst000101_ConstDictionary.TIRASI + \"' ,\"", // simplified for the mock
  " '\" + mst000101_ConstDictionary.SUPOTTO_TOKUBAI_RENDO + \"' ,\"",
  " '\" + mst000101_ConstDictionary.SUPOTTO_TOKUBAI_HI_RENDO + \"' ,\"",
  " '\" + mst000101_ConstDictionary.EDLP + \"') AND\""
];

// Reconstruct raw content (simulating resolveJavaContent)
// Wait, the strings in append(...) are what matters.
const mockContents = [
    " HANSOKU1.HANSOKU_KB IN( 'mst000101_ConstDictionary.TIRASI' ,",
    " 'mst000101_ConstDictionary.SUPOTTO_TOKUBAI_RENDO' ,",
    " 'mst000101_ConstDictionary.SUPOTTO_TOKUBAI_HI_RENDO' ,",
    " 'mst000101_ConstDictionary.EDLP' ) AND"
];

const fullSqlRaw = mockContents.join(" ");
console.log("FINAL FORMATTED SQL:");
console.log(formatSQL(fullSqlRaw));
