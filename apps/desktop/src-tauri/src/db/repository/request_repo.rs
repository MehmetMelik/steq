use rusqlite::params;

use crate::db::Database;
use crate::models::request::{ApiRequest, BodyType, CreateRequestInput, HttpMethod, KeyValue, UpdateRequestInput};

impl Database {
    pub fn create_request(&self, input: CreateRequestInput) -> Result<ApiRequest, String> {
        let id = uuid::Uuid::now_v7().to_string();
        let now = chrono::Utc::now().to_rfc3339();
        let headers_json =
            serde_json::to_string(&input.headers).map_err(|e| format!("Serialize headers: {}", e))?;
        let query_json = serde_json::to_string(&input.query_params)
            .map_err(|e| format!("Serialize query_params: {}", e))?;

        self.conn
            .execute(
                "INSERT INTO requests (id, collection_id, folder_id, name, method, url, headers, query_params, body_type, body_content, sort_order, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, 0, ?11, ?12)",
                params![
                    id,
                    input.collection_id,
                    input.folder_id,
                    input.name,
                    input.method.as_str(),
                    input.url,
                    headers_json,
                    query_json,
                    input.body_type.as_str(),
                    input.body_content,
                    now,
                    now,
                ],
            )
            .map_err(|e| format!("Insert request: {}", e))?;

        Ok(ApiRequest {
            id,
            name: input.name,
            method: input.method,
            url: input.url,
            headers: input.headers,
            query_params: input.query_params,
            body_type: input.body_type,
            body_content: input.body_content,
            collection_id: input.collection_id,
            folder_id: input.folder_id,
            sort_order: 0,
            created_at: now.clone(),
            updated_at: now,
        })
    }

    pub fn get_request(&self, id: &str) -> Result<Option<ApiRequest>, String> {
        let mut stmt = self
            .conn
            .prepare(
                "SELECT id, collection_id, folder_id, name, method, url, headers, query_params, body_type, body_content, sort_order, created_at, updated_at
                 FROM requests WHERE id = ?1",
            )
            .map_err(|e| format!("Prepare get_request: {}", e))?;

        let result = stmt
            .query_row(params![id], |row| {
                Ok(Self::row_to_request(row))
            })
            .optional()
            .map_err(|e| format!("Query get_request: {}", e))?;

        match result {
            Some(r) => Ok(Some(r.map_err(|e| format!("Parse request: {}", e))?)),
            None => Ok(None),
        }
    }

    pub fn update_request(&self, input: UpdateRequestInput) -> Result<ApiRequest, String> {
        let existing = self
            .get_request(&input.id)?
            .ok_or_else(|| format!("Request not found: {}", input.id))?;

        let now = chrono::Utc::now().to_rfc3339();
        let name = input.name.unwrap_or(existing.name);
        let method = input.method.unwrap_or(existing.method);
        let url = input.url.unwrap_or(existing.url);
        let headers = input.headers.unwrap_or(existing.headers);
        let query_params = input.query_params.unwrap_or(existing.query_params);
        let body_type = input.body_type.unwrap_or(existing.body_type);
        let body_content = if input.body_content.is_some() {
            input.body_content
        } else {
            existing.body_content
        };
        let collection_id = if input.collection_id.is_some() {
            input.collection_id
        } else {
            existing.collection_id
        };
        let folder_id = if input.folder_id.is_some() {
            input.folder_id
        } else {
            existing.folder_id
        };
        let sort_order = input.sort_order.unwrap_or(existing.sort_order);

        let headers_json =
            serde_json::to_string(&headers).map_err(|e| format!("Serialize headers: {}", e))?;
        let query_json = serde_json::to_string(&query_params)
            .map_err(|e| format!("Serialize query_params: {}", e))?;

        self.conn
            .execute(
                "UPDATE requests SET name=?1, method=?2, url=?3, headers=?4, query_params=?5, body_type=?6, body_content=?7, collection_id=?8, folder_id=?9, sort_order=?10, updated_at=?11
                 WHERE id=?12",
                params![
                    name,
                    method.as_str(),
                    url,
                    headers_json,
                    query_json,
                    body_type.as_str(),
                    body_content,
                    collection_id,
                    folder_id,
                    sort_order,
                    now,
                    input.id,
                ],
            )
            .map_err(|e| format!("Update request: {}", e))?;

        Ok(ApiRequest {
            id: input.id,
            name,
            method,
            url,
            headers,
            query_params,
            body_type,
            body_content,
            collection_id,
            folder_id,
            sort_order,
            created_at: existing.created_at,
            updated_at: now,
        })
    }

    pub fn delete_request(&self, id: &str) -> Result<(), String> {
        self.conn
            .execute("DELETE FROM requests WHERE id = ?1", params![id])
            .map_err(|e| format!("Delete request: {}", e))?;
        Ok(())
    }

    pub fn list_requests_by_collection(&self, collection_id: &str) -> Result<Vec<ApiRequest>, String> {
        let mut stmt = self
            .conn
            .prepare(
                "SELECT id, collection_id, folder_id, name, method, url, headers, query_params, body_type, body_content, sort_order, created_at, updated_at
                 FROM requests WHERE collection_id = ?1 ORDER BY sort_order ASC",
            )
            .map_err(|e| format!("Prepare list_requests: {}", e))?;

        let rows = stmt
            .query_map(params![collection_id], |row| Ok(Self::row_to_request(row)))
            .map_err(|e| format!("Query list_requests: {}", e))?;

        let mut requests = Vec::new();
        for row in rows {
            let r = row
                .map_err(|e| format!("Read row: {}", e))?
                .map_err(|e| format!("Parse row: {}", e))?;
            requests.push(r);
        }
        Ok(requests)
    }

    pub(crate) fn row_to_request(row: &rusqlite::Row) -> Result<ApiRequest, String> {
        let method_str: String = row.get(4).map_err(|e| format!("Get method: {}", e))?;
        let headers_str: String = row.get(6).map_err(|e| format!("Get headers: {}", e))?;
        let query_str: String = row.get(7).map_err(|e| format!("Get query_params: {}", e))?;
        let body_type_str: String = row.get(8).map_err(|e| format!("Get body_type: {}", e))?;

        let headers: Vec<KeyValue> =
            serde_json::from_str(&headers_str).map_err(|e| format!("Parse headers: {}", e))?;
        let query_params: Vec<KeyValue> =
            serde_json::from_str(&query_str).map_err(|e| format!("Parse query_params: {}", e))?;

        Ok(ApiRequest {
            id: row.get(0).map_err(|e| format!("Get id: {}", e))?,
            collection_id: row.get(1).map_err(|e| format!("Get collection_id: {}", e))?,
            folder_id: row.get(2).map_err(|e| format!("Get folder_id: {}", e))?,
            name: row.get(3).map_err(|e| format!("Get name: {}", e))?,
            method: HttpMethod::from_str(&method_str)?,
            url: row.get(5).map_err(|e| format!("Get url: {}", e))?,
            headers,
            query_params,
            body_type: BodyType::from_str(&body_type_str),
            body_content: row.get(9).map_err(|e| format!("Get body_content: {}", e))?,
            sort_order: row.get(10).map_err(|e| format!("Get sort_order: {}", e))?,
            created_at: row.get(11).map_err(|e| format!("Get created_at: {}", e))?,
            updated_at: row.get(12).map_err(|e| format!("Get updated_at: {}", e))?,
        })
    }
}

use rusqlite::OptionalExtension;
