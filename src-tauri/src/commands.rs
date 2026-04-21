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
        
        // Batch update active sheets
        s.active_table_sheets = selected_cache_keys.into_iter().collect();
        
        // One single optimized parallel rebuild
        s.rebuild_dictionary(&app_handle);
        
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
pub fn get_dictionary_stats(state: State<'_, AppStateWrapper>) -> Result<DictionaryStats, String> {
    let s = state.0.lock().map_err(|e| e.to_string())?;
    Ok(DictionaryStats {
        total_entries: s.ja_to_en.len(),
        active_sheets: s.active_table_sheets.len(),
    })
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

#[derive(serde::Serialize, serde::Deserialize)]
pub struct MatchSpan {
    pub start: u32,
    pub end: u32,
    pub match_id: u32,
}

#[tauri::command]
pub async fn bulk_translate_v2(
    text: String,
    direction: String,
    state: State<'_, AppStateWrapper>,
) -> Result<Vec<u8>, String> {
    let normalized_text = crate::parser::normalize_ja(&text);
    
    if normalized_text.trim().is_empty() {
        // Return empty buffer logic: [text_len:0][span_count_in:0][span_count_out:0]
        return Ok(vec![0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
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
    let result_buffer = tokio::task::spawn_blocking(move || {
        let mut input_spans = Vec::new();
        let mut output_spans = Vec::new();
        let mut output_text = String::with_capacity(normalized_text.len());
        let mut last_match_end = 0;
        let text_bytes = normalized_text.as_bytes();

        let mut match_counter = 0;

        // Pre-calculate character offsets for input to avoid O(N^2)
        let input_char_offsets: Vec<usize> = normalized_text
            .char_indices()
            .map(|(i, _)| i)
            .collect();
        
        // Helper to find char index from byte index
        let get_char_idx = |byte_idx: usize, offsets: &[usize]| -> u32 {
            offsets.iter().position(|&i| i == byte_idx).unwrap_or(offsets.len()) as u32
        };

        for mat in automaton.find_iter(&normalized_text) {
            let start = mat.start();
            let end = mat.end();
            let pattern_id = mat.pattern().as_usize();

            let mut is_valid = true;
            if is_en_to_ja {
                let prev_char_valid = start == 0 || (!text_bytes[start - 1].is_ascii_alphanumeric() && text_bytes[start - 1] != b'_');
                let next_char_valid = end == normalized_text.len() || (!text_bytes[end].is_ascii_alphanumeric() && text_bytes[end] != b'_');
                if !prev_char_valid || !next_char_valid {
                    is_valid = false;
                }
            }

            if is_valid {
                if start > last_match_end {
                    output_text.push_str(&normalized_text[last_match_end..start]);
                }
                
                // Input span (Convert byte index to character index)
                let char_start = get_char_idx(start, &input_char_offsets);
                let char_end = get_char_idx(end, &input_char_offsets);

                input_spans.push(MatchSpan {
                    start: char_start,
                    end: char_end,
                    match_id: match_counter,
                });

                // Output span (Convert byte index to character index)
                let translated_match = &replacements[pattern_id];
                let out_char_start = output_text.chars().count() as u32;
                output_text.push_str(translated_match);
                let out_char_end = output_text.chars().count() as u32;

                output_spans.push(MatchSpan {
                    start: out_char_start,
                    end: out_char_end,
                    match_id: match_counter,
                });
                
                match_counter += 1;
                last_match_end = end;
            }
        }

        if last_match_end < normalized_text.len() {
            output_text.push_str(&normalized_text[last_match_end..]);
        }

        // Binary Protocol Construction (Option B - Flat buffer)
        // [4 bytes: output_text_len]
        // [N bytes: output_text UTF-8]
        // [4 bytes: input_span_count]
        // [M * 12 bytes: input_spans]
        // [4 bytes: output_span_count]
        // [K * 12 bytes: output_spans]
        
        let out_bytes = output_text.as_bytes();
        let total_size = 4 + out_bytes.len() + 4 + (input_spans.len() * 12) + 4 + (output_spans.len() * 12);
        let mut buffer = Vec::with_capacity(total_size);

        // 1. Output text
        buffer.extend_from_slice(&(out_bytes.len() as u32).to_le_bytes());
        buffer.extend_from_slice(out_bytes);

        // 2. Input spans
        buffer.extend_from_slice(&(input_spans.len() as u32).to_le_bytes());
        for span in input_spans {
            buffer.extend_from_slice(&span.start.to_le_bytes());
            buffer.extend_from_slice(&span.end.to_le_bytes());
            buffer.extend_from_slice(&span.match_id.to_le_bytes());
        }

        // 3. Output spans
        buffer.extend_from_slice(&(output_spans.len() as u32).to_le_bytes());
        for span in output_spans {
            buffer.extend_from_slice(&span.start.to_le_bytes());
            buffer.extend_from_slice(&span.end.to_le_bytes());
            buffer.extend_from_slice(&span.match_id.to_le_bytes());
        }

        Ok::<Vec<u8>, String>(buffer)
    })
    .await
    .map_err(|e| format!("Translation task failed: {}", e))??;

    Ok(result_buffer)
}

#[tauri::command]
pub async fn analyze_sql(query: String) -> Result<crate::sql_analyzer::SqlAnalysis, String> {
    Ok(crate::sql_analyzer::analyze_sql(&query))
}
