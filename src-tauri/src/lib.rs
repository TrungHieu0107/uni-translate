mod commands;
mod parser;
mod search;
mod state;
mod storage;

use std::sync::Mutex;
use state::{AppState, AppStateWrapper};
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .manage(AppStateWrapper(Mutex::new(AppState::new())))
        .setup(|app| {
            let app_handle = app.handle().clone();
            let state = app.state::<AppStateWrapper>();
            
            // Load persistent files on startup
            let config = storage::load_config(&app_handle);
            let mut app_state = state.0.lock().unwrap();
            
            for file_data in config.files {
                if let Ok(_) = parser::parse_excel_file(&file_data.path, &mut app_state) {
                    // Respect the saved enabled state
                    if let Some(info) = app_state.loaded_files.get_mut(&file_data.path) {
                        info.enabled = file_data.enabled;
                    }
                }
            }
            // re-index after loading all files
            app_state.rebuild_index();
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::load_excel_files,
            commands::reload_files,
            commands::search,
            commands::list_loaded_files,
            commands::remove_file,
            commands::reset_dictionary,
            commands::bulk_translate,
            commands::toggle_file_enabled,
            commands::toggle_all_files
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
