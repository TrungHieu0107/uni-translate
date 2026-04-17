use crate::state::{AppStateWrapper, FileInfo};
use crate::parser::{parse_excel_file, remove_excel_file};
use crate::search::{search as perform_search, SearchResult};
use crate::storage::save_config;
use serde::Serialize;
use tauri::{State, AppHandle};
use aho_corasick::{AhoCorasick, MatchKind};

#[derive(Serialize)]
pub struct LoadResult {
    pub total_entries: usize,
    pub files: Vec<FileInfo>,
}

#[tauri::command]
pub fn load_excel_files(file_paths: Vec<String>, state: State<'_, AppStateWrapper>, app_handle: AppHandle) -> Result<LoadResult, String> {
    let mut app_state = state.0.lock().map_err(|e| e.to_string())?;
    
    for path in &file_paths {
        if app_state.loaded_files.contains_key(path) {
            continue;
        }
        match parse_excel_file(path, &mut app_state) {
            Ok(_) => {},
            Err(e) => return Err(format!("Failed to parse {}: {}", path, e)),
        }
    }
    
    save_config(&app_state, &app_handle);
    
    let mut files: Vec<FileInfo> = app_state.loaded_files.values().cloned().collect();
    files.sort_by(|a, b| a.name.cmp(&b.name));
    
    Ok(LoadResult {
        total_entries: app_state.ja_to_en.len(),
        files,
    })
}

#[tauri::command]
pub fn reload_files(file_paths: Vec<String>, state: State<'_, AppStateWrapper>, app_handle: AppHandle) -> Result<LoadResult, String> {
    let mut app_state = state.0.lock().map_err(|e| e.to_string())?;
    
    for path in &file_paths {
        // Force parse regardless of existence to refresh content
        match parse_excel_file(path, &mut app_state) {
            Ok(_) => {},
            Err(e) => return Err(format!("Failed to reload {}: {}", path, e)),
        }
    }
    
    save_config(&app_state, &app_handle);
    
    let mut files: Vec<FileInfo> = app_state.loaded_files.values().cloned().collect();
    files.sort_by(|a, b| a.name.cmp(&b.name));
    
    Ok(LoadResult {
        total_entries: app_state.ja_to_en.len(),
        files,
    })
}

#[tauri::command]
pub fn search(keyword: String, state: State<'_, AppStateWrapper>) -> Result<SearchResult, String> {
    let app_state = state.0.lock().map_err(|e| e.to_string())?;
    Ok(perform_search(&keyword, &app_state))
}

#[tauri::command]
pub fn list_loaded_files(state: State<'_, AppStateWrapper>) -> Result<Vec<FileInfo>, String> {
    let app_state = state.0.lock().map_err(|e| e.to_string())?;
    let mut files: Vec<FileInfo> = app_state.loaded_files.values().cloned().collect();
    files.sort_by(|a, b| a.name.cmp(&b.name));
    Ok(files)
}

#[tauri::command]
pub fn remove_file(file_path: String, state: State<'_, AppStateWrapper>, app_handle: AppHandle) -> Result<(), String> {
    let mut app_state = state.0.lock().map_err(|e| e.to_string())?;
    remove_excel_file(&file_path, &mut app_state);
    save_config(&app_state, &app_handle);
    Ok(())
}

#[tauri::command]
pub fn toggle_file_enabled(file_path: String, enabled: bool, state: State<'_, AppStateWrapper>, app_handle: AppHandle) -> Result<(), String> {
    let mut app_state = state.0.lock().map_err(|e| e.to_string())?;
    if let Some(info) = app_state.loaded_files.get_mut(&file_path) {
        info.enabled = enabled;
        app_state.rebuild_index();
    }
    save_config(&app_state, &app_handle);
    Ok(())
}

#[tauri::command]
pub fn toggle_all_files(enabled: bool, state: State<'_, AppStateWrapper>, app_handle: AppHandle) -> Result<(), String> {
    let mut app_state = state.0.lock().map_err(|e| e.to_string())?;
    for info in app_state.loaded_files.values_mut() {
        info.enabled = enabled;
    }
    app_state.rebuild_index();
    save_config(&app_state, &app_handle);
    Ok(())
}

#[tauri::command]
pub fn reset_dictionary(state: State<'_, AppStateWrapper>, app_handle: AppHandle) -> Result<(), String> {
    let mut app_state = state.0.lock().map_err(|e| e.to_string())?;
    app_state.ja_to_en.clear();
    app_state.en_to_ja.clear();
    app_state.ja_keys_sorted.clear();
    app_state.en_keys_sorted.clear();
    app_state.loaded_files.clear();
    app_state.file_entries.clear();
    save_config(&app_state, &app_handle);
    Ok(())
}

#[derive(Serialize)]
pub struct TranslateSegment {
    pub text: String,
    pub match_id: Option<usize>,
}

#[derive(Serialize)]
pub struct BulkTranslateResponse {
    pub input_segments: Vec<TranslateSegment>,
    pub output_segments: Vec<TranslateSegment>,
    pub output_text: String,
}

#[tauri::command]
pub fn bulk_translate(text: String, direction: String, state: State<'_, AppStateWrapper>) -> Result<BulkTranslateResponse, String> {
    let app_state = state.0.lock().map_err(|e| e.to_string())?;

    if app_state.ja_to_en.is_empty() || text.trim().is_empty() {
        return Ok(BulkTranslateResponse {
            input_segments: vec![TranslateSegment { text: text.clone(), match_id: None }],
            output_segments: vec![TranslateSegment { text: text.clone(), match_id: None }],
            output_text: text,
        });
    }

    let (patterns, replacements): (Vec<String>, Vec<String>) = if direction == "en_to_ja" {
        let mut entries: Vec<_> = app_state.en_to_ja.values().collect();
        entries.sort_by(|a, b| b.en.len().cmp(&a.en.len()));
        
        let mut p = Vec::with_capacity(entries.len());
        let mut r = Vec::with_capacity(entries.len());
        for entry in entries {
            p.push(entry.en.clone());
            r.push(entry.ja.clone());
        }
        (p, r)
    } else {
        let mut entries: Vec<_> = app_state.ja_to_en.values().collect();
        entries.sort_by(|a, b| b.ja.len().cmp(&a.ja.len()));
        
        let mut p = Vec::with_capacity(entries.len());
        let mut r = Vec::with_capacity(entries.len());
        for entry in entries {
            p.push(entry.ja.clone());
            r.push(entry.en.clone());
        }
        (p, r)
    };

    let ac = match AhoCorasick::builder()
        .ascii_case_insensitive(direction == "en_to_ja")
        .match_kind(MatchKind::LeftmostFirst)
        .build(&patterns) {
        Ok(ac) => ac,
        Err(e) => return Err(format!("Failed to build search index: {}", e)),
    };

    let mut input_segments = Vec::new();
    let mut output_segments = Vec::new();
    let mut last_match_end = 0;
    let text_bytes = text.as_bytes();

    for mat in ac.find_iter(&text) {
        let start = mat.start();
        let end = mat.end();
        let pattern_id = mat.pattern().as_usize();
        
        let mut is_valid = true;
        if direction == "en_to_ja" {
            let prev_char_valid = start == 0 || (!text_bytes[start - 1].is_ascii_alphanumeric() && text_bytes[start - 1] != b'_');
            let next_char_valid = end == text.len() || (!text_bytes[end].is_ascii_alphanumeric() && text_bytes[end] != b'_');
            if !prev_char_valid || !next_char_valid {
                is_valid = false;
            }
        }

        if is_valid {
            // Add previous plain text
            if start > last_match_end {
                let plain_text = text[last_match_end..start].to_string();
                input_segments.push(TranslateSegment { text: plain_text.clone(), match_id: None });
                output_segments.push(TranslateSegment { text: plain_text, match_id: None });
            }
            
            // Add matched segment
            let original_match = text[start..end].to_string();
            let translated_match = replacements[pattern_id].clone();
            
            input_segments.push(TranslateSegment { text: original_match, match_id: Some(pattern_id) });
            output_segments.push(TranslateSegment { text: translated_match, match_id: Some(pattern_id) });
            
            last_match_end = end;
        }
    }
    
    // Add final chunk
    if last_match_end < text.len() {
        let final_text = text[last_match_end..].to_string();
        input_segments.push(TranslateSegment { text: final_text.clone(), match_id: None });
        output_segments.push(TranslateSegment { text: final_text, match_id: None });
    }

    let output_text = output_segments.iter().map(|s| s.text.as_str()).collect::<Vec<_>>().join("");

    Ok(BulkTranslateResponse {
        input_segments,
        output_segments,
        output_text,
    })
}
