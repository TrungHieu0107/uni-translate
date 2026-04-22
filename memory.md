# Project Memory
## Version: 0.2.0
## Last updated: 2026-04-22 – SQL Formatter Quality Finalization
## Project: uni-translate

### Change Log

| Date | Reason | Original | New |
|---|---|---|---|
| 2026-04-22 | Integrate SQL formatter | No SQL formatting in Tauri commands | Added `lexer` and `formatter` modules, added `format_sql` command, and updated `analyze_sql` |
| 2026-04-22 | Create SQL Formatter Tab | No dedicated formatting UI | Created `SQLFormatterTab` component with Framer Motion animations and "Pro" design, integrated into `App.tsx` navigation |
| 2026-04-22 | Quality & Stability | Build failures and missing tests | Fixed `tailwind.config.js` syntax error. Added backend unit tests for `formatter.rs`. Created ADR-0001. Fixed alias spacing bug in formatter. |
