use serde::Serialize;
use crate::state::FileInfo;

#[derive(Clone, Serialize)]
pub struct ParseProgressEvent {
    pub file_name: String,
    pub sheets_done: usize,
    pub sheets_total: usize,
    pub current_sheet: String,
    pub percent: f32,          // 0.0 - 100.0
}

#[allow(dead_code)]
#[derive(Clone, Serialize)]
pub struct ParseCompleteEvent {
    pub file_info: FileInfo,
    pub total_entries: usize,
    pub duration_ms: u64,
}

#[allow(dead_code)]
#[derive(Clone, Serialize)]
pub struct ParseErrorEvent {
    pub file_name: String,
    pub sheet_name: String,
    pub error: String,
}
