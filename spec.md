# Technical Specification: SQL Formatting
## Version: 1.2.0
## Last updated: 2026-04-22 – Modular Refactor & Window Persistence
## Project: uni-translate

### Overview
This document specifies the architecture and requirements for the SQL formatting system integrated into the `uni-translate` suite. The system provides professional-grade query standardization using a modular, trait-based engine designed for extensibility and performance.

### Architecture
The system follows a **Modular Trait-based Pipeline** implemented in Rust:

1. **SqlEngine**: The central orchestrator that coordinates the lexing and processing phases.
2. **Traits**:
   - `Lexer`: Tokenizes SQL input.
   - `SqlProcessor`: Formats or analyzes the token stream.
   - `SqlDialect`: Provides configuration and concrete implementations for specific SQL flavors (TSQL, PostgreSQL, etc.).
3. **Lexical Analysis (Lexer)**: Tokenizes SQL input into discrete units using a recursive descent model.
4. **Formatting Engine (SqlProcessor)**: Processes the token stream using a state-aware writer with configurable indentation and casing.

### Tech Stack
- **Backend Language**: Rust (Tauri 2.0 integration)
- **Frontend Framework**: React + Tailwind CSS v4 + Framer Motion
- **Core Modules**: 
  - `src-tauri/src/sql/`: New modular engine root.
  - `lexer.rs`: Core tokenization logic (legacy bridge).
  - `formatter.rs`: Formatting rules (legacy bridge).
- **Plugins**:
  - `tauri-plugin-window-state`: For position and size persistence.

### Key Features & Requirements
- **Dialect Agnostic**: Core engine logic is separated from dialect-specific rules via traits.
- **Window Persistence**: Automatic restoration of window state across application restarts.
- **Complex Clauses**: Support for CTEs, window functions, and multi-join structures.
- **Performance**: High-speed processing using Rust's zero-cost abstractions.
- **Premium UI**: Animated transitions and full-height responsive layouts for developer productivity.
