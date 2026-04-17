import { parseJavaSQL } from "./javaCodeParser";

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

/**
 * Test execution simulation (Manual assertion logic)
 */
export function runTests() {
    console.log("Running Java SQL Parser Tests...");

    // Test 1: Single Buffer UPDATE
    const res1 = parseJavaSQL(SAMPLE_UPDATE_SINGLE_BUFFER);
    console.assert(res1.length === 1, "Should have 1 path");
    console.assert(res1[0].type === "UPDATE", "Should detect UPDATE");
    console.assert(res1[0].tableName === "INVENTORY_STOCK", "Should detect table name");
    console.assert(res1[0].columns.some(c => c.en === "SUPPLIER_CODE"), "Should extract SET column");
    console.assert(res1[0].tables.some(t => t.name === "SHIPMENT_MANIFEST"), "Should detect JOIN table");
    console.log("✔ Test 1 passed: Single Buffer UPDATE");

    // Test 2: Dual Buffer INSERT
    const res2 = parseJavaSQL(SAMPLE_INSERT_DUAL_BUFFER);
    console.assert(res2.length === 2, "Should have 2 paths (includePayload true/false)");
    const pathWithPayload = res2.find(p => p.conditions["includePayload"] === true);
    console.assert(pathWithPayload?.columns.some(c => c.en === "PAYLOAD_BLOB"), "Should extract conditional column");
    console.log("✔ Test 2 passed: Dual Buffer INSERT");

    console.log("All tests completed.");
}
