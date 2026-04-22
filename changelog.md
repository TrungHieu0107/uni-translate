# Changelog
## Version: 0.2.0
## Last updated: 2026-04-22 – SQL Formatter Quality Finalization
## Project: uni-translate

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

### [0.2.0] - 2026-04-22
#### Fixed
- Syntax error in `tailwind.config.js` preventing production builds.
- Space merging bug in SQL formatter for non-`AS` column aliases.
- Duplicate comma rendering in column lists.

#### Added
- Comprehensive Rust unit tests for the SQL formatting engine.
- `ADR-0001` documentation for the SQL formatting pipeline.
- Version bump for quality stabilization.

### [0.1.1] - 2026-04-22
#### Added
- SQL Lexer module for robust query tokenization.
- SQL Formatter module with support for CTEs, window functions, and complex joins.
- `format_sql` Tauri command for external SQL formatting.
- Integrated automatic SQL formatting into the `analyze_sql` command.
- **SQL Formatter Pro Tab**: A new, premium UI tab dedicated to query standardization, featuring Framer Motion animations, glassmorphism, and loading shimmer effects.
