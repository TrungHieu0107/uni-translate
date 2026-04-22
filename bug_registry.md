# Bug Registry: SQL Formatter
## Version: 1.0.0
## Last updated: 2026-04-22 – Initial bug registry
## Project: uni-translate

### Resolved Bugs

| ID | Title | Severity | Status | Description | Fix |
|---|---|---|---|---|---|
| BUG-001 | Alias Merging | High | Fixed | Column aliases without `AS` keyword merged with identifiers (e.g. `col alias` -> `colalias`). | Modified `do_expr` to stop at identifiers in `Sp::Col` mode and handle them in `alias` function. |
| BUG-002 | Build Failure | Critical | Fixed | Production build failed due to syntax error (extra braces) in `tailwind.config.js`. | Cleaned up and restructured `tailwind.config.js`. |
| BUG-003 | Duplicate Commas | Minor | Fixed | `do_col_list` rendered duplicate commas in some nested scenarios. | Cleaned up comma handling logic in `formatter.rs`. |
| BUG-004 | AS Keyword Drop | Medium | Fixed | The formatter consumed the `AS` keyword but didn't write it to output. | Updated `alias` function to write `AS` if it was present in the input stream. |

### Known Issues
- None currently identified.
