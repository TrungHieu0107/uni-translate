import { describe, it, expect } from 'vitest';
import { parseToIR, renderIR } from './sql-condition-visualizer';

describe('sqlConditionVisualizer', () => {
  describe('parseToIR and renderIR', () => {
    it('Case 1: Simple appends (Full SQL)', () => {
      const input = `
        sql.append("SELECT * ");
        sql.append("FROM PRODUCT ");
        sql.append("WHERE DELETE_FG = '0'");
      `;
      const output = renderIR(parseToIR(input)).output;
      expect(output).toContain('SELECT');
      expect(output).toContain('FROM');
      expect(output).toContain('WHERE');
    });

    it('Case 2: Simple if', () => {
      const input = `
        sql.append("SELECT * FROM PRODUCT ");
        if (code != null) {
          sql.append("WHERE PRODUCT_CD = " + code);
        }
      `;
      const output = renderIR(parseToIR(input)).output;
      expect(output).toContain('◆【条件】A1\tcode != null');
      expect(output).toContain('PRODUCT_CD = code');
      expect(output).toContain('◆【条件ここまで】');
    });

    it('Case 3: if-else', () => {
      const input = `
        if (code != null) {
          sql.append("WHERE P_CD = " + code);
        } else {
          sql.append("WHERE P_CD = '0000'");
        }
      `;
      const output = renderIR(parseToIR(input)).output;
      expect(output).toContain('◆【条件】A1\tcode != null');
      expect(output).toContain('P_CD = code');
      expect(output).toContain('◆【条件】A2\t上記以外');
      expect(output).toContain("P_CD = '0000'");
    });

    it('Case 4: complex join in branch', () => {
      const input = `
        sql.append("SELECT * FROM MAIN M ");
        if (type == 1) {
          sql.append("INNER JOIN TABLE_A A ON A.ID = M.ID ");
        } else {
          sql.append("INNER JOIN TABLE_B B ON B.ID = M.ID ");
        }
      `;
      const output = renderIR(parseToIR(input)).output;
      expect(output).toContain('INNER');
      expect(output).toContain('JOIN');
      expect(output).toContain('TABLE_A A');
      expect(output).toContain('ON A.ID = M.ID');
      expect(output).toContain('TABLE_B B');
    });

    it('Case 5: method call in dynamic value', () => {
      const input = `
        if (status != null) {
          sql.append("WHERE STATUS = " + StatusDict.ACTIVE.getCode());
        }
      `;
      const output = renderIR(parseToIR(input)).output;
      expect(output).toContain('STATUS = StatusDict.ACTIVE.getCode()');
    });

    it('Case 6: Multi-part condition (AND/OR)', () => {
      const input = `if (a != null && b != null || c != null) { sql.append("X") }`;
      const output = renderIR(parseToIR(input)).output;
      expect(output).toContain('◆【条件】A1\ta != null\tAND');
      expect(output).toContain('\tb != null\tOR');
      expect(output).toContain('\tc != null');
    });

    it('Case 7: Nested if support', () => {
      const input = `
        if (code != null) {
          sql.append("P.CD = " + code);
          if (type == 1) {
            sql.append("AND P.TYPE = '1'");
          }
        }
      `;
      const output = renderIR(parseToIR(input)).output;
      expect(output).toContain('◆【条件】A1\tcode != null');
      expect(output).toContain('\t◆【条件】A1-1\ttype == 1');
      expect(output).toContain('P.TYPE = \'1\'');
    });

    it('Case 8: Long condition splitting', () => {
      const input = `
        if (a != null && b != null && c != null && d != null) {
          sql.append("X");
        }
      `;
      const output = renderIR(parseToIR(input)).output;
      expect(output).toContain('AND');
      expect(output).toContain('◆【条件】A1\ta != null\tAND');
    });

    it('Case 9: SQL look-ahead trailing AND/OR', () => {
      const input = `
        sql.append("WHERE P.CD = code");
        sql.append("AND P.NAME = name");
        sql.append("AND P.FLG = '1'");
      `;
      const output = renderIR(parseToIR(input)).output;
      expect(output).toContain('WHERE');
      expect(output).toContain('P.CD = code');
      expect(output).toContain('AND');
      expect(output).toContain('P.NAME = name');
    });

    it('Case 10: Mixed AND/OR on separate lines', () => {
      const input = `
        sql.append("WHERE A = 1 ");
        sql.append("  AND (B = 2 OR C = 3) ");
      `;
      const output = renderIR(parseToIR(input)).output;
      expect(output).toContain('WHERE');
      expect(output).toContain('A = 1');
      expect(output).toContain('AND');
      expect(output).toContain('B = 2');
      expect(output).toContain('OR');
    });

    it('Integration: Full prompt example', () => {
      const input = `
        sql.append("SELECT * FROM PRODUCT P ");
        if (code != null && name != null) {
          sql.append("WHERE P.CD = " + code);
          sql.append("AND P.NAME = " + name);
          if (type == 1) {
            sql.append("AND P.TYPE = '1'");
          } else {
            sql.append("AND P.TYPE = '0'");
          }
        } else if (altCode != null) {
          sql.append("WHERE P.CD = " + altCode);
        } else {
          sql.append("WHERE P.CD = '0000'");
        }
        
        if (order != null) {
          sql.append("ORDER BY " + order);
        }
      `;
      const output = renderIR(parseToIR(input)).output;
      
      // Check structure
      expect(output).toContain('◆【条件】A1\tcode != null\tAND');
      expect(output).toContain('\tname != null');
      expect(output).toContain('◆【条件】A1-1\ttype == 1');
      expect(output).toContain('◆【条件】A2\taltCode != null');
      expect(output).toContain('◆【条件】A3\t上記以外');
      expect(output).toContain('◆【条件】B1\torder != null');
    });

    it('Regression: SQL Hint and nested parens (User Report)', () => {
      const input = `
        strSql.append("INSERT /*+ APPEND */ INTO WK_DT_TOKUBAI_GENKA ");
        strSql.append("( ");
        strSql.append("  TENPO_CD ");
        strSql.append(") ");
        strSql.append("SELECT ");
        strSql.append("  HANSOKU2.TENPO_CD AS TENPO_CD ");
        strSql.append("FROM ");
        strSql.append("  DT_HANSOKU HANSOKU2 ");
        strSql.append("WHERE ");
        strSql.append("  HANSOKU2.%%PHYSLOC%% IN ( ");
        strSql.append("    SELECT ");
        strSql.append("      V2.ID ");
        strSql.append("    FROM ");
        strSql.append("      ( ");
        strSql.append("        SELECT ");
        strSql.append("          HANSOKU1.%%PHYSLOC%% AS ID ");
        strSql.append("        FROM DT_HANSOKU HANSOKU1 ");
        strSql.append("      ) V2 ");
        strSql.append("  ) ");
      `;
      const output = renderIR(parseToIR(input)).output;
      expect(output).toContain('INSERT');
      expect(output).toContain('INTO');
      expect(output).toContain('WK_DT_TOKUBAI_GENKA');
      expect(output).toContain('IN');
      expect(output).toContain('SELECT');
    });
  });
});
