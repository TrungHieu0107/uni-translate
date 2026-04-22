# Technical Specification: SQL Formatting
## Version: 1.1.0
## Last updated: 2026-04-22 – Finalized implementation and quality audit
## Project: uni-translate

### Overview
This document specifies the architecture and requirements for the SQL formatting system integrated into the `uni-translate` suite. The system provides professional-grade query standardization for complex SQL including CTEs, window functions, and set operators.

### Architecture
The system follows a high-performance **Lexer -> Token Stream -> Formatter** pipeline implemented in Rust.

1. **Lexical Analysis (Lexer)**: Tokenizes SQL input into discrete units (Keywords, Identifiers, Operators, Strings, Numbers, Comments) using a recursive descent-style consumption model.
2. **Formatting Engine (Formatter)**: Processes the token stream using a state-aware writer. It manages:
   - **Indentation Levels**: Tracks query depth for subqueries and nested clauses.
   - **Clause Context**: Specific formatting rules for `SELECT`, `FROM`, `WHERE`, `JOIN`, `SET` operators.
   - **Whitespace Polish**: Ensures single spacing between identifiers and keywords, preserved or optional `AS` aliases, and clean punctuation.

### Tech Stack
- **Backend Language**: Rust (Tauri integration)
- **Frontend Framework**: React + Tailwind CSS + Framer Motion
- **Modules**: 
  - `lexer.rs`: Core tokenization logic.
  - `formatter.rs`: Formatting rules and stateful writer.
  - `commands.rs`: Tauri command interface (`format_sql`).

### Key Features & Requirements
- **Complex Clauses**: Support for CTEs (`WITH` clauses), window functions (`OVER`), and `CASE` statements.
- **Join Management**: Proper indentation for `JOIN` conditions (`ON` clauses) and table aliases.
- **Set Operators**: Enhanced whitespace and newline management for `UNION ALL`, `INTERSECT`, and `EXCEPT`.
- **Quality Assurance**: Unit testing coverage for all major SQL structures in `formatter.rs`.
- **Performance**: Sub-millisecond formatting for standard queries (< 1000 tokens).
