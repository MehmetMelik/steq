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
