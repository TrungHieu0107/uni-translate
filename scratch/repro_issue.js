
import { formatSql } from '../src/lib/sqlFormatter.ts';

const sql = `
SELECT * FROM TABLE1
WHERE HANSOKU2.%%PHYSLOC%% IN
(
SELECT
V2.ID
FROM TABLE2
)
`;

const { result } = formatSql(sql);
console.log('--- RESULT ---');
console.log(result);
console.log('--- END ---');
