const { parseToIR, renderIR } = require('../src/lib/sqlConditionVisualizer');

const input = `
    strSql.append("WHERE ");
    strSql.append("  HANSOKU1.HANSOKU_KB IN ( ");
    strSql.append("    'A', 'B' ");
    strSql.append("  ) ");
`;

const res = renderIR(parseToIR(input));
console.log(res.output);
