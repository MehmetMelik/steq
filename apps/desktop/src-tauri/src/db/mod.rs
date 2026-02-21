pub mod schema;
pub mod repository;

use rusqlite::Connection;
use std::path::Path;

pub struct Database {
    pub conn: Connection,
}

impl Database {
    pub fn open(path: &Path) -> Result<Self, String> {
        let conn = Connection::open(path).map_err(|e| format!("Failed to open database: {}", e))?;

        conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;")
            .map_err(|e| format!("Failed to set pragmas: {}", e))?;

        Ok(Database { conn })
    }

    pub fn run_migrations(&self) -> Result<(), String> {
        self.conn
            .execute_batch(schema::CREATE_TABLES)
            .map_err(|e| format!("Failed to run migrations: {}", e))?;

        // Migration: add auth columns to requests table if missing (v0.6.0)
        self.migrate_add_auth_columns()?;

        // Ensure a default workspace exists
        let count: i64 = self
            .conn
            .query_row("SELECT COUNT(*) FROM workspaces", [], |row| row.get(0))
            .map_err(|e| format!("Failed to count workspaces: {}", e))?;

        if count == 0 {
            let now = chrono::Utc::now().to_rfc3339();
            let id = uuid::Uuid::now_v7().to_string();
            self.conn
                .execute(
                    "INSERT INTO workspaces (id, name, created_at, updated_at) VALUES (?1, ?2, ?3, ?4)",
                    rusqlite::params![id, "Default Workspace", &now, &now],
                )
                .map_err(|e| format!("Failed to create default workspace: {}", e))?;
        }

        Ok(())
    }

    fn migrate_add_auth_columns(&self) -> Result<(), String> {
        let has_auth_type: bool = self
            .conn
            .prepare("SELECT auth_type FROM requests LIMIT 0")
            .is_ok();

        if !has_auth_type {
            self.conn
                .execute_batch(
                    "ALTER TABLE requests ADD COLUMN auth_type TEXT NOT NULL DEFAULT 'none';
                     ALTER TABLE requests ADD COLUMN auth_config TEXT NOT NULL DEFAULT '{\"type\":\"none\"}';"
                )
                .map_err(|e| format!("Failed to add auth columns: {}", e))?;
        }

        Ok(())
    }
}
