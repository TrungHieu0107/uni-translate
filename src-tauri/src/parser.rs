use crate::state::{AppState, DictionaryEntry, FileInfo};
use calamine::{open_workbook, Reader, Xlsx};
use std::path::Path;
use unicode_normalization::UnicodeNormalization;

// NFKC normalization to convert full-width alphanumeric to half-width
pub fn normalize_ja(s: &str) -> String {
    s.nfkc().collect::<String>()
}

pub fn unescape(s: &str) -> String {
    s.replace("\\n", "\n").replace("\\t", "\t")
}

pub fn parse_excel_file(path: &str, state: &mut AppState) -> Result<usize, String> {
    let path_obj = Path::new(path);
    let name = path_obj.file_name()
        .and_then(|n| n.to_str())
        .map(|s| s.to_string())
        .unwrap_or_else(|| "Unknown".to_string());

    let mut workbook: Xlsx<_> = open_workbook(path).map_err(|e| format!("Failed to open excel: {}", e))?;

    let sheet_names = workbook.sheet_names().to_vec();
    let mut parsed_entries = Vec::new();

    for sheet_name in sheet_names {
        if let Ok(range) = workbook.worksheet_range(&sheet_name) {
            let is_table_list = sheet_name == "テーブル一覧";
            
            for row in range.rows() {
                let (ja_raw, en_raw) = if is_table_list {
                    if row.len() > 1 { (row[0].to_string(), row[1].to_string()) } else { ("".to_string(), "".to_string()) }
                } else {
                    if row.len() > 2 { (row[1].to_string(), row[2].to_string()) } else { ("".to_string(), "".to_string()) }
                };

                if !ja_raw.trim().is_empty() && !en_raw.trim().is_empty() {
                    let ja_norm = normalize_ja(ja_raw.trim());
                    parsed_entries.push(DictionaryEntry {
                        ja: unescape(&ja_norm),
                        en: unescape(en_raw.trim()),
                        source_file: name.clone(),
                        source_path: path.to_string(),
                    });
                }
            }
        }
    }

    let entries_count = parsed_entries.len();
    if entries_count > 0 {
        state.loaded_files.insert(path.to_string(), FileInfo {
            name,
            path: path.to_string(),
            entries_count,
            enabled: true,
        });
        state.file_entries.insert(path.to_string(), parsed_entries);
        state.rebuild_index();
    }

    Ok(entries_count)
}

pub fn remove_excel_file(path: &str, state: &mut AppState) {
    state.file_entries.remove(path);
    state.loaded_files.remove(path);
    state.rebuild_index();
}
