use crate::db::Database;
use crate::models::history::{HistoryEntry, HistoryQuery};
use rusqlite::params;

impl Database {
    pub fn save_history_entry(
        &self,
        workspace_id: &str,
        request_id: Option<&str>,
        method: &str,
        url: &str,
        request_snapshot: &str,
        response_status: Option<i32>,
        response_headers: Option<&str>,
        response_body: Option<&str>,
        response_size: Option<i64>,
        duration_ms: Option<i64>,
        error: Option<&str>,
    ) -> Result<HistoryEntry, String> {
        let id = uuid::Uuid::now_v7().to_string();
        let now = chrono::Utc::now().to_rfc3339();

        self.conn
            .execute(
                "INSERT INTO history (id, request_id, workspace_id, method, url, request_snapshot,
                 response_status, response_headers, response_body, response_size, duration_ms, error, executed_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
                params![
                    id,
                    request_id,
                    workspace_id,
                    method,
                    url,
                    request_snapshot,
                    response_status,
                    response_headers,
                    response_body,
                    response_size,
                    duration_ms,
                    error,
                    &now,
                ],
            )
            .map_err(|e| format!("Failed to save history entry: {}", e))?;

        Ok(HistoryEntry {
            id,
            request_id: request_id.map(|s| s.to_string()),
            workspace_id: workspace_id.to_string(),
            method: method.to_string(),
            url: url.to_string(),
            request_snapshot: request_snapshot.to_string(),
            response_status,
            response_headers: response_headers.map(|s| s.to_string()),
            response_body: response_body.map(|s| s.to_string()),
            response_size,
            duration_ms,
            error: error.map(|s| s.to_string()),
            executed_at: now,
        })
    }

    pub fn list_history(&self, query: &HistoryQuery) -> Result<Vec<HistoryEntry>, String> {
        let limit = query.limit.unwrap_or(50);
        let offset = query.offset.unwrap_or(0);

        let mut stmt = self
            .conn
            .prepare(
                "SELECT id, request_id, workspace_id, method, url, request_snapshot,
                        response_status, response_headers, response_body, response_size,
                        duration_ms, error, executed_at
                 FROM history
                 WHERE workspace_id = ?1
                 ORDER BY executed_at DESC
                 LIMIT ?2 OFFSET ?3",
            )
            .map_err(|e| format!("Failed to prepare history query: {}", e))?;

        let entries = stmt
            .query_map(params![query.workspace_id, limit, offset], |row| {
                Ok(HistoryEntry {
                    id: row.get(0)?,
                    request_id: row.get(1)?,
                    workspace_id: row.get(2)?,
                    method: row.get(3)?,
                    url: row.get(4)?,
                    request_snapshot: row.get(5)?,
                    response_status: row.get(6)?,
                    response_headers: row.get(7)?,
                    response_body: row.get(8)?,
                    response_size: row.get(9)?,
                    duration_ms: row.get(10)?,
                    error: row.get(11)?,
                    executed_at: row.get(12)?,
                })
            })
            .map_err(|e| format!("Failed to query history: {}", e))?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| format!("Failed to read history: {}", e))?;

        Ok(entries)
    }

    pub fn clear_history(&self, workspace_id: &str) -> Result<(), String> {
        self.conn
            .execute("DELETE FROM history WHERE workspace_id = ?1", params![workspace_id])
            .map_err(|e| format!("Failed to clear history: {}", e))?;
        Ok(())
    }

    pub fn delete_history_entry(&self, id: &str) -> Result<(), String> {
        self.conn
            .execute("DELETE FROM history WHERE id = ?1", params![id])
            .map_err(|e| format!("Failed to delete history entry: {}", e))?;
        Ok(())
    }
}
