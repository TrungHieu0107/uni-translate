use crate::state::{AppState, DictionaryEntry};
use serde::Serialize;
use crate::parser::{normalize_ja, unescape};

#[derive(Serialize)]
pub struct SearchSnippet {
    pub ja: String,
    pub en: String,
    pub source_sheet: String,
    pub source_file: String,
}

#[derive(Serialize)]
pub struct SearchResult {
    pub exact: Vec<SearchSnippet>,
    pub prefix: Vec<SearchSnippet>,
    pub substring: Vec<SearchSnippet>,
}

fn to_snippet(e: &DictionaryEntry) -> SearchSnippet {
    SearchSnippet {
        ja: e.ja.clone(),
        en: e.en.clone(),
        source_sheet: e.source_sheet.clone(),
        source_file: e.source_file.clone(),
    }
}

pub fn search(keyword: &str, state: &AppState) -> SearchResult {
    let unescaped_kw = unescape(keyword);
    let kw_norm = normalize_ja(&unescaped_kw);
    let kw_lower = kw_norm.to_lowercase();
    
    let mut exact_matches = Vec::new();
    let mut prefix_matches = Vec::new();
    let mut substring_matches = Vec::new();
    
    // Track what we added to avoid duplicates across exact/prefix/substring
    let mut seen = std::collections::HashSet::new();

    let is_ascii = kw_lower.is_ascii();
    
    // 1. Exact Match
    if let Some(entry) = state.ja_to_en.get(&kw_norm) {
        exact_matches.push(entry.clone());
        seen.insert(entry.ja.clone());
    }
    if let Some(entry) = state.en_to_ja.get(&kw_lower) {
        if !seen.contains(&entry.ja) {
            exact_matches.push(entry.clone());
            seen.insert(entry.ja.clone());
        }
    }

    // 2. Prefix Match
    if !kw_norm.is_empty() {
        // Japanese prefix
        let start_idx = match state.ja_keys_sorted.binary_search(&kw_norm) {
            Ok(idx) => idx + 1, // Skip exact match
            Err(idx) => idx,
        };
        
        let mut curr = start_idx;
        while curr < state.ja_keys_sorted.len() {
            let key = &state.ja_keys_sorted[curr];
            if key.starts_with(&kw_norm) {
                if !seen.contains(key) {
                    if let Some(entry) = state.ja_to_en.get(key) {
                        prefix_matches.push(entry.clone());
                        seen.insert(key.clone());
                    }
                }
                curr += 1;
            } else {
                break;
            }
        }
        
        // English prefix
        if is_ascii {
            let start_idx = match state.en_keys_sorted.binary_search(&kw_lower) {
                Ok(idx) => idx + 1,
                Err(idx) => idx,
            };
            
            let mut curr = start_idx;
            while curr < state.en_keys_sorted.len() {
                let key = &state.en_keys_sorted[curr];
                if key.starts_with(&kw_lower) {
                    if let Some(entry) = state.en_to_ja.get(key) {
                        if !seen.contains(&entry.ja) {
                            prefix_matches.push(entry.clone());
                            seen.insert(entry.ja.clone());
                        }
                    }
                    curr += 1;
                } else {
                    break;
                }
            }
        }
    }

    // 3. Substring Match
    if kw_norm.chars().count() >= 2 {
        for entry in state.ja_to_en.values() {
            if seen.contains(&entry.ja) {
                continue;
            }
            if entry.ja.contains(&kw_norm) || entry.en_lower.contains(&kw_lower) {
                substring_matches.push(entry.clone());
                seen.insert(entry.ja.clone());
            }
        }
    }
    
    // Sort matches
    prefix_matches.sort_by(|a, b| a.ja.cmp(&b.ja));
    substring_matches.sort_by(|a, b| a.ja.cmp(&b.ja));

    // Limit outputs
    let max_results = 200;
    
    SearchResult {
        exact: exact_matches.into_iter().take(max_results).map(|e| to_snippet(&e)).collect(),
        prefix: prefix_matches.into_iter().take(max_results).map(|e| to_snippet(&e)).collect(),
        substring: substring_matches.into_iter().take(max_results).map(|e| to_snippet(&e)).collect(),
    }
}
