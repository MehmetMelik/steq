use std::sync::Mutex;
use tauri::State;

use crate::db::Database;
use crate::models::collection::{
    Collection, CollectionTree, CreateCollectionInput, CreateFolderInput, Folder, RenameInput,
};

#[tauri::command]
pub async fn create_collection(
    db: State<'_, Mutex<Database>>,
    input: CreateCollectionInput,
) -> Result<Collection, String> {
    let db = db.lock().map_err(|e| format!("Lock error: {}", e))?;
    db.create_collection(input)
}

#[tauri::command]
pub async fn list_collections(
    db: State<'_, Mutex<Database>>,
    workspace_id: String,
) -> Result<Vec<Collection>, String> {
    let db = db.lock().map_err(|e| format!("Lock error: {}", e))?;
    db.list_collections(&workspace_id)
}

#[tauri::command]
pub async fn get_collection_tree(
    db: State<'_, Mutex<Database>>,
    id: String,
) -> Result<CollectionTree, String> {
    let db = db.lock().map_err(|e| format!("Lock error: {}", e))?;
    db.get_collection_tree(&id)
}

#[tauri::command]
pub async fn rename_collection(
    db: State<'_, Mutex<Database>>,
    input: RenameInput,
) -> Result<(), String> {
    let db = db.lock().map_err(|e| format!("Lock error: {}", e))?;
    db.rename_collection(input)
}

#[tauri::command]
pub async fn delete_collection(
    db: State<'_, Mutex<Database>>,
    id: String,
) -> Result<(), String> {
    let db = db.lock().map_err(|e| format!("Lock error: {}", e))?;
    db.delete_collection(&id)
}

#[tauri::command]
pub async fn create_folder(
    db: State<'_, Mutex<Database>>,
    input: CreateFolderInput,
) -> Result<Folder, String> {
    let db = db.lock().map_err(|e| format!("Lock error: {}", e))?;
    db.create_folder(input)
}

#[tauri::command]
pub async fn rename_folder(
    db: State<'_, Mutex<Database>>,
    input: RenameInput,
) -> Result<(), String> {
    let db = db.lock().map_err(|e| format!("Lock error: {}", e))?;
    db.rename_folder(input)
}

#[tauri::command]
pub async fn delete_folder(
    db: State<'_, Mutex<Database>>,
    id: String,
) -> Result<(), String> {
    let db = db.lock().map_err(|e| format!("Lock error: {}", e))?;
    db.delete_folder(&id)
}
