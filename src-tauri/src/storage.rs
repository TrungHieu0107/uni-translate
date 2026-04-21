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
    pub active_table_sheets: Vec<String>,
}

fn get_config_path(app_handle: &AppHandle) -> Option<PathBuf> {
    app_handle.path().app_config_dir().ok().map(|mut p| {
        let _ = fs::create_dir_all(&p);
        p.push("config.json");
        p
    })
}

pub fn get_cache_dir(app_handle: &AppHandle) -> Option<PathBuf> {
    app_handle.path().app_config_dir().ok().map(|mut p| {
        p.push("cache");
        let _ = fs::create_dir_all(&p);
        p
    })
}

pub fn get_sheet_cache_path(app_handle: &AppHandle, cache_key: &str) -> Option<PathBuf> {
    let mut p = get_cache_dir(app_handle)?;
    
    // Use SHA256 hash of the cache key to ensure safe and short filenames
    use sha2::{Sha256, Digest};
    let mut hasher = Sha256::new();
    hasher.update(cache_key.as_bytes());
    let hash = hex::encode(hasher.finalize());
    
    p.push(format!("{}.bin", hash));
    Some(p)
}


pub fn config_from_state(state: &AppState) -> Config {
    let mut persistent_files = Vec::new();
    for file in state.loaded_files.values() {
        persistent_files.push(PersistentFileData {
            path: file.path.clone(),
            enabled: file.enabled,
        });
    }
    Config {
        files: persistent_files,
        active_table_sheets: state.active_table_sheets.iter().cloned().collect(),
    }
}

pub async fn save_config_async(config: Config, app_handle: &AppHandle) -> Result<(), String> {
    if let Some(path) = get_config_path(app_handle) {
        let json = serde_json::to_string_pretty(&config).map_err(|e| e.to_string())?;
        tokio::fs::write(path, json).await.map_err(|e| e.to_string())?;
    }
    Ok(())
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
