use std::sync::Mutex;

use tauri::State;

use crate::db::Database;
use crate::models::history::{HistoryEntry, HistoryQuery};

#[tauri::command]
pub fn list_history(
    db: State<'_, Mutex<Database>>,
    query: HistoryQuery,
) -> Result<Vec<HistoryEntry>, String> {
    let db = db.lock().map_err(|e| format!("Lock error: {}", e))?;
    db.list_history(&query)
}

#[tauri::command]
pub fn clear_history(
    db: State<'_, Mutex<Database>>,
    workspace_id: String,
) -> Result<(), String> {
    let db = db.lock().map_err(|e| format!("Lock error: {}", e))?;
    db.clear_history(&workspace_id)
}

#[tauri::command]
pub fn delete_history_entry(
    db: State<'_, Mutex<Database>>,
    id: String,
) -> Result<(), String> {
    let db = db.lock().map_err(|e| format!("Lock error: {}", e))?;
    db.delete_history_entry(&id)
}
