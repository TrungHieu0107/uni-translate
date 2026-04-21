use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::sync::{Arc, Mutex};
use tauri::AppHandle;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileInfo {
    pub name: String,
    pub path: String,
    pub entries_count: usize,
    pub enabled: bool,
    pub base_sheets: Vec<SheetMeta>,
    pub table_sheets: Vec<SheetMeta>,
    pub parse_duration_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum SheetKind {
    Base,   // Japanese name -> always load
    Table,  // ASCII name -> user selectable
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DictionaryEntry {
    pub ja: String,
    pub en: String,
    pub en_lower: String,
    pub source_file: String,
    pub source_sheet: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SheetMeta {
    pub name: String,
    pub entry_count: usize,
    pub kind: String, // "Base" | "Table"
    pub cache_key: String, // "path|sheet"
    pub cache_path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SheetCache {
    pub sheet_name: String,
    pub kind: SheetKind,
    pub entries: Vec<DictionaryEntry>,
    pub entry_count: usize,
    pub parse_error: Option<String>,
}

use aho_corasick::AhoCorasick;

pub struct AppState {
    pub ja_to_en: HashMap<String, DictionaryEntry>,
    pub en_to_ja: HashMap<String, DictionaryEntry>,
    pub ja_keys_sorted: Vec<String>,
    pub en_keys_sorted: Vec<String>,
    pub loaded_files: HashMap<String, FileInfo>, // path -> FileInfo
    pub active_table_sheets: HashSet<String>,   // cache_keys
    pub ac_automaton: Option<Arc<AhoCorasick>>,
    pub ac_automaton_en: Option<Arc<AhoCorasick>>,
    pub sorted_ja_entries: Vec<(String, String)>, // (ja, en)
    pub sorted_en_entries: Vec<(String, String)>, // (en, ja)
    
    // Dedicated search dictionary (all sheets from all enabled files)
    pub search_ja_to_en: HashMap<String, DictionaryEntry>,
    pub search_en_to_ja: HashMap<String, DictionaryEntry>,
    pub search_ja_keys_sorted: Vec<String>,
    pub search_en_keys_sorted: Vec<String>,
    
    // RUST-004: Incremental tracking
    pub sheet_owned_ja_keys: HashMap<String, Vec<String>>,
    pub sheet_owned_en_keys: HashMap<String, Vec<String>>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            ja_to_en: HashMap::new(),
            en_to_ja: HashMap::new(),
            ja_keys_sorted: Vec::new(),
            en_keys_sorted: Vec::new(),
            loaded_files: HashMap::new(),
            active_table_sheets: HashSet::new(),
            ac_automaton: None,
            ac_automaton_en: None,
            sorted_ja_entries: Vec::new(),
            sorted_en_entries: Vec::new(),
            search_ja_to_en: HashMap::new(),
            search_en_to_ja: HashMap::new(),
            search_ja_keys_sorted: Vec::new(),
            search_en_keys_sorted: Vec::new(),
            sheet_owned_ja_keys: HashMap::new(),
            sheet_owned_en_keys: HashMap::new(),
        }
    }
}

use rayon::prelude::*;

impl AppState {
    pub fn rebuild_dictionary(&mut self, _app: &AppHandle) {
        println!("Rebuilding dictionary...");
        let start = std::time::Instant::now();
        
        // 1. Clear current dictionaries
        self.ja_to_en.clear();
        self.en_to_ja.clear();
        self.sheet_owned_ja_keys.clear();
        self.sheet_owned_en_keys.clear();

        let mut base_info = Vec::new();
        let mut table_info = Vec::new();

        for file in self.loaded_files.values() {
            if !file.enabled { continue; }
            for sheet in &file.base_sheets {
                base_info.push((sheet.cache_key.clone(), sheet.cache_path.clone()));
            }
            for sheet in &file.table_sheets {
                if self.active_table_sheets.contains(&sheet.cache_key) {
                    table_info.push((sheet.cache_key.clone(), sheet.cache_path.clone()));
                }
            }
        }

        println!("Loading {} base sheets and {} table sheets", base_info.len(), table_info.len());

        // 3. Load sheets in parallel using Rayon
        let load_sheet = |(cache_key, path): (String, String)| -> Option<(String, SheetCache)> {
            let bin = std::fs::read(path).ok()?;
            let sheet_cache = bincode::deserialize::<SheetCache>(&bin).ok()?;
            Some((cache_key, sheet_cache))
        };

        let base_sheets: Vec<(String, SheetCache)> = base_info.into_par_iter()
            .filter_map(load_sheet)
            .collect();
            
        let table_sheets: Vec<(String, SheetCache)> = table_info.into_par_iter()
            .filter_map(load_sheet)
            .collect();

        // 4. Merge into AppState serially (maintaining priority)
        let mut merge_sheet = |cache_key: String, sheet_cache: SheetCache| {
            let mut ja_keys = Vec::new();
            let mut en_keys = Vec::new();

            for entry in sheet_cache.entries {
                if !self.ja_to_en.contains_key(&entry.ja) {
                    ja_keys.push(entry.ja.clone());
                    self.ja_to_en.insert(entry.ja.clone(), entry.clone());
                }
                if !self.en_to_ja.contains_key(&entry.en_lower) {
                    en_keys.push(entry.en_lower.clone());
                    self.en_to_ja.insert(entry.en_lower.clone(), entry.clone());
                }
            }
            self.sheet_owned_ja_keys.insert(cache_key.clone(), ja_keys);
            self.sheet_owned_en_keys.insert(cache_key, en_keys);
        };

        for (key, sheet) in base_sheets {
            merge_sheet(key, sheet);
        }
        for (key, sheet) in table_sheets {
            merge_sheet(key, sheet);
        }

        self.finalize_dictionary();
        let duration = start.elapsed();
        println!("Dictionary rebuild complete in {:?}. Total JA keys: {}", duration, self.ja_to_en.len());
    }

    pub fn rebuild_search_dictionary(&mut self) {
        println!("Rebuilding search dictionary...");
        let start = std::time::Instant::now();
        
        self.search_ja_to_en.clear();
        self.search_en_to_ja.clear();

        let mut all_sheet_info = Vec::new();

        for file in self.loaded_files.values() {
            if !file.enabled { continue; }
            // For search, we load EVERYTHING in enabled files
            for sheet in file.base_sheets.iter().chain(file.table_sheets.iter()) {
                all_sheet_info.push((sheet.cache_key.clone(), sheet.cache_path.clone()));
            }
        }

        println!("Loading {} total sheets for search", all_sheet_info.len());

        let load_sheet = |(cache_key, path): (String, String)| -> Option<(String, SheetCache)> {
            let bin = std::fs::read(path).ok()?;
            let sheet_cache = bincode::deserialize::<SheetCache>(&bin).ok()?;
            Some((cache_key, sheet_cache))
        };

        let all_sheets: Vec<(String, SheetCache)> = all_sheet_info.into_par_iter()
            .filter_map(load_sheet)
            .collect();

        for (_key, sheet_cache) in all_sheets {
            for entry in sheet_cache.entries {
                if !self.search_ja_to_en.contains_key(&entry.ja) {
                    self.search_ja_to_en.insert(entry.ja.clone(), entry.clone());
                }
                if !self.search_en_to_ja.contains_key(&entry.en_lower) {
                    self.search_en_to_ja.insert(entry.en_lower.clone(), entry.clone());
                }
            }
        }

        self.finalize_search_dictionary();
        let duration = start.elapsed();
        println!("Search dictionary rebuild complete in {:?}. Total JA keys: {}", duration, self.search_ja_to_en.len());
    }

    fn finalize_search_dictionary(&mut self) {
        let mut ja_keys: Vec<String> = self.search_ja_to_en.keys().cloned().collect();
        ja_keys.sort();
        let mut en_keys: Vec<String> = self.search_en_to_ja.keys().cloned().collect();
        en_keys.sort();
        
        self.search_ja_keys_sorted = ja_keys;
        self.search_en_keys_sorted = en_keys;
    }


    fn finalize_dictionary(&mut self) {
        let mut ja_keys: Vec<String> = self.ja_to_en.keys().cloned().collect();
        ja_keys.sort();
        let mut en_keys: Vec<String> = self.en_to_ja.keys().cloned().collect();
        en_keys.sort();
        
        self.ja_keys_sorted = ja_keys;
        self.en_keys_sorted = en_keys;

        // Rebuild sorted entries for Bulk Translation (Longest match first)
        let mut sorted_ja: Vec<(String, String)> = self.ja_to_en.iter()
            .map(|(k, v)| (k.clone(), v.en.clone()))
            .collect();
        sorted_ja.sort_by(|a, b| b.0.len().cmp(&a.0.len()));
        self.sorted_ja_entries = sorted_ja;

        let mut sorted_en: Vec<(String, String)> = self.en_to_ja.iter()
            .map(|(k, v)| (k.clone(), v.ja.clone()))
            .collect();
        sorted_en.sort_by(|a, b| b.0.len().cmp(&a.0.len()));
        self.sorted_en_entries = sorted_en;

        // Rebuild AhoCorasick automata
        let patterns_ja: Vec<String> = self.sorted_ja_entries.iter().map(|(ja, _)| ja.clone()).collect();
        self.ac_automaton = if patterns_ja.is_empty() { None } else {
            aho_corasick::AhoCorasick::builder()
                .match_kind(aho_corasick::MatchKind::LeftmostFirst)
                .build(&patterns_ja)
                .ok()
                .map(Arc::new)
        };

        let patterns_en: Vec<String> = self.sorted_en_entries.iter().map(|(en, _)| en.clone()).collect();
        self.ac_automaton_en = if patterns_en.is_empty() { None } else {
            aho_corasick::AhoCorasick::builder()
                .match_kind(aho_corasick::MatchKind::LeftmostFirst)
                .ascii_case_insensitive(true) // Enable case-insensitive matching for English
                .build(&patterns_en)
                .ok()
                .map(Arc::new)
        };
    }
}

pub struct AppStateWrapper(pub Mutex<AppState>);
