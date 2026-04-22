import { describe, it, expect } from 'vitest';
import { parseJavaSQL } from "./java-code-parser";

/**
 * Unit tests for Java SQL Code Parser
 * Covers Single-Buffer UPDATE, SELECT, and Dual-Buffer patterns.
 */

const SAMPLE_UPDATE_SINGLE_BUFFER = `
    public void updateInventoryStatus() {
        StringBuffer strSql = new StringBuffer();
        strSql.append("UPDATE INVENTORY_STOCK STOCK ");
        strSql.append("  SET ");
        strSql.append("      SUPPLIER_CODE = MANIFEST.SUPPLIER_CODE ");
        strSql.append("      , STATUS_FLAGS = MANIFEST.STATUS_FLAGS ");
        strSql.append("      , LAST_BATCH_ID = MANIFEST.BATCH_ID ");
        strSql.append("      , QTY_ON_HAND = MANIFEST.TOTAL_QTY ");
        strSql.append("      , UNIT_PRICE = MANIFEST.COST_PX ");
        strSql.append("  FROM INVENTORY_STOCK STOCK ");
        strSql.append("  INNER JOIN SHIPMENT_MANIFEST MANIFEST ");
        strSql.append("    ON MANIFEST.LOC_ID = STOCK.LOC_ID ");
        strSql.append("    AND MANIFEST.SKU_CD = STOCK.SKU_CD ");
        strSql.append("  WHERE STOCK.IS_DELETED = '0' ");
    }
`;

const SAMPLE_INSERT_DUAL_BUFFER = `
    public void logAuditRecord(boolean includePayload) {
        StringBuffer sql1 = new StringBuffer();
        StringBuffer sql2 = new StringBuffer();
        sql1.append("INSERT INTO APP_AUDIT_LOG (");
        sql2.append("VALUES (");
        
        sql1.append("EVENT_TIMESTAMP,");
        sql2.append("CURRENT_TIMESTAMP,");
        
        if (includePayload) {
            sql1.append("PAYLOAD_BLOB,");
            sql2.append("?,");
        }
        
        sql1.append(")");
        sql2.append(")");
    }
`;

describe('javaCodeParser', () => {
    it('should parse Single Buffer UPDATE correctly', () => {
        const res = parseJavaSQL(SAMPLE_UPDATE_SINGLE_BUFFER);
        expect(res.length).toBe(1);
        expect(res[0].type).toBe("UPDATE");
        expect(res[0].tableName).toBe("INVENTORY_STOCK");
        expect(res[0].columns.some(c => c.en === "SUPPLIER_CODE")).toBe(true);
        expect(res[0].tables.some(t => t.name === "SHIPMENT_MANIFEST")).toBe(true);
    });

    it('should parse Dual Buffer INSERT correctly', () => {
        const res = parseJavaSQL(SAMPLE_INSERT_DUAL_BUFFER);
        expect(res.length).toBe(2);
        const pathWithPayload = res.find(p => p.conditions["includePayload"] === true);
        expect(pathWithPayload?.columns.some(c => c.en === "PAYLOAD_BLOB")).toBe(true);
    });

    it('should parse chained appends correctly', () => {
        const code = `
            public void testChained() {
                StringBuffer strSql = new StringBuffer();
                strSql.append("SELECT * FROM USERS ");
                strSql.append( " WHERE SUBSYSTEM_ID = '" ).append( mst000101_ConstDictionary.SUBSYSTEM_DIVISION ).append( "' " );
		        strSql.append( " AND PARAMETER_ID = '" ).append( mst000101_ConstDictionary.TAIEKI_STOP_NEXT_START_TENPO_CD ).append( "' " );
            }
        `;
        const res = parseJavaSQL(code);
        expect(res.length).toBe(1);
        expect(res[0].type).toBe("SELECT");
        expect(res[0].tableName).toBe("USERS");
        expect(res[0].columns.some(c => c.en === "SUBSYSTEM_ID")).toBe(true);
        expect(res[0].columns.some(c => c.en === "PARAMETER_ID")).toBe(true);
        // Also verify the dynamic values are captured correctly without syntax errors
        expect(res[0].fullSql).toContain("mst000101_ConstDictionary.SUBSYSTEM_DIVISION");
    });
});
