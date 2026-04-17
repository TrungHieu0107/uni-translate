use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};
use crate::state::AppState;

#[derive(Debug, Serialize, Deserialize)]
pub struct PersistentFileData {
    pub path: String,
    pub enabled: bool,
}

#[derive(Debug, Serialize, Deserialize, Default)]
pub struct Config {
    pub files: Vec<PersistentFileData>,
}

fn get_config_path(app_handle: &AppHandle) -> Option<PathBuf> {
    app_handle.path().app_config_dir().ok().map(|mut p| {
        let _ = fs::create_dir_all(&p);
        p.push("config.json");
        p
    })
}

pub fn save_config(state: &AppState, app_handle: &AppHandle) {
    if let Some(path) = get_config_path(app_handle) {
        let mut persistent_files = Vec::new();
        for (file_path, info) in &state.loaded_files {
            persistent_files.push(PersistentFileData {
                path: file_path.clone(),
                enabled: info.enabled,
            });
        }
        
        let config = Config { files: persistent_files };
        if let Ok(json) = serde_json::to_string_pretty(&config) {
            let _ = fs::write(path, json);
        }
    }
}

pub fn load_config(app_handle: &AppHandle) -> Config {
    if let Some(path) = get_config_path(app_handle) {
        if path.exists() {
            if let Ok(content) = fs::read_to_string(path) {
                if let Ok(config) = serde_json::from_str::<Config>(&content) {
                    return config;
                }
            }
        }
    }
    Config::default()
}
