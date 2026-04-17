import { describe, it, expect } from 'vitest';
import { resolveAliasesFromSQL } from './sqlAliasResolver';

describe('sqlAliasResolver', () => {

  it('Case 1: subquery alias in FROM', () => {
    const input = `
      SELECT SR.REGION_ID, SR.TOTAL_SALES 
      FROM SALES_REPORTS SR, (
        SELECT REGION_ID, AVG(REVENUE) AS AVG_REVENUE 
        FROM SALES_REPORTS 
        WHERE YEAR = '2023'
        GROUP BY REGION_ID
      ) SUB 
      WHERE SR.REGION_ID = SUB.REGION_ID
        AND SR.TOTAL_SALES > SUB.AVG_REVENUE
    `;

    const result = resolveAliasesFromSQL(input);
    expect(result.aliasMap['SR']).toMatchObject({ kind: "table", name: "SALES_REPORTS", originalAlias: "SR" });
    expect(result.unknownAliases).not.toContain('SUB');
    
    // Normalize spaces for comparison
    const normalize = (s: string) => s.replace(/\s+/g, ' ').trim();
    const expectedOutput = `
      SELECT SALES_REPORTS[SR].REGION_ID, SALES_REPORTS[SR].TOTAL_SALES 
      FROM SALES_REPORTS[SR] SR, (
        SELECT REGION_ID, AVG(REVENUE) AS AVG_REVENUE 
        FROM SALES_REPORTS 
        WHERE YEAR = '2023'
        GROUP BY REGION_ID
      ) SUB 
      WHERE SALES_REPORTS[SR].REGION_ID = SUB.REGION_ID
        AND SALES_REPORTS[SR].TOTAL_SALES > SUB.AVG_REVENUE
    `;
    
    expect(normalize(result.resolvedSQL)).toBe(normalize(expectedOutput));
  });

  it('Case 2: subquery alias in JOIN position', () => {
    const input = `
      SELECT U.USER_NAME, A.BALANCE
      FROM USER_ACCOUNTS U
      INNER JOIN (SELECT ACCT_ID, BALANCE FROM ACCOUNT_LEDGER WHERE STATUS = 'ACTIVE') A ON U.ACCT_ID = A.ACCT_ID
    `;
    const result = resolveAliasesFromSQL(input);
    
    expect(result.aliasMap['U']).toMatchObject({ kind: "table", name: "USER_ACCOUNTS", originalAlias: "U" });
    expect(result.aliasMap['A']?.kind).toBe("subquery");
    
    const normalize = (s: string) => s.replace(/\s+/g, ' ').trim();
    const expectedOutput = `
      SELECT USER_ACCOUNTS[U].USER_NAME, A.BALANCE
      FROM USER_ACCOUNTS[U] U
      INNER JOIN (SELECT ACCT_ID, BALANCE FROM ACCOUNT_LEDGER WHERE STATUS = 'ACTIVE') A ON USER_ACCOUNTS[U].ACCT_ID = A.ACCT_ID
    `;
    expect(normalize(result.resolvedSQL)).toBe(normalize(expectedOutput));
  });

  it('Case 3: CTE', () => {
    const input = `
      WITH DAILY_STATS AS (SELECT USER_ID, COUNT(*) AS LOGIN_COUNT FROM ACTIVITY_LOG GROUP BY USER_ID)
      SELECT P.FULL_NAME, D.LOGIN_COUNT
      FROM PROFILE_MASTER P
      INNER JOIN DAILY_STATS D ON P.UID = D.USER_ID
    `;
    const result = resolveAliasesFromSQL(input);

    expect(result.aliasMap['DAILY_STATS']?.kind).toBe("cte");
    expect(result.aliasMap['P']).toMatchObject({ kind: "table", name: "PROFILE_MASTER", originalAlias: "P" });
    expect(result.aliasMap['D']).toMatchObject({ kind: "table", name: "DAILY_STATS" }); 

    const normalize = (s: string) => s.replace(/\s+/g, ' ').trim();
    const expectedOutput = `
      WITH DAILY_STATS AS (SELECT USER_ID, COUNT(*) AS LOGIN_COUNT FROM ACTIVITY_LOG GROUP BY USER_ID)
      SELECT PROFILE_MASTER[P].FULL_NAME, DAILY_STATS[D].LOGIN_COUNT
      FROM PROFILE_MASTER[P] P
      INNER JOIN DAILY_STATS[D] D ON PROFILE_MASTER[P].UID = DAILY_STATS[D].USER_ID
    `;
    expect(normalize(result.resolvedSQL)).toBe(normalize(expectedOutput));
  });

  it('Case 4: nested subqueries', () => {
    const input = `
      SELECT OUTER_T.VAL
      FROM (SELECT INNER_T.VAL FROM (SELECT VAL FROM SOURCE_DATA) INNER_T) OUTER_T
    `;
    const result = resolveAliasesFromSQL(input);
    expect(result.aliasMap['OUTER_T']?.kind).toBe("subquery");

    const normalize = (s: string) => s.replace(/\s+/g, ' ').trim();
    const expectedOutput = `
      SELECT OUTER_T.VAL
      FROM (SELECT INNER_T.VAL FROM (SELECT VAL FROM SOURCE_DATA) INNER_T) OUTER_T
    `;
    expect(normalize(result.resolvedSQL)).toBe(normalize(expectedOutput));
  });

  it('Case 5: comma FROM + explicit JOIN mixed', () => {
    const input = `
      SELECT I.ITEM_NAME, S.SUPPLIER_NAME, W.LOCATION
      FROM INVENTORY I, SUPPLIERS S
      LEFT JOIN WAREHOUSES W ON I.WH_ID = W.WH_ID
      WHERE I.SUP_ID = S.SUP_ID
    `;
    const result = resolveAliasesFromSQL(input);

    expect(result.aliasMap['I']).toMatchObject({ kind: "table", name: "INVENTORY", originalAlias: "I" });
    expect(result.aliasMap['S']).toMatchObject({ kind: "table", name: "SUPPLIERS", originalAlias: "S" });
    expect(result.aliasMap['W']).toMatchObject({ kind: "table", name: "WAREHOUSES", originalAlias: "W" });

    const normalize = (s: string) => s.replace(/\s+/g, ' ').trim();
    const expectedOutput = `
      SELECT INVENTORY[I].ITEM_NAME, SUPPLIERS[S].SUPPLIER_NAME, WAREHOUSES[W].LOCATION
      FROM INVENTORY[I] I, SUPPLIERS[S] S 
      LEFT JOIN WAREHOUSES[W] W ON INVENTORY[I].WH_ID = WAREHOUSES[W].WH_ID
      WHERE INVENTORY[I].SUP_ID = SUPPLIERS[S].SUP_ID
    `;
    
    const actual = normalize(result.resolvedSQL).replace(/ ,/g, ',');
    const expected = normalize(expectedOutput).replace(/ ,/g, ',');
    expect(actual).toBe(expected);
  });

  it('Case 6: __DYNAMIC__ Mapping and Alias Normalization', () => {
    const input = `
      SELECT PROFILE.USER_ID, RPROFILE.LAST_LOGIN 
      FROM __DYNAMIC__ PROFILE
      INNER JOIN __DYNAMIC__ RPROFILE ON PROFILE.USER_ID = RPROFILE.USER_ID
    `;
    
    const tableMappings = {
      'PROFILE': 'USER_DETAILS',
      'RPROFILE': 'USER_DETAILS'
    };

    const result = resolveAliasesFromSQL(input, tableMappings);
    
    const normalize = (s: string) => s.replace(/\s+/g, ' ').trim();
    const expectedOutput = `
      SELECT USER_DETAILS[PROFILE].USER_ID, USER_DETAILS[PROFILE].LAST_LOGIN 
      FROM USER_DETAILS[PROFILE] PROFILE
      INNER JOIN USER_DETAILS[PROFILE] PROFILE ON USER_DETAILS[PROFILE].USER_ID = USER_DETAILS[PROFILE].USER_ID
    `;
    
    expect(normalize(result.resolvedSQL)).toBe(normalize(expectedOutput));
  });
});
