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
            sheet_owned_ja_keys: HashMap::new(),
            sheet_owned_en_keys: HashMap::new(),
        }
    }

    pub fn rebuild_dictionary(&mut self, app: &AppHandle) {
        self.ja_to_en.clear();
        self.en_to_ja.clear();
        self.sheet_owned_ja_keys.clear();
        self.sheet_owned_en_keys.clear();

        println!("Rebuilding dictionary...");

        // 1. Gather enabled sheets, prioritized: Base sheets first
        let mut base_keys = Vec::new();
        let mut table_keys = Vec::new();

        for file in self.loaded_files.values() {
            if !file.enabled { continue; }
            
            // Collect Base sheets
            for sheet in &file.base_sheets {
                base_keys.push(sheet.cache_key.clone());
            }
            
            // Collect Active Table sheets
            for sheet in &file.table_sheets {
                if self.active_table_sheets.contains(&sheet.cache_key) {
                    table_keys.push(sheet.cache_key.clone());
                }
            }
        }

        println!("Loading {} base sheets and {} table sheets", base_keys.len(), table_keys.len());

        // 2. Load from disk and merge - Base sheets first
        for cache_key in base_keys {
            self.load_and_merge_sheet(app, &cache_key);
        }
        
        // Then Table sheets (can overwrite base if conflict, or we can keep it as is)
        for cache_key in table_keys {
            self.load_and_merge_sheet(app, &cache_key);
        }

        self.finalize_dictionary();
        println!("Dictionary rebuild complete. Total JA keys: {}", self.ja_to_en.len());
    }

    fn load_and_merge_sheet(&mut self, app: &AppHandle, cache_key: &str) {
        if let Some(path) = crate::storage::get_sheet_cache_path(app, cache_key) {
            if let Ok(bin) = std::fs::read(path) {
                if let Ok(sheet_cache) = bincode::deserialize::<SheetCache>(&bin) {
                    let mut ja_keys = Vec::new();
                    let mut en_keys = Vec::new();

                    for entry in sheet_cache.entries {
                        // In case of conflict, we don't overwrite existing entries 
                        // (priority is naturally given by the order in rebuild_dictionary: Base first)
                        if !self.ja_to_en.contains_key(&entry.ja) {
                            ja_keys.push(entry.ja.clone());
                            self.ja_to_en.insert(entry.ja.clone(), entry.clone());
                        }
                        if !self.en_to_ja.contains_key(&entry.en_lower) {
                            en_keys.push(entry.en_lower.clone());
                            self.en_to_ja.insert(entry.en_lower.clone(), entry.clone());
                        }
                    }
                    self.sheet_owned_ja_keys.insert(cache_key.to_string(), ja_keys);
                    self.sheet_owned_en_keys.insert(cache_key.to_string(), en_keys);
                }
            }
        }
    }

    pub fn add_sheet_incremental(&mut self, app: &AppHandle, cache_key: &str) {
        self.load_and_merge_sheet(app, cache_key);
        self.finalize_dictionary();
    }

    pub fn remove_sheet_incremental(&mut self, cache_key: &str) {
        if let Some(ja_keys) = self.sheet_owned_ja_keys.remove(cache_key) {
            for key in ja_keys {
                self.ja_to_en.remove(&key);
            }
        }
        if let Some(en_keys) = self.sheet_owned_en_keys.remove(cache_key) {
            for key in en_keys {
                self.en_to_ja.remove(&key);
            }
        }
        self.finalize_dictionary();
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
                .build(&patterns_en)
                .ok()
                .map(Arc::new)
        };
    }
}

pub struct AppStateWrapper(pub Mutex<AppState>);
