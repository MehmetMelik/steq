use std::sync::Mutex;
use tauri::State;

use crate::db::Database;
use crate::models::workspace::Workspace;

#[tauri::command]
pub async fn get_current_workspace(
    db: State<'_, Mutex<Database>>,
) -> Result<Workspace, String> {
    let db = db.lock().map_err(|e| format!("Lock error: {}", e))?;
    db.get_current_workspace()
}
