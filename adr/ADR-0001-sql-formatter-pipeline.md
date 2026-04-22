# ADR-0001: SQL Formatter Pipeline Architecture

## Status
Accepted

## Context
The application requires a robust SQL formatting feature to standardize user input. Previously, the analysis was performed on raw input, which often contained inconsistent formatting, making the resulting standardized SQL (if any) unpredictable.

## Decision
We implemented a multi-stage pipeline for SQL processing:
1. **Lexical Analysis (Lexer)**: Tokenizes the SQL string into a stream of meaningful tokens (Keywords, Identifiers, Operators, etc.) in Rust.
2. **Standardization (Formatter)**: Processes the token stream to re-apply indentation, casing, and spacing rules.
3. **Integration**: The formatted SQL is then returned as part of the `SqlAnalysis` object.

Key architectural choices:
- **Rust Backend**: The core logic resides in Rust for performance and cross-platform consistency (Desktop app via Tauri).
- **Rule-Based Formatting**: We chose a custom rule-based approach over a generic SQL parser to handle partial or dialect-specific SQL more gracefully.
- **Frontend Sync**: The frontend persists the last query in `localStorage` to provide a persistent "IDE-like" experience.

## Consequences
- **Pros**:
    - High performance (Rust is significantly faster than JS for large SQL).
    - Predictable output (Lexer-Formatter model is easier to unit test).
    - Reduced frontend complexity (Frontend only handles display and state).
- **Cons**:
    - Increased backend binary size (minimal).
    - Maintenance of custom SQL rules requires Rust knowledge.

## Alternatives Considered
- **Client-side Formatting (JS)**: Rejected due to performance concerns with large complex queries and limited robust SQL formatting libraries that fit the design system.
- **External API**: Rejected to maintain offline functionality and privacy.
