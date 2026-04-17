
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function testHighlight(text, keyword) {
  if (!keyword || !text) return text;
  
  try {
    const escapedKeyword = escapeRegExp(keyword);
    console.log(`Testing with keyword: "${keyword}" (Escaped: "${escapedKeyword}")`);
    const parts = text.split(new RegExp(`(${escapedKeyword})`, 'gi'));
    console.log("Parts:", parts);
    return parts;
  } catch (e) {
    console.error("Highlighting error:", e.message);
    return text;
  }
}

console.log("--- Test 1: keep[ ---");
testHighlight("This is keep[ and keep it.", "keep[");

console.log("\n--- Test 2: (normal) ---");
testHighlight("Hello world", "hello");

console.log("\n--- Test 3: keep[ (invalid without escape) ---");
try {
    new RegExp("(keep[)", "gi");
} catch(e) {
    console.log("Caught expected error without escape:", e.message);
}
