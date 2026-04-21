# PROJECT_CONTEXT.md — UniTranslate SQL
Generated: 2026-04-21

## Table of Contents
1. [Project Overview](#project-overview)
2. [Directory Structure](#directory-structure)
3. [Rust Dependencies](#rust-dependencies)
4. [Tauri Config](#tauri-config)
5. [Backend Architecture](#backend-architecture)
    - [Module Map](#module-map)
    - [Tauri Commands](#tauri-commands)
    - [Application State](#application-state)
    - [Event System](#event-system)
    - [Main Setup](#main-setup)
6. [Frontend Architecture](#frontend-architecture)
    - [Invoke Map](#invoke-map)
    - [State Management](#state-management)
    - [Key Components](#key-components)
7. [Error Handling](#error-handling)
8. [Async & Performance](#async--performance)
9. [Known Issues](#known-issues)
10. [Build & Dev](#build--dev)
11. [Summary for AI](#summary-for-ai)

---

## Project Overview
- **Name**: UniTranslate SQL
- **Purpose**: High-performance SQL translation, analysis, and dictionary management tool.
- **Tauri Version**: v2
- **Rust Edition**: 2021
- **Frontend**: React + Vite + TailwindCSS
- **Target Platforms**: Windows (Primary)
- **Status**: Active development

---

## Directory Structure
```text
.agents/           # AI Assistant skills and configurations
.vscode/           # Editor settings
CODING_STANDARDS.md # Guidelines for development
ERROR_HISTORY.md   # Log of past issues and fixes
README.md          # Project overview
build.bat          # Custom Windows build script
package.json       # Node.js dependencies and scripts
src/               # Frontend source code
  assets/          # Static assets (icons, etc.)
  components/      # UI Components
  hooks/           # React custom hooks (IPC, state)
  lib/             # Utility libraries (parsers, etc.)
src-tauri/         # Rust backend source code
  capabilities/    # Tauri v2 security permissions
  icons/           # App icons
  src/             # Rust source code
    commands.rs    # IPC command handlers
    events.rs      # Event definitions
    lib.rs         # Application entry point & setup
    main.rs        # Binary entry point
    parser.rs      # Excel parsing logic
    search.rs      # Dictionary search logic
    state.rs       # Global state management
    storage.rs     # Persistence and caching
  tauri.conf.json  # Tauri configuration
tsconfig.json      # TypeScript configuration
vite.config.ts     # Vite bundler configuration
```

---

## Rust Dependencies

### `src-tauri/Cargo.toml`
```toml
[package]
name = "uni-translate-sql"
version = "0.1.0"
description = "A Tauri App"
authors = ["you"]
edition = "2021"

[dependencies]
tauri = { version = "2", features = [] } # Core Tauri framework
tauri-plugin-opener = "2" # Plugin for opening files/URLs
serde = { version = "1", features = ["derive"] } # Serialization framework
serde_json = "1" # JSON support for serde
calamine = "0.34.0" # High-performance Excel reader
unicode-normalization = "0.1.25" # JA character normalization
once_cell = "1.21.4" # Lazy static initialization
tauri-plugin-dialog = "2" # Native OS dialogs
tauri-plugin-fs = "2" # File system access
regex = "1.12.3" # Regular expressions
aho-corasick = "1.1.4" # High-performance string matching
rayon = "1.10" # Parallel data processing
dashmap = "6.0" # Concurrent hash map
tokio = { version = "1", features = ["full"] } # Async runtime
sha2 = "0.11.0" # Hashing for cache keys
bincode = "1.3.3" # Compact binary serialization
hex = "0.4.3" # Hex encoding for hashes
```

---

## Tauri Config

### `tauri.conf.json`
```json
{
  "$schema": "https://schema.tauri.app/config/2",
  "productName": "UniTranslate SQL",
  "version": "0.1.0",
  "identifier": "com.alias.unitranslate",
  "build": {
    "beforeDevCommand": "npm run dev",
    "devUrl": "http://localhost:1420",
    "beforeBuildCommand": "npm run build",
    "frontendDist": "../dist"
  },
  "app": {
    "windows": [
      {
        "title": "UniTranslate SQL",
        "width": 800,
        "height": 600
      }
    ],
    "security": {
      "csp": null
    }
  },
  "bundle": {
    "active": true,
    "targets": "all",
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ],
    "windows": {
      "nsis": {
        "installMode": "both"
      }
    }
  }
}
```

### `capabilities/default.json`
```json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "default",
  "description": "Capability for the main window",
  "windows": [
    "main"
  ],
  "permissions": [
    "core:default",
    "opener:default",
    "dialog:default",
    "fs:allow-write-text-file",
    "fs:allow-read-text-file",
    "fs:allow-exists"
  ]
}
```

---

## Backend Architecture

### Module Map
- `main.rs`: Entry point, calls `lib::run()`.
- `lib.rs`: Tauri builder setup, plugin registration, and startup state initialization.
- `commands.rs`: Implementation of all IPC commands.
- `state.rs`: Defines `AppState`, `DictionaryEntry`, and dictionary rebuilding logic.
- `parser.rs`: Parallel Excel parsing with NFKC normalization and unescaping.
- `search.rs`: Multi-stage search logic (Exact -> Prefix -> Substring).
- `storage.rs`: Handles persistent config and binary sheet caching (Bincode + SHA256).
- `events.rs`: Type definitions for backend-to-frontend events.

### Tauri Commands

#### `scan_excel_sheets`
- **Signature**: `pub async fn scan_excel_sheets(file_paths: Vec<String>, state: State<'_, AppStateWrapper>, app_handle: AppHandle) -> Result<ScanResult, String>`
- **Purpose**: Quickly scans Excel file structures (sheet names/kinds) without loading full data.
- **State accessed**: Reads/Writes `loaded_files`.
- **Async**: yes
- **Error handling**: Proper `Result<T, String>`.
- **Side effects**: Disk I/O (Excel reading), File Caching.

#### `bulk_translate_v2`
- **Signature**: `pub async fn bulk_translate_v2(text: String, direction: String, state: State<'_, AppStateWrapper>) -> Result<Vec<u8>, String>`
- **Purpose**: Performs high-performance text replacement using Aho-Corasick and a custom binary protocol.
- **State accessed**: Reads `ac_automaton`, `sorted_ja_entries`, etc.
- **Async**: yes (runs replacement in `spawn_blocking`)
- **Error handling**: Proper `Result<T, String>`.
- **Side effects**: Intensive CPU usage during matching.

#### `update_table_selection`
- **Signature**: `pub async fn update_table_selection(selected_cache_keys: Vec<String>, state: State<'_, AppStateWrapper>, app_handle: AppHandle) -> Result<DictionaryStats, String>`
- **Purpose**: Updates which dictionary tables are active and triggers a parallel rebuild of the Aho-Corasick automaton.
- **State accessed**: Writes `active_table_sheets`, `ja_to_en`, `ac_automaton`.
- **Async**: yes
- **Error handling**: Proper `Result<T, String>`.
- **Side effects**: Disk I/O (loading cached sheets), Parallel Rebuild (Rayon).

### Application State
```rust
pub struct AppState {
    pub ja_to_en: HashMap<String, DictionaryEntry>,
    pub en_to_ja: HashMap<String, DictionaryEntry>,
    pub ja_keys_sorted: Vec<String>,
    pub en_keys_sorted: Vec<String>,
    pub loaded_files: HashMap<String, FileInfo>, 
    pub active_table_sheets: HashSet<String>,   
    pub ac_automaton: Option<Arc<AhoCorasick>>,
    pub ac_automaton_en: Option<Arc<AhoCorasick>>,
    pub sorted_ja_entries: Vec<(String, String)>, 
    pub sorted_en_entries: Vec<(String, String)>, 
    pub sheet_owned_ja_keys: HashMap<String, Vec<String>>,
    pub sheet_owned_en_keys: HashMap<String, Vec<String>>,
}

pub struct AppStateWrapper(pub Mutex<AppState>);
```
- **Sync primitives**: `Mutex` for thread safety, `Arc` for sharing the automaton.
- **Initialization**: Created in `lib.rs`, persistent config loaded on startup.

### Event System
| Event name | Payload type | Direction | File |
|------------|-------------|-----------|------|
| `parse-progress` | `ParseProgressEvent` | backend→frontend | `parser.rs` |

### Main Setup
```rust
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .manage(AppStateWrapper(Mutex::new(AppState::new())))
        .setup(|app| {
            // ... Load persistent config & rebuild dictionary ...
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // ... Commands ...
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

---

## Frontend Architecture

### Invoke Map
| Command | Arguments | Return type | File |
|---------|-----------|-------------|------|
| `list_loaded_files` | None | `FileInfo[]` | `useDictionary.ts` |
| `update_table_selection` | `{ selectedCacheKeys }` | `DictionaryStats` | `useDictionary.ts` |
| `get_active_sheets` | None | `string[]` | `useDictionary.ts` |
| `scan_excel_sheets` | `{ filePaths }` | `ScanResult` | `useDictionary.ts` |
| `load_excel_files` | `{ filePaths, selectedTableSheets }` | `LoadResult` | `useDictionary.ts` |
| `remove_file` | `{ filePath }` | `void` | `useDictionary.ts` |
| `toggle_file_enabled` | `{ filePath, enabled }` | `void` | `useDictionary.ts` |
| `reset_dictionary` | None | `void` | `useDictionary.ts` |
| `reload_files` | `{ filePaths, enabled }` | `LoadResult` | `useDictionary.ts` |
| `search` | `{ keyword }` | `SearchResult` | `useDictionary.ts` |
| `bulk_translate_v2` | `{ text, direction }` | `Uint8Array` | `BulkTranslator.tsx` |

### State Management
- **React Hooks**: `useDictionary` and `useTableSelection` manage shared logic.
- **Local State**: `useState` for UI-specific states (active tab, search results).
- **Auto-Sync**: `useTableSelection` implements an auto-apply logic that debounces selection changes and notifies the backend.

### Key Components
- `App.tsx`: Main layout, tab management.
- `FileManager.tsx`: File list, load/remove actions.
- `BulkTranslator.tsx`: Large text area for translation, binary protocol handling.
- `TableSelectorPanel.tsx`: Sidebar for selecting specific Excel sheets.
- `SQLAnalyzerTab.tsx`: specialized tool for analyzing SQL patterns.

---

## Error Handling

### Rust Backend
- `lib.rs:25`: `.lock().unwrap()` (Potential panic on poison).
- `commands.rs`: Lock patterns use `.map_err(|e| e.to_string())?` for graceful errors.
- `parser.rs`: Uses `Result` for file operations, `unwrap_or_else` for safe defaults.

### Frontend
- Most `invoke` calls are wrapped in `try/catch` with `console.error` or `alert`.

---

## Async & Performance
- **Tokio spawn_blocking**: Used in `commands.rs` for long-running tasks like scanning, parsing, and translation matching.
- **Rayon**: Used in `parser.rs` and `state.rs` for multi-core Excel parsing and dictionary merging.
- **Binary Protocol**: `bulk_translate_v2` returns a `Vec<u8>` instead of JSON to minimize serialization overhead for large text.
- **Caching**: SHA256-hashed bincode files in `app_config_dir/cache` prevent redundant parsing of unchanged Excel files.

---

## Known Issues
- `lib.rs`: Initial startup is synchronous during `setup`, which might block window appearance if many files are loaded.
- `BulkTranslator.tsx`: Binary protocol manual byte manipulation is complex and prone to off-by-one errors.
- `state.rs`: `rebuild_dictionary` clears everything and re-merges; incremental updates are not fully implemented.

---

## Build & Dev
- `package.json` scripts: `dev`, `build`, `tauri`.
- `build.bat`: Custom script to ensure prerequisites and environment variables are set before building.
- **Prerequisites**: Node.js, Rust, MSVC, WebView2.

---

## Summary for AI
The project `uni-translate-sql` is a high-performance SQL translation and analysis tool built with Rust (Tauri v2) and React. Its core functionality revolves around managing large dictionaries (from Excel files) and providing real-time text replacement using the Aho-Corasick algorithm.

**Key Architectural Features:**
- **Hybrid State Management**: Rust maintains a global `AppState` with Aho-Corasick automata and sheet caches. The frontend manages UI state and selection logic.
- **Binary Protocol**: Bulk translation uses a custom binary protocol to transfer large amounts of text and match spans efficiently between Rust and JavaScript.
- **Parallel Processing**: Uses `rayon` for parallel Excel parsing and dictionary rebuilding.
- **Persistent Cache**: Sheets are cached as serialized `bincode` files to speed up subsequent loads.
- **Intelligent Selection**: Implements an "Auto-Load" mechanism where relevant dictionary tables are dynamically activated based on the text being translated.

**Potential Areas for Improvement:**
- **Error Handling**: Several `.lock().unwrap()` calls exist which could lead to panics if the Mutex is poisoned.
- **Concurrency**: The `AppState` is locked via a standard `Mutex`, which might block UI updates during heavy rebuilding. Moving to an `ArcSwap` or a more granular locking strategy could improve responsiveness.
- **Memory Usage**: While Aho-Corasick is fast, loading massive dictionaries into RAM could be intensive.
- **Build Process**: The project relies on a custom `build.bat` which might be fragile across different Windows setups.
