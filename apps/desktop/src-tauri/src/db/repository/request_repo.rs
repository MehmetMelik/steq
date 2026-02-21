use rusqlite::params;

use crate::db::Database;
use crate::models::request::{ApiRequest, AuthConfig, AuthType, BodyType, CreateRequestInput, HttpMethod, KeyValue, UpdateRequestInput};

impl Database {
    pub fn create_request(&self, input: CreateRequestInput) -> Result<ApiRequest, String> {
        let id = uuid::Uuid::now_v7().to_string();
        let now = chrono::Utc::now().to_rfc3339();
        let headers_json =
            serde_json::to_string(&input.headers).map_err(|e| format!("Serialize headers: {}", e))?;
        let query_json = serde_json::to_string(&input.query_params)
            .map_err(|e| format!("Serialize query_params: {}", e))?;
        let auth_config_json = serde_json::to_string(&input.auth_config)
            .map_err(|e| format!("Serialize auth_config: {}", e))?;

        self.conn
            .execute(
                "INSERT INTO requests (id, collection_id, folder_id, name, method, url, headers, query_params, body_type, body_content, auth_type, auth_config, sort_order, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, 0, ?13, ?14)",
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
                    input.auth_type.as_str(),
                    auth_config_json,
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
            auth_type: input.auth_type,
            auth_config: input.auth_config,
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
                "SELECT id, collection_id, folder_id, name, method, url, headers, query_params, body_type, body_content, auth_type, auth_config, sort_order, created_at, updated_at
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
        let auth_type = input.auth_type.unwrap_or(existing.auth_type);
        let auth_config = input.auth_config.unwrap_or(existing.auth_config);
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
        let auth_config_json = serde_json::to_string(&auth_config)
            .map_err(|e| format!("Serialize auth_config: {}", e))?;

        self.conn
            .execute(
                "UPDATE requests SET name=?1, method=?2, url=?3, headers=?4, query_params=?5, body_type=?6, body_content=?7, auth_type=?8, auth_config=?9, collection_id=?10, folder_id=?11, sort_order=?12, updated_at=?13
                 WHERE id=?14",
                params![
                    name,
                    method.as_str(),
                    url,
                    headers_json,
                    query_json,
                    body_type.as_str(),
                    body_content,
                    auth_type.as_str(),
                    auth_config_json,
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
            auth_type,
            auth_config,
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
                "SELECT id, collection_id, folder_id, name, method, url, headers, query_params, body_type, body_content, auth_type, auth_config, sort_order, created_at, updated_at
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
        let auth_type_str: String = row.get(10).map_err(|e| format!("Get auth_type: {}", e))?;
        let auth_config_str: String = row.get(11).map_err(|e| format!("Get auth_config: {}", e))?;

        let headers: Vec<KeyValue> =
            serde_json::from_str(&headers_str).map_err(|e| format!("Parse headers: {}", e))?;
        let query_params: Vec<KeyValue> =
            serde_json::from_str(&query_str).map_err(|e| format!("Parse query_params: {}", e))?;
        let auth_config: AuthConfig =
            serde_json::from_str(&auth_config_str).map_err(|e| format!("Parse auth_config: {}", e))?;

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
            auth_type: AuthType::from_str(&auth_type_str),
            auth_config,
            sort_order: row.get(12).map_err(|e| format!("Get sort_order: {}", e))?,
            created_at: row.get(13).map_err(|e| format!("Get created_at: {}", e))?,
            updated_at: row.get(14).map_err(|e| format!("Get updated_at: {}", e))?,
        })
    }
}

use rusqlite::OptionalExtension;

#[cfg(test)]
mod tests {
    use crate::db::Database;
    use crate::models::request::*;
    use rusqlite::Connection;

    fn setup_test_db() -> (Database, String) {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch("PRAGMA foreign_keys=ON;").unwrap();
        let db = Database { conn };
        db.run_migrations().unwrap();
        let workspace = db.get_current_workspace().unwrap();
        (db, workspace.id)
    }

    fn make_collection(db: &Database, workspace_id: &str) -> String {
        let coll = db
            .create_collection(crate::models::collection::CreateCollectionInput {
                workspace_id: workspace_id.to_string(),
                name: "Test Collection".to_string(),
                description: None,
            })
            .unwrap();
        coll.id
    }

    fn sample_input(collection_id: &str) -> CreateRequestInput {
        CreateRequestInput {
            name: "Get Users".to_string(),
            method: HttpMethod::GET,
            url: "https://api.example.com/users".to_string(),
            headers: vec![KeyValue {
                key: "Authorization".to_string(),
                value: "Bearer token123".to_string(),
                enabled: true,
            }],
            query_params: vec![KeyValue {
                key: "page".to_string(),
                value: "1".to_string(),
                enabled: true,
            }],
            body_type: BodyType::None,
            body_content: None,
            auth_type: AuthType::None,
            auth_config: AuthConfig::None,
            collection_id: Some(collection_id.to_string()),
            folder_id: None,
        }
    }

    #[test]
    fn create_and_get_request() {
        let (db, wid) = setup_test_db();
        let cid = make_collection(&db, &wid);
        let input = sample_input(&cid);

        let created = db.create_request(input).unwrap();
        assert!(!created.id.is_empty());
        assert_eq!(created.name, "Get Users");
        assert_eq!(created.headers.len(), 1);
        assert_eq!(created.headers[0].key, "Authorization");
        assert_eq!(created.query_params.len(), 1);
        assert_eq!(created.query_params[0].key, "page");

        let fetched = db.get_request(&created.id).unwrap().unwrap();
        assert_eq!(fetched.id, created.id);
        assert_eq!(fetched.name, "Get Users");
        assert_eq!(fetched.headers.len(), 1);
        assert_eq!(fetched.headers[0].value, "Bearer token123");
        assert_eq!(fetched.query_params.len(), 1);
        assert_eq!(fetched.query_params[0].value, "1");
    }

    #[test]
    fn get_request_not_found() {
        let (db, _) = setup_test_db();
        let result = db.get_request("nonexistent-id").unwrap();
        assert!(result.is_none());
    }

    #[test]
    fn update_request_partial() {
        let (db, wid) = setup_test_db();
        let cid = make_collection(&db, &wid);
        let created = db.create_request(sample_input(&cid)).unwrap();

        let update = UpdateRequestInput {
            id: created.id.clone(),
            name: Some("Updated Name".to_string()),
            method: Some(HttpMethod::POST),
            url: None,
            headers: None,
            query_params: None,
            body_type: None,
            body_content: None,
            auth_type: None,
            auth_config: None,
            collection_id: None,
            folder_id: None,
            sort_order: None,
        };

        let updated = db.update_request(update).unwrap();
        assert_eq!(updated.name, "Updated Name");
        assert!(matches!(updated.method, HttpMethod::POST));
        // Unchanged fields preserved
        assert_eq!(updated.url, "https://api.example.com/users");
        assert_eq!(updated.headers.len(), 1);
    }

    #[test]
    fn update_request_not_found() {
        let (db, _) = setup_test_db();
        let update = UpdateRequestInput {
            id: "nonexistent".to_string(),
            name: Some("x".to_string()),
            method: None,
            url: None,
            headers: None,
            query_params: None,
            body_type: None,
            body_content: None,
            auth_type: None,
            auth_config: None,
            collection_id: None,
            folder_id: None,
            sort_order: None,
        };
        let result = db.update_request(update);
        assert!(result.is_err());
    }

    #[test]
    fn delete_request() {
        let (db, wid) = setup_test_db();
        let cid = make_collection(&db, &wid);
        let created = db.create_request(sample_input(&cid)).unwrap();

        db.delete_request(&created.id).unwrap();
        assert!(db.get_request(&created.id).unwrap().is_none());
    }

    #[test]
    fn list_requests_by_collection() {
        let (db, wid) = setup_test_db();
        let cid = make_collection(&db, &wid);

        let mut input1 = sample_input(&cid);
        input1.name = "Alpha".to_string();
        let mut input2 = sample_input(&cid);
        input2.name = "Beta".to_string();

        db.create_request(input1).unwrap();
        db.create_request(input2).unwrap();

        let list = db.list_requests_by_collection(&cid).unwrap();
        assert_eq!(list.len(), 2);
        // Both belong to the same collection
        assert!(list.iter().all(|r| r.collection_id.as_deref() == Some(&cid)));
    }

    #[test]
    fn list_requests_empty_collection() {
        let (db, wid) = setup_test_db();
        let cid = make_collection(&db, &wid);
        let list = db.list_requests_by_collection(&cid).unwrap();
        assert!(list.is_empty());
    }

    #[test]
    fn request_with_all_body_types() {
        let (db, wid) = setup_test_db();
        let cid = make_collection(&db, &wid);

        let body_types = vec![
            (BodyType::None, None),
            (BodyType::Json, Some("{\"key\":\"val\"}".to_string())),
            (BodyType::Text, Some("plain text".to_string())),
            (
                BodyType::FormUrlEncoded,
                Some("foo=bar&baz=qux".to_string()),
            ),
            (BodyType::Multipart, Some("multipart data".to_string())),
        ];

        for (bt, content) in body_types {
            let bt_str = bt.as_str().to_string();
            let input = CreateRequestInput {
                name: format!("Req {}", bt_str),
                method: HttpMethod::POST,
                url: "https://example.com".to_string(),
                headers: vec![],
                query_params: vec![],
                body_type: bt,
                body_content: content.clone(),
                auth_type: AuthType::None,
                auth_config: AuthConfig::None,
                collection_id: Some(cid.clone()),
                folder_id: None,
            };
            let created = db.create_request(input).unwrap();
            let fetched = db.get_request(&created.id).unwrap().unwrap();
            assert_eq!(fetched.body_type.as_str(), bt_str);
            assert_eq!(fetched.body_content, content);
        }
    }
}
