use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HistoryEntry {
    pub id: String,
    pub request_id: Option<String>,
    pub workspace_id: String,
    pub method: String,
    pub url: String,
    pub request_snapshot: String,
    pub response_status: Option<i32>,
    pub response_headers: Option<String>,
    pub response_body: Option<String>,
    pub response_size: Option<i64>,
    pub duration_ms: Option<i64>,
    pub error: Option<String>,
    pub executed_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HistoryQuery {
    pub workspace_id: String,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}
