use crate::state::{AppStateWrapper, FileInfo};
use crate::parser::{parse_excel_file_parallel};
use crate::search::{search as perform_search, SearchResult};
use crate::storage::{save_config_async, config_from_state};
use serde::Serialize;
use tauri::{State, AppHandle};
use std::collections::HashSet;

#[derive(Serialize)]
pub struct LoadResult {
    pub total_entries: usize,
    pub files: Vec<FileInfo>,
}

#[derive(Serialize)]
pub struct ScanResult {
    pub files: Vec<FileInfo>,
}

#[derive(Serialize)]
pub struct DictionaryStats {
    pub total_entries: usize,
    pub active_sheets: usize,
}

#[tauri::command]
pub async fn scan_excel_sheets(
    file_paths: Vec<String>, 
    state: State<'_, AppStateWrapper>,
    app_handle: AppHandle,
) -> Result<ScanResult, String> {
    let h = app_handle.clone();
    let results = tokio::task::spawn_blocking(move || {
        file_paths
            .iter()
            .map(|path| parse_excel_file_parallel(path, h.clone()))
            .collect::<Vec<_>>()
    })
    .await
    .map_err(|e| format!("Scan task failed: {}", e))?;

    let mut files = Vec::new();
    let mut state = state.0.lock().map_err(|e| e.to_string())?;
    
    for result in results {
        match result {
            Ok(info) => {
                files.push(info.clone());
                state.loaded_files.insert(info.path.clone(), info);
            }
            Err(e) => return Err(e),
        }
    }

    Ok(ScanResult { files })
}

#[tauri::command]
pub async fn load_excel_files(
    file_paths: Vec<String>, 
    selected_table_sheets: Vec<String>, // cache_keys
    state: State<'_, AppStateWrapper>, 
    app_handle: AppHandle
) -> Result<LoadResult, String> {
    let h = app_handle.clone();
    let results = tokio::task::spawn_blocking(move || {
        file_paths
            .iter()
            .map(|path| parse_excel_file_parallel(path, h.clone()))
            .collect::<Vec<_>>()
    })
    .await
    .map_err(|e| format!("Parse task failed: {}", e))?;

    let (config, files, total_entries) = {
        let mut s = state.0.lock().map_err(|e| e.to_string())?;
        let selected_set: HashSet<String> = selected_table_sheets.into_iter().collect();
        
        for result in results {
            match result {
                Ok(info) => {
                    // Add all sheets that are explicitly selected
                    for sheet in info.base_sheets.iter().chain(info.table_sheets.iter()) {
                        if selected_set.contains(&sheet.cache_key) {
                            s.active_table_sheets.insert(sheet.cache_key.clone());
                        }
                    }
                    s.loaded_files.insert(info.path.clone(), info);
                }
                Err(e) => return Err(e),
            }
        }

        s.rebuild_dictionary(&app_handle);
        
        let mut files: Vec<FileInfo> = s.loaded_files.values().cloned().collect();
        files.sort_by(|a, b| a.name.cmp(&b.name));
        
        (config_from_state(&s), files, s.ja_to_en.len())
    };

    save_config_async(config, &app_handle).await?;
    
    Ok(LoadResult {
        total_entries,
        files,
    })
}

#[tauri::command]
pub async fn update_table_selection(
    selected_cache_keys: Vec<String>,
    state: State<'_, AppStateWrapper>,
    app_handle: AppHandle
) -> Result<DictionaryStats, String> {
    let (config, stats) = {
        let mut s = state.0.lock().map_err(|e| e.to_string())?;
        
        let new_set: HashSet<String> = selected_cache_keys.into_iter().collect();
        let current_set = s.active_table_sheets.clone();

        let to_add: Vec<String> = new_set.difference(&current_set).cloned().collect();
        let to_remove: Vec<String> = current_set.difference(&new_set).cloned().collect();

        for key in to_remove {
            s.remove_sheet_incremental(&key);
            s.active_table_sheets.remove(&key);
        }
        for key in to_add {
            s.add_sheet_incremental(&app_handle, &key);
            s.active_table_sheets.insert(key);
        }
        
        (config_from_state(&s), DictionaryStats {
            total_entries: s.ja_to_en.len(),
            active_sheets: s.active_table_sheets.len(),
        })
    };

    save_config_async(config, &app_handle).await?;
    
    Ok(stats)
}

#[tauri::command]
pub fn get_active_sheets(state: State<'_, AppStateWrapper>) -> Result<Vec<String>, String> {
    let state = state.0.lock().map_err(|e| e.to_string())?;
    Ok(state.active_table_sheets.iter().cloned().collect())
}

#[tauri::command]
pub async fn reload_files(
    file_paths: Vec<String>, 
    state: State<'_, AppStateWrapper>, 
    app_handle: AppHandle
) -> Result<LoadResult, String> {
    let active_sheets = {
        let s = state.0.lock().map_err(|e| e.to_string())?;
        
        // IMPORTANT: Clear DISK cache for these files to force re-parsing
        for path in &file_paths {
             // We can't easily list all sheets without re-opening, 
             // but we can just delete all files starting with path in cache dir
             if let Some(cache_dir) = crate::storage::get_cache_dir(&app_handle) {
                 if let Ok(entries) = std::fs::read_dir(cache_dir) {
                     let prefix = path.replace('|', "_").replace(':', "_").replace('/', "_").replace('\\', "_");
                     for entry in entries.flatten() {
                         if let Some(name) = entry.file_name().to_str() {
                             if name.starts_with(&prefix) {
                                 let _ = std::fs::remove_file(entry.path());
                             }
                         }
                     }
                 }
             }
        }
        
        s.active_table_sheets.iter().cloned().collect::<Vec<_>>()
    };
    
    load_excel_files(file_paths, active_sheets, state, app_handle).await
}

#[tauri::command]
pub fn search(keyword: String, state: State<'_, AppStateWrapper>) -> Result<SearchResult, String> {
    let state = state.0.lock().map_err(|e| e.to_string())?;
    Ok(perform_search(&keyword, &state))
}

#[tauri::command]
pub fn list_loaded_files(state: State<'_, AppStateWrapper>) -> Result<Vec<FileInfo>, String> {
    let state = state.0.lock().map_err(|e| e.to_string())?;
    let mut files: Vec<FileInfo> = state.loaded_files.values().cloned().collect();
    files.sort_by(|a, b| a.name.cmp(&b.name));
    Ok(files)
}

#[tauri::command]
pub async fn remove_file(file_path: String, state: State<'_, AppStateWrapper>, app_handle: AppHandle) -> Result<(), String> {
    let config = {
        let mut s = state.0.lock().map_err(|e| e.to_string())?;
        
        // Remove from loaded_files
        s.loaded_files.remove(&file_path);
        
        // Remove from active selection
        s.active_table_sheets.retain(|k| !k.starts_with(&format!("{}|", file_path)));
        
        // Remove from DISK cache
        if let Some(cache_dir) = crate::storage::get_cache_dir(&app_handle) {
            if let Ok(entries) = std::fs::read_dir(cache_dir) {
                let prefix = file_path.replace('|', "_").replace(':', "_").replace('/', "_").replace('\\', "_");
                for entry in entries.flatten() {
                    if let Some(name) = entry.file_name().to_str() {
                        if name.starts_with(&prefix) {
                            let _ = std::fs::remove_file(entry.path());
                        }
                    }
                }
            }
        }
        
        s.rebuild_dictionary(&app_handle);
        config_from_state(&s)
    };

    save_config_async(config, &app_handle).await?;
    Ok(())
}

#[tauri::command]
pub async fn toggle_file_enabled(file_path: String, enabled: bool, state: State<'_, AppStateWrapper>, app_handle: AppHandle) -> Result<(), String> {
    let config = {
        let mut s = state.0.lock().map_err(|e| e.to_string())?;
        if let Some(info) = s.loaded_files.get_mut(&file_path) {
            info.enabled = enabled;
            s.rebuild_dictionary(&app_handle);
        }
        config_from_state(&s)
    };
    save_config_async(config, &app_handle).await?;
    Ok(())
}

#[tauri::command]
pub async fn toggle_all_files(enabled: bool, state: State<'_, AppStateWrapper>, app_handle: AppHandle) -> Result<(), String> {
    let config = {
        let mut s = state.0.lock().map_err(|e| e.to_string())?;
        for info in s.loaded_files.values_mut() {
            info.enabled = enabled;
        }
        s.rebuild_dictionary(&app_handle);
        config_from_state(&s)
    };
    save_config_async(config, &app_handle).await?;
    Ok(())
}

#[tauri::command]
pub async fn reset_dictionary(state: State<'_, AppStateWrapper>, app_handle: AppHandle) -> Result<(), String> {
    let config = {
        let mut s = state.0.lock().map_err(|e| e.to_string())?;
        s.ja_to_en.clear();
        s.en_to_ja.clear();
        s.ja_keys_sorted.clear();
        s.en_keys_sorted.clear();
        s.loaded_files.clear();
        s.active_table_sheets.clear();
        s.ac_automaton = None;
        s.ac_automaton_en = None;
        s.sorted_ja_entries.clear();
        s.sorted_en_entries.clear();
        
        // Clear DISK cache directory
        if let Some(cache_dir) = crate::storage::get_cache_dir(&app_handle) {
            let _ = std::fs::remove_dir_all(&cache_dir);
            let _ = std::fs::create_dir_all(&cache_dir);
        }
        
        config_from_state(&s)
    };
    
    save_config_async(config, &app_handle).await?;
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
pub async fn bulk_translate(
    text: String, 
    direction: String, 
    state: State<'_, AppStateWrapper>
) -> Result<BulkTranslateResponse, String> {
    let unescaped_text = crate::parser::unescape(&text);
    let normalized_text = crate::parser::normalize_ja(&unescaped_text);
    
    if normalized_text.trim().is_empty() {
        return Ok(BulkTranslateResponse {
            input_segments: vec![TranslateSegment { text: normalized_text.clone(), match_id: None }],
            output_segments: vec![TranslateSegment { text: normalized_text.clone(), match_id: None }],
            output_text: normalized_text,
        });
    }

    // 1. Get Automaton and Replacements from State
    let (automaton, replacements) = {
        let s = state.0.lock().map_err(|e| e.to_string())?;
        if direction == "en_to_ja" {
            let ac = s.ac_automaton_en.clone().ok_or("English dictionary not loaded")?;
            let r: Vec<String> = s.sorted_en_entries.iter().map(|(_, ja)| ja.clone()).collect();
            (ac, r)
        } else {
            let ac = s.ac_automaton.clone().ok_or("Japanese dictionary not loaded")?;
            let r: Vec<String> = s.sorted_ja_entries.iter().map(|(_, en)| en.clone()).collect();
            (ac, r)
        }
    };

    // 2. Perform replacement in a blocking thread
    let is_en_to_ja = direction == "en_to_ja";
    let result = tokio::task::spawn_blocking(move || {
        let mut input_segments = Vec::new();
        let mut output_segments = Vec::new();
        let mut last_match_end = 0;
        let text_bytes = normalized_text.as_bytes();

        for mat in automaton.find_iter(&normalized_text) {
            let start = mat.start();
            let end = mat.end();
            let pattern_id = mat.pattern().as_usize();

            let mut is_valid = true;
            if is_en_to_ja {
                // Whole word match check for English
                let prev_char_valid = start == 0 || (!text_bytes[start - 1].is_ascii_alphanumeric() && text_bytes[start - 1] != b'_');
                let next_char_valid = end == normalized_text.len() || (!text_bytes[end].is_ascii_alphanumeric() && text_bytes[end] != b'_');
                if !prev_char_valid || !next_char_valid {
                    is_valid = false;
                }
            }

            if is_valid {
                // Add previous unmatched text
                if start > last_match_end {
                    let plain_text = normalized_text[last_match_end..start].to_string();
                    input_segments.push(TranslateSegment { text: plain_text.clone(), match_id: None });
                    output_segments.push(TranslateSegment { text: plain_text, match_id: None });
                }
                
                // Add matched segment
                let original_match = normalized_text[start..end].to_string();
                let translated_match = replacements[pattern_id].clone();
                
                input_segments.push(TranslateSegment { text: original_match, match_id: Some(pattern_id) });
                output_segments.push(TranslateSegment { text: translated_match, match_id: Some(pattern_id) });
                
                last_match_end = end;
            }
        }

        // Add remaining text
        if last_match_end < normalized_text.len() {
            let final_text = normalized_text[last_match_end..].to_string();
            input_segments.push(TranslateSegment { text: final_text.clone(), match_id: None });
            output_segments.push(TranslateSegment { text: final_text, match_id: None });
        }

        let output_text = output_segments.iter().map(|s| s.text.as_str()).collect::<Vec<_>>().join("");

        Ok::<BulkTranslateResponse, String>(BulkTranslateResponse {
            input_segments,
            output_segments,
            output_text,
        })
    })
    .await
    .map_err(|e| format!("Translation task failed: {}", e))??;

    Ok(result)
}
