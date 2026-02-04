mod commands;
mod db;
mod http;
mod crypto;
mod io;
mod models;

use std::sync::Mutex;

use tauri::Manager;

use commands::collection_cmd::*;
use commands::environment_cmd::*;
use commands::history_cmd::*;
use commands::io_cmd::*;
use commands::request_cmd::*;
use commands::workspace_cmd::*;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let app_data_dir = app
                .path()
                .app_data_dir()
                .expect("Failed to get app data directory");

            std::fs::create_dir_all(&app_data_dir)
                .expect("Failed to create app data directory");

            let db_path = app_data_dir.join("apiary.db");
            let database = db::Database::open(&db_path)
                .expect("Failed to open database");
            database
                .run_migrations()
                .expect("Failed to run migrations");

            app.manage(Mutex::new(database));

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            create_request,
            get_request,
            update_request,
            delete_request,
            list_requests_by_collection,
            execute_request,
            get_current_workspace,
            create_collection,
            list_collections,
            get_collection_tree,
            rename_collection,
            delete_collection,
            create_folder,
            rename_folder,
            delete_folder,
            create_environment,
            list_environments,
            set_active_environment,
            deactivate_all_environments,
            update_environment,
            delete_environment,
            get_resolved_variables,
            list_history,
            clear_history,
            delete_history_entry,
            import_postman,
            export_postman,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
