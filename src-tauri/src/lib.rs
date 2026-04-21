mod commands;
mod parser;
mod search;
mod state;
mod storage;
mod events;

use std::sync::Mutex;
use state::{AppState, AppStateWrapper};
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .manage(AppStateWrapper(Mutex::new(AppState::new())))
        .setup(|app| {
            let app_handle = app.handle().clone();
            let state = app.state::<AppStateWrapper>();
            
            // Load persistent files on startup
            let config = storage::load_config(&app_handle);
            let mut app_state = state.0.lock().unwrap();
            
            app_state.active_table_sheets = config.active_table_sheets.into_iter().collect();

            for file_data in config.files {
                // Use the parallel parser (synchronously here in setup is fine)
                if let Ok(mut file_info) = parser::parse_excel_file_parallel(&file_data.path, app_handle.clone()) {
                    file_info.enabled = file_data.enabled;
                    app_state.loaded_files.insert(file_data.path.clone(), file_info);
                }
            }
            // re-index after loading all files
            app_state.rebuild_dictionary(&app_handle);
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::scan_excel_sheets,
            commands::load_excel_files,
            commands::update_table_selection,
            commands::get_active_sheets,
            commands::reload_files,
            commands::search,
            commands::list_loaded_files,
            commands::remove_file,
            commands::reset_dictionary,
            commands::bulk_translate_v2,
            commands::toggle_file_enabled,
            commands::toggle_all_files
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
