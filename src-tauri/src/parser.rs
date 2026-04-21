use crate::state::{DictionaryEntry, FileInfo, SheetCache, SheetKind, SheetMeta};
use rayon::prelude::*;
use crate::events::{ParseProgressEvent};
use calamine::{open_workbook, Data, Reader, Xlsx};
use std::path::Path;
use std::time::Instant;
use tauri::Emitter;
use unicode_normalization::UnicodeNormalization;

// NFKC normalization to convert full-width alphanumeric to half-width
pub fn normalize_ja(s: &str) -> String {
    s.nfkc().collect::<String>()
}

pub fn unescape(s: &str) -> String {
    s.replace("\\n", "\n").replace("\\t", "\t")
}

pub fn classify_sheet(name: &str) -> SheetKind {
    let name_trimmed = name.trim();
    // System sheets are Japanese or specifically named "テーブル一覧"
    if name_trimmed == "テーブル一覧" || !name_trimmed.chars().all(|c| c.is_ascii()) {
        SheetKind::Base
    } else {
        SheetKind::Table
    }
}

pub fn extract_file_name(path: &str) -> String {
    Path::new(path)
        .file_name()
        .and_then(|n| n.to_str())
        .map(|s| s.to_string())
        .unwrap_or_else(|| "Unknown".to_string())
}

pub fn parse_excel_file_parallel(
    file_path: &str,
    app_handle: tauri::AppHandle,
) -> Result<FileInfo, String> {
    let start = Instant::now();
    let file_name = extract_file_name(file_path);

    // 1. Check disk cache
    let workbook: Xlsx<_> = open_workbook(file_path)
        .map_err(|e| format!("Cannot open {}: {}", file_name, e))?;

    let sheet_names = workbook.sheet_names().to_vec();
    let total_sheets = sheet_names.len();

    let mut sheets_to_parse = vec![];
    let mut base_sheets = vec![];
    let mut table_sheets = vec![];
    let mut total_entries = 0;

    for name in &sheet_names {
        let key = format!("{}|{}", file_path, name);
        if let Some(cache_file_path) = crate::storage::get_sheet_cache_path(&app_handle, &key) {
            if cache_file_path.exists() {
                // Read only the header part of the cache if possible, or just deserialize it
                // For now, deserialize but then discard the entries
                if let Ok(bin) = std::fs::read(&cache_file_path) {
                    if let Ok(sheet_cache) = bincode::deserialize::<SheetCache>(&bin) {
                        let meta = SheetMeta {
                            name: sheet_cache.sheet_name.clone(),
                            kind: match sheet_cache.kind {
                                SheetKind::Base => "Base".to_string(),
                                SheetKind::Table => "Table".to_string(),
                            },
                            entry_count: sheet_cache.entry_count,
                            cache_key: key.clone(),
                            cache_path: cache_file_path.to_string_lossy().to_string(),
                        };
                        total_entries += sheet_cache.entry_count;
                        if sheet_cache.kind == SheetKind::Base { base_sheets.push(meta); }
                        else { table_sheets.push(meta); }
                        continue;
                    }
                }
            }
        }
        sheets_to_parse.push(name.clone());
    }

    // 2. Parse remaining sheets
    let done = total_sheets - sheets_to_parse.len();
    emit_progress(&app_handle, &file_name, done, total_sheets, "Starting...");
    
    if !sheets_to_parse.is_empty() {
        let results: Vec<SheetMeta> = sheets_to_parse.into_par_iter().enumerate().filter_map(|(idx, sheet_name)| {
            // Each thread needs its own workbook handle for parallel reading
            let mut workbook: Xlsx<_> = open_workbook(file_path).ok()?;
            if let Ok(range) = workbook.worksheet_range(&sheet_name) {
                let kind = classify_sheet(&sheet_name);
                
                // Stream rows directly into extraction
                let entries = extract_entries_streaming(&sheet_name, range.rows(), &kind, file_path);
                let entry_count = entries.len();
                
                let sheet_cache = SheetCache {
                    sheet_name: sheet_name.clone(),
                    kind: kind.clone(),
                    entry_count,
                    entries,
                    parse_error: None,
                };

                let cache_key = format!("{}|{}", file_path, sheet_name);
                if let Some(cache_file_path) = crate::storage::get_sheet_cache_path(&app_handle, &cache_key) {
                    if let Ok(bin) = bincode::serialize(&sheet_cache) {
                        let _ = std::fs::write(&cache_file_path, bin);
                    }
                }

                // Periodic progress emit
                if idx % 50 == 0 {
                    emit_progress(&app_handle, &file_name, done + idx, total_sheets, &sheet_name);
                }

                Some(SheetMeta {
                    name: sheet_name.clone(),
                    kind: match kind {
                        SheetKind::Base => "Base".to_string(),
                        SheetKind::Table => "Table".to_string(),
                    },
                    entry_count,
                    cache_key,
                    cache_path: crate::storage::get_sheet_cache_path(&app_handle, &format!("{}|{}", file_path, sheet_name))
                        .map(|p| p.to_string_lossy().to_string())
                        .unwrap_or_default(),
                })
            } else {
                None
            }
        }).collect();

        for meta in results {
            total_entries += meta.entry_count;
            if meta.kind == "Base" { base_sheets.push(meta); }
            else { table_sheets.push(meta); }
        }
    }

    Ok(FileInfo {
        name: file_name,
        path: file_path.to_string(),
        base_sheets,
        table_sheets,
        entries_count: total_entries,
        parse_duration_ms: start.elapsed().as_millis() as u64,
        enabled: true,
    })
}

fn extract_entries_streaming<'a>(
    sheet_name: &str,
    rows: impl Iterator<Item = &'a [Data]>,
    kind: &SheetKind,
    file_path: &str,
) -> Vec<DictionaryEntry> {
    let file_name = extract_file_name(file_path);
    rows.skip(1) // skip header row
        .filter_map(|row| {
            let (ja_raw, en_raw) = match kind {
                SheetKind::Base => {
                    if sheet_name == "テーブル一覧" {
                        (get_cell_string(row, 0)?, get_cell_string(row, 1)?)
                    } else {
                        (get_cell_string(row, 1)?, get_cell_string(row, 2)?)
                    }
                }
                SheetKind::Table => {
                    (get_cell_string(row, 1)?, get_cell_string(row, 2)?)
                }
            };

            let ja_trimmed = ja_raw.trim();
            let en_trimmed = en_raw.trim();

            if ja_trimmed.is_empty() || en_trimmed.is_empty() {
                return None;
            }

            let ja_norm = normalize_ja(ja_trimmed);
            let ja = unescape(&ja_norm);
            let en = unescape(en_trimmed);
            let en_lower = en.to_lowercase();
            
            Some(DictionaryEntry {
                ja,
                en,
                en_lower,
                source_file: file_name.clone(),
                source_sheet: sheet_name.to_string(),
            })
        })
        .collect()
}

fn get_cell_string(row: &[Data], col: usize) -> Option<String> {
    row.get(col).map(|c: &Data| c.to_string())
}

fn emit_progress(
    app: &tauri::AppHandle,
    file_name: &str,
    done: usize,
    total: usize,
    current_sheet: &str,
) {
    let _ = app.emit("parse-progress", ParseProgressEvent {
        file_name: file_name.to_string(),
        sheets_done: done,
        sheets_total: total,
        current_sheet: current_sheet.to_string(),
        percent: if total > 0 { (done as f32 / total as f32) * 100.0 } else { 100.0 },
    });
}
