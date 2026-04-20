import { normalizeAppendValue } from './src/lib/sqlConditionVisualizer.js';

const tests = [
  { input: '"WHERE X = \'" + code + "\' text"', expected: "WHERE X = code text" },
  { input: '"WHERE X = \'" + obj.getCode() + "\'"', expected: "WHERE X = obj.getCode()" },
  { input: '"\'" + systemTs + "\'"', expected: "systemTs" },
  { input: '"INSERT INTO " + tableName', expected: "INSERT INTO tableName" },
  { input: '"\'0000\'"', expected: "'0000'" }
];

tests.forEach(({input, expected}) => {
  const result = normalizeAppendValue(input);
  console.log(`Input: ${input}`);
  console.log(`Result:   ${result}`);
  console.log(`Expected: ${expected}`);
  console.log(`Match: ${result === expected}`);
  console.log('---');
});
