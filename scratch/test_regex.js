const SQL_TABLE_PATTERNS = [
  // Standard SQL clauses (supports schema.table and optional quotes)
  /\b(?:FROM|JOIN|INTO|UPDATE|TABLE)\s+(?:["`\[])?([A-Z0-9_]+(?:\.[A-Z0-9_]+)?)(?:["`\]])?/gi,
];

const text = `
	INSERT INTO
		MYSCHEMA.WK_R_HANBAI_SYOHIN_RECENT
`;

for (const pattern of SQL_TABLE_PATTERNS) {
    let match;
    pattern.lastIndex = 0;
    while ((match = pattern.exec(text)) !== null) {
      console.log("Found match:", match[1]);
    }
}

const tokens = text
    .split(/[\s,;()'"`\[\]{}=<>!]+/)
    .map(t => t.trim().toUpperCase())
    .filter(t => t.length >= 3);
console.log("Tokens:", tokens);
