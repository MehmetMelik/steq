use std::sync::Mutex;
use tauri::State;

use crate::db::Database;
use crate::http::executor;
use crate::models::execution::ExecutionResult;
use crate::models::request::{ApiRequest, CreateRequestInput, ExecuteRequestInput, UpdateRequestInput};

#[tauri::command]
pub async fn create_request(
    db: State<'_, Mutex<Database>>,
    input: CreateRequestInput,
) -> Result<ApiRequest, String> {
    let db = db.lock().map_err(|e| format!("Lock error: {}", e))?;
    db.create_request(input)
}

#[tauri::command]
pub async fn get_request(
    db: State<'_, Mutex<Database>>,
    id: String,
) -> Result<Option<ApiRequest>, String> {
    let db = db.lock().map_err(|e| format!("Lock error: {}", e))?;
    db.get_request(&id)
}

#[tauri::command]
pub async fn update_request(
    db: State<'_, Mutex<Database>>,
    input: UpdateRequestInput,
) -> Result<ApiRequest, String> {
    let db = db.lock().map_err(|e| format!("Lock error: {}", e))?;
    db.update_request(input)
}

#[tauri::command]
pub async fn delete_request(
    db: State<'_, Mutex<Database>>,
    id: String,
) -> Result<(), String> {
    let db = db.lock().map_err(|e| format!("Lock error: {}", e))?;
    db.delete_request(&id)
}

#[tauri::command]
pub async fn list_requests_by_collection(
    db: State<'_, Mutex<Database>>,
    collection_id: String,
) -> Result<Vec<ApiRequest>, String> {
    let db = db.lock().map_err(|e| format!("Lock error: {}", e))?;
    db.list_requests_by_collection(&collection_id)
}

#[tauri::command]
pub async fn execute_request(
    db: State<'_, Mutex<Database>>,
    input: ExecuteRequestInput,
    workspace_id: String,
    request_id: Option<String>,
) -> Result<ExecutionResult, String> {
    // Serialize the request for history snapshot
    let snapshot = serde_json::to_string(&input)
        .unwrap_or_else(|_| "{}".to_string());

    let result = executor::execute(&input).await;

    // Save to history (non-blocking on failure)
    if let Ok(db) = db.lock() {
        let response_headers_json = serde_json::to_string(&result.headers).ok();
        let _ = db.save_history_entry(
            &workspace_id,
            request_id.as_deref(),
            input.method.as_str(),
            &input.url,
            &snapshot,
            if result.status > 0 { Some(result.status as i32) } else { None },
            response_headers_json.as_deref(),
            Some(&result.body),
            Some(result.size_bytes as i64),
            Some(result.timing.total_ms as i64),
            result.error.as_deref(),
        );
    }

    Ok(result)
}
