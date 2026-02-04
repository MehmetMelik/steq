use std::sync::Mutex;

use tauri::State;

use crate::db::Database;
use crate::models::environment::{
    CreateEnvironmentInput, Environment, UpdateEnvironmentInput,
};

#[tauri::command]
pub fn create_environment(
    db: State<'_, Mutex<Database>>,
    input: CreateEnvironmentInput,
) -> Result<Environment, String> {
    let db = db.lock().map_err(|e| format!("Lock error: {}", e))?;
    db.create_environment(&input)
}

#[tauri::command]
pub fn list_environments(
    db: State<'_, Mutex<Database>>,
    workspace_id: String,
) -> Result<Vec<Environment>, String> {
    let db = db.lock().map_err(|e| format!("Lock error: {}", e))?;
    db.list_environments(&workspace_id)
}

#[tauri::command]
pub fn set_active_environment(
    db: State<'_, Mutex<Database>>,
    id: String,
    workspace_id: String,
) -> Result<(), String> {
    let db = db.lock().map_err(|e| format!("Lock error: {}", e))?;
    db.set_active_environment(&id, &workspace_id)
}

#[tauri::command]
pub fn deactivate_all_environments(
    db: State<'_, Mutex<Database>>,
    workspace_id: String,
) -> Result<(), String> {
    let db = db.lock().map_err(|e| format!("Lock error: {}", e))?;
    db.deactivate_all_environments(&workspace_id)
}

#[tauri::command]
pub fn update_environment(
    db: State<'_, Mutex<Database>>,
    input: UpdateEnvironmentInput,
) -> Result<Environment, String> {
    let db = db.lock().map_err(|e| format!("Lock error: {}", e))?;
    db.update_environment(&input)
}

#[tauri::command]
pub fn delete_environment(
    db: State<'_, Mutex<Database>>,
    id: String,
) -> Result<(), String> {
    let db = db.lock().map_err(|e| format!("Lock error: {}", e))?;
    db.delete_environment(&id)
}

#[tauri::command]
pub fn get_resolved_variables(
    db: State<'_, Mutex<Database>>,
    workspace_id: String,
) -> Result<Vec<(String, String)>, String> {
    let db = db.lock().map_err(|e| format!("Lock error: {}", e))?;
    db.get_resolved_variables(&workspace_id)
}
