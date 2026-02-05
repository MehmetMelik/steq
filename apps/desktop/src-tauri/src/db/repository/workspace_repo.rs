use crate::db::Database;
use crate::models::workspace::Workspace;

impl Database {
    pub fn get_current_workspace(&self) -> Result<Workspace, String> {
        let mut stmt = self
            .conn
            .prepare("SELECT id, name, created_at, updated_at FROM workspaces ORDER BY created_at ASC LIMIT 1")
            .map_err(|e| format!("Prepare get_workspace: {}", e))?;

        stmt.query_row([], |row| {
            Ok(Workspace {
                id: row.get(0)?,
                name: row.get(1)?,
                created_at: row.get(2)?,
                updated_at: row.get(3)?,
            })
        })
        .map_err(|e| format!("Query get_workspace: {}", e))
    }
}

#[cfg(test)]
mod tests {
    use crate::db::Database;
    use rusqlite::Connection;

    #[test]
    fn get_current_workspace() {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch("PRAGMA foreign_keys=ON;").unwrap();
        let db = Database { conn };
        db.run_migrations().unwrap();

        let workspace = db.get_current_workspace().unwrap();
        assert!(!workspace.id.is_empty());
        assert_eq!(workspace.name, "Default Workspace");
        assert!(!workspace.created_at.is_empty());
        assert!(!workspace.updated_at.is_empty());
    }
}
