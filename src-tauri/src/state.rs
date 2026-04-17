use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Mutex;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileInfo {
    pub name: String,
    pub path: String,
    pub entries_count: usize,
    pub enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DictionaryEntry {
    pub ja: String,
    pub en: String,
    pub source_file: String,
    pub source_path: String,
}

pub struct AppState {
    pub ja_to_en: HashMap<String, DictionaryEntry>,
    pub en_to_ja: HashMap<String, DictionaryEntry>, // key is lowercased EN
    pub ja_keys_sorted: Vec<String>,
    pub en_keys_sorted: Vec<String>,             // lowercased
    pub loaded_files: HashMap<String, FileInfo>, // path -> FileInfo
    pub file_entries: HashMap<String, Vec<DictionaryEntry>>, // path -> original entries
}

impl AppState {
    pub fn new() -> Self {
        Self {
            ja_to_en: HashMap::new(),
            en_to_ja: HashMap::new(),
            ja_keys_sorted: Vec::new(),
            en_keys_sorted: Vec::new(),
            loaded_files: HashMap::new(),
            file_entries: HashMap::new(),
        }
    }

    pub fn rebuild_index(&mut self) {
        self.ja_to_en.clear();
        self.en_to_ja.clear();

        // Use a consistent order (sorted by path) to ensure predictable "last-write wins" behavior
        let mut paths: Vec<String> = self.loaded_files.keys().cloned().collect();
        paths.sort();

        for path in paths {
            if let Some(info) = self.loaded_files.get(&path) {
                if info.enabled {
                    if let Some(entries) = self.file_entries.get(&path) {
                        for entry in entries {
                            self.ja_to_en.insert(entry.ja.clone(), entry.clone());
                            self.en_to_ja.insert(entry.en.to_lowercase(), entry.clone());
                        }
                    }
                }
            }
        }

        self.rebuild_sorted_keys();
    }

    pub fn rebuild_sorted_keys(&mut self) {
        self.ja_keys_sorted = self.ja_to_en.keys().cloned().collect();
        self.ja_keys_sorted.sort();

        self.en_keys_sorted = self.en_to_ja.keys().cloned().collect();
        self.en_keys_sorted.sort();
    }
}

pub struct AppStateWrapper(pub Mutex<AppState>);
