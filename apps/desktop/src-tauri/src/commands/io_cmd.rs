use std::sync::Mutex;

use tauri::State;

use crate::db::Database;
use crate::io::postman::{self, ImportResult};

#[tauri::command]
pub fn import_postman(
    db: State<'_, Mutex<Database>>,
    file_path: String,
    workspace_id: String,
) -> Result<ImportResult, String> {
    let content =
        std::fs::read_to_string(&file_path).map_err(|e| format!("Failed to read file: {}", e))?;
    let db = db.lock().map_err(|e| format!("Lock error: {}", e))?;
    postman::import_postman_collection(&db, &content, &workspace_id)
}

#[tauri::command]
pub fn export_postman(
    db: State<'_, Mutex<Database>>,
    collection_id: String,
    file_path: String,
) -> Result<(), String> {
    let db = db.lock().map_err(|e| format!("Lock error: {}", e))?;
    let json = postman::export_postman_collection(&db, &collection_id)?;
    std::fs::write(&file_path, json).map_err(|e| format!("Failed to write file: {}", e))
}
