mod commands;
mod parser;
mod search;
mod state;
mod storage;
mod events;
mod sql_analyzer;
mod lexer;
mod formatter;
pub mod sql;

use std::sync::Mutex;
use state::{AppState, AppStateWrapper};
use tauri::{Manager, Emitter};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .manage(AppStateWrapper(Mutex::new(AppState::new())))
        .setup(|app| {
            let app_handle = app.handle().clone();
            
            // Load persistent files on startup in background
            tauri::async_runtime::spawn(async move {
                let config = storage::load_config(&app_handle);
                
                // Parse files (can take a while)
                let mut loaded = Vec::new();
                for file_data in config.files {
                    if let Ok(mut file_info) = parser::parse_excel_file_parallel(&file_data.path, app_handle.clone()) {
                        file_info.enabled = file_data.enabled;
                        loaded.push((file_data.path, file_info));
                    }
                }

                // Lock state and apply
                let state = app_handle.state::<AppStateWrapper>();
                let mut app_state = state.0.lock().unwrap_or_else(|poisoned| poisoned.into_inner());
                app_state.active_table_sheets = config.active_table_sheets.into_iter().collect();
                
                for (path, info) in loaded {
                    app_state.loaded_files.insert(path, info);
                }
                
                app_state.rebuild_dictionary(&app_handle);
                app_state.rebuild_search_dictionary();
                app_state.is_initialized = true;

                // Notify frontend that initialization is complete
                let _ = app_handle.emit("dictionary-ready", ());
            });
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::scan_excel_sheets,
            commands::load_excel_files,
            commands::update_table_selection,
            commands::get_active_sheets,
            commands::get_dictionary_stats,
            commands::reload_files,
            commands::search,
            commands::list_loaded_files,
            commands::remove_file,
            commands::reset_dictionary,
            commands::bulk_translate_v2,
            commands::toggle_file_enabled,
            commands::toggle_all_files,
            commands::analyze_sql,
            commands::format_sql
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
