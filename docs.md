# Documentation: SQL Formatter
## Version: 1.1.0
## Last updated: 2026-04-22 – Final documentation audit
## Project: uni-translate

### Usage Instructions

#### Tauri Commands
The backend exposes the following commands for SQL handling:

1. **`format_sql`**
   - **Arguments**: `query: String`
   - **Returns**: `String` (formatted SQL)
   - **Description**: Standardizes the formatting of any provided SQL query.

2. **`analyze_sql`**
   - **Arguments**: `query: String`
   - **Returns**: `SqlAnalysis` object
   - **Description**: Performs structural analysis of the query (CTEs, tables, complexity) and returns a `formatted_sql` field containing the cleaned-up query.

### User Interface

#### SQL Formatter Pro Tab
The application features a dedicated **SQL Formatter Pro** tab accessible from the main navigation.
- **Features**:
  - Split-screen layout (Input vs. Output).
  - Real-time formatting with animated transitions.
  - Copy-to-clipboard integration.
  - Shimmer effects and professional loading states.
- **Persistence**: Your input SQL is automatically saved to local storage so you don't lose work between sessions.

### Technical Reference

#### Implementation Details
- **Architecture**: Lexer -> Token Stream -> Formatter (Rust). See `architecture.md` for details.
- **Testing**: Comprehensive unit tests are located in `src-tauri/src/formatter.rs`. Run with `cargo test`.
- **Decisions**: Key architectural choices are documented in `adr/ADR-0001-sql-formatter-pipeline.md`.

### Examples

#### JavaScript/TypeScript Call
```typescript
import { invoke } from "@tauri-apps/api/core";

const formatted = await invoke("format_sql", { query: "SELECT * FROM users WHERE id=1" });
/* Result:
SELECT 
	*
FROM
	users
WHERE 
	id = 1
*/
```

### Configuration
Formatting rules (indentation, keywords, casing) are centralized in `formatter.rs`. Modifications to formatting behavior should be tested using the built-in unit tests to prevent regressions.
