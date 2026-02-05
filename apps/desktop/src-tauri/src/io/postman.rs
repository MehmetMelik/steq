use serde::{Deserialize, Serialize};

use crate::db::Database;
use crate::models::request::{BodyType, CreateRequestInput, HttpMethod, KeyValue};

/// Postman Collection v2.1 format types
#[derive(Debug, Deserialize)]
pub struct PostmanCollection {
    pub info: PostmanInfo,
    pub item: Vec<PostmanItem>,
}

#[derive(Debug, Deserialize)]
pub struct PostmanInfo {
    pub name: String,
    #[serde(default)]
    pub description: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(untagged)]
pub enum PostmanItem {
    Folder {
        name: String,
        item: Vec<PostmanItem>,
    },
    Request {
        name: String,
        request: PostmanRequest,
    },
}

#[derive(Debug, Deserialize)]
pub struct PostmanRequest {
    pub method: Option<String>,
    pub url: PostmanUrl,
    #[serde(default)]
    pub header: Vec<PostmanHeader>,
    #[serde(default)]
    pub body: Option<PostmanBody>,
}

#[derive(Debug, Deserialize)]
#[serde(untagged)]
pub enum PostmanUrl {
    Simple(String),
    Structured {
        raw: Option<String>,
        #[serde(default)]
        #[allow(dead_code)]
        host: Option<serde_json::Value>,
        #[serde(default)]
        #[allow(dead_code)]
        path: Option<serde_json::Value>,
        #[serde(default)]
        query: Option<Vec<PostmanQueryParam>>,
    },
}

impl PostmanUrl {
    pub fn raw_url(&self) -> String {
        match self {
            PostmanUrl::Simple(s) => s.clone(),
            PostmanUrl::Structured { raw, .. } => raw.clone().unwrap_or_default(),
        }
    }

    pub fn query_params(&self) -> Vec<PostmanQueryParam> {
        match self {
            PostmanUrl::Simple(_) => vec![],
            PostmanUrl::Structured { query, .. } => query.clone().unwrap_or_default(),
        }
    }
}

#[derive(Debug, Clone, Deserialize)]
pub struct PostmanQueryParam {
    pub key: String,
    #[serde(default)]
    pub value: Option<String>,
    #[serde(default)]
    pub disabled: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct PostmanHeader {
    pub key: String,
    pub value: String,
    #[serde(default)]
    pub disabled: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct PostmanBody {
    pub mode: Option<String>,
    pub raw: Option<String>,
    #[serde(default)]
    pub options: Option<PostmanBodyOptions>,
}

#[derive(Debug, Deserialize)]
pub struct PostmanBodyOptions {
    pub raw: Option<PostmanRawOptions>,
}

#[derive(Debug, Deserialize)]
pub struct PostmanRawOptions {
    pub language: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportResult {
    pub collection_name: String,
    pub request_count: usize,
    pub folder_count: usize,
}

/// Imports a Postman Collection v2.1 JSON file into the database.
pub fn import_postman_collection(
    db: &Database,
    json_content: &str,
    workspace_id: &str,
) -> Result<ImportResult, String> {
    let collection: PostmanCollection =
        serde_json::from_str(json_content).map_err(|e| format!("Invalid Postman JSON: {}", e))?;

    let coll_input = crate::models::collection::CreateCollectionInput {
        workspace_id: workspace_id.to_string(),
        name: collection.info.name.clone(),
        description: collection.info.description.clone(),
    };
    let created_coll = db.create_collection(coll_input)?;

    let mut request_count = 0;
    let mut folder_count = 0;

    import_items(
        db,
        &collection.item,
        &created_coll.id,
        None,
        &mut request_count,
        &mut folder_count,
    )?;

    Ok(ImportResult {
        collection_name: collection.info.name,
        request_count,
        folder_count,
    })
}

fn import_items(
    db: &Database,
    items: &[PostmanItem],
    collection_id: &str,
    parent_folder_id: Option<&str>,
    request_count: &mut usize,
    folder_count: &mut usize,
) -> Result<(), String> {
    for item in items {
        match item {
            PostmanItem::Folder { name, item: children } => {
                let folder = db.create_folder(crate::models::collection::CreateFolderInput {
                    collection_id: collection_id.to_string(),
                    parent_folder_id: parent_folder_id.map(|s| s.to_string()),
                    name: name.clone(),
                })?;
                *folder_count += 1;
                import_items(db, children, collection_id, Some(&folder.id), request_count, folder_count)?;
            }
            PostmanItem::Request { name, request } => {
                let method_str = request.method.as_deref().unwrap_or("GET");
                let method = HttpMethod::from_str(method_str)
                    .unwrap_or(HttpMethod::GET);
                let url = request.url.raw_url();

                let headers: Vec<KeyValue> = request
                    .header
                    .iter()
                    .map(|h| KeyValue {
                        key: h.key.clone(),
                        value: h.value.clone(),
                        enabled: !h.disabled.unwrap_or(false),
                    })
                    .collect();

                let query_params: Vec<KeyValue> = request
                    .url
                    .query_params()
                    .iter()
                    .map(|q| KeyValue {
                        key: q.key.clone(),
                        value: q.value.clone().unwrap_or_default(),
                        enabled: !q.disabled.unwrap_or(false),
                    })
                    .collect();

                let (body_type, body_content) = match &request.body {
                    Some(body) => {
                        let mode = body.mode.as_deref().unwrap_or("none");
                        let lang = body
                            .options
                            .as_ref()
                            .and_then(|o| o.raw.as_ref())
                            .and_then(|r| r.language.as_deref());
                        let bt = match mode {
                            "raw" => {
                                if lang == Some("json") {
                                    BodyType::Json
                                } else {
                                    BodyType::Text
                                }
                            }
                            "urlencoded" => BodyType::FormUrlEncoded,
                            _ => BodyType::None,
                        };
                        (bt, body.raw.clone())
                    }
                    None => (BodyType::None, None),
                };

                let input = CreateRequestInput {
                    name: name.clone(),
                    method,
                    url,
                    headers,
                    query_params,
                    body_type,
                    body_content,
                    collection_id: Some(collection_id.to_string()),
                    folder_id: parent_folder_id.map(|s| s.to_string()),
                };

                db.create_request(input)?;
                *request_count += 1;
            }
        }
    }
    Ok(())
}

/// Exports a Steq collection to Postman v2.1 JSON format.
pub fn export_postman_collection(
    db: &Database,
    collection_id: &str,
) -> Result<String, String> {
    let tree = db.get_collection_tree(collection_id)?;

    let items = build_postman_items(&tree.root_folders, &tree.root_requests);

    let postman = serde_json::json!({
        "info": {
            "name": tree.collection.name,
            "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
        },
        "item": items
    });

    serde_json::to_string_pretty(&postman).map_err(|e| format!("Failed to serialize: {}", e))
}

fn build_postman_items(
    folders: &[crate::models::collection::CollectionTreeNode],
    requests: &[crate::models::request::ApiRequest],
) -> Vec<serde_json::Value> {
    let mut items = Vec::new();

    for folder in folders {
        let children = build_postman_items(&folder.children, &folder.requests);
        items.push(serde_json::json!({
            "name": folder.folder.name,
            "item": children
        }));
    }

    for req in requests {
        let headers: Vec<serde_json::Value> = req
            .headers
            .iter()
            .map(|h| {
                serde_json::json!({
                    "key": h.key,
                    "value": h.value,
                    "disabled": !h.enabled
                })
            })
            .collect();

        let query: Vec<serde_json::Value> = req
            .query_params
            .iter()
            .map(|q| {
                serde_json::json!({
                    "key": q.key,
                    "value": q.value,
                    "disabled": !q.enabled
                })
            })
            .collect();

        let mut request_obj = serde_json::json!({
            "method": req.method.as_str(),
            "url": {
                "raw": req.url,
                "query": query
            },
            "header": headers
        });

        match req.body_type {
            BodyType::None => {}
            _ => {
                let (mode, language) = match req.body_type {
                    BodyType::Json => ("raw", Some("json")),
                    BodyType::Text => ("raw", Some("text")),
                    BodyType::FormUrlEncoded => ("urlencoded", None),
                    _ => ("none", None),
                };
                let mut body = serde_json::json!({
                    "mode": mode,
                    "raw": req.body_content
                });
                if let Some(lang) = language {
                    body["options"] = serde_json::json!({
                        "raw": { "language": lang }
                    });
                }
                request_obj["body"] = body;
            }
        }

        items.push(serde_json::json!({
            "name": req.name,
            "request": request_obj
        }));
    }

    items
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::Database;
    use rusqlite::Connection;

    fn setup_test_db() -> (Database, String) {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch("PRAGMA foreign_keys=ON;").unwrap();
        let db = Database { conn };
        db.run_migrations().unwrap();
        let workspace = db.get_current_workspace().unwrap();
        (db, workspace.id)
    }

    #[test]
    fn import_simple_collection() {
        let (db, wid) = setup_test_db();
        let json = r#"{
            "info": { "name": "Simple API" },
            "item": [
                {
                    "name": "Get Users",
                    "request": {
                        "method": "GET",
                        "url": "https://api.example.com/users",
                        "header": []
                    }
                },
                {
                    "name": "Create User",
                    "request": {
                        "method": "POST",
                        "url": "https://api.example.com/users",
                        "header": []
                    }
                }
            ]
        }"#;

        let result = import_postman_collection(&db, json, &wid).unwrap();
        assert_eq!(result.collection_name, "Simple API");
        assert_eq!(result.request_count, 2);
        assert_eq!(result.folder_count, 0);
    }

    #[test]
    fn import_with_folders() {
        let (db, wid) = setup_test_db();
        let json = r#"{
            "info": { "name": "Folder API" },
            "item": [
                {
                    "name": "Auth",
                    "item": [
                        {
                            "name": "Login",
                            "request": {
                                "method": "POST",
                                "url": "https://api.example.com/login",
                                "header": []
                            }
                        }
                    ]
                },
                {
                    "name": "Health",
                    "request": {
                        "method": "GET",
                        "url": "https://api.example.com/health",
                        "header": []
                    }
                }
            ]
        }"#;

        let result = import_postman_collection(&db, json, &wid).unwrap();
        assert_eq!(result.folder_count, 1);
        assert_eq!(result.request_count, 2);
    }

    #[test]
    fn import_nested_folders() {
        let (db, wid) = setup_test_db();
        let json = r#"{
            "info": { "name": "Nested" },
            "item": [
                {
                    "name": "Level 1",
                    "item": [
                        {
                            "name": "Level 2",
                            "item": [
                                {
                                    "name": "Deep Request",
                                    "request": {
                                        "method": "GET",
                                        "url": "https://example.com/deep",
                                        "header": []
                                    }
                                }
                            ]
                        }
                    ]
                }
            ]
        }"#;

        let result = import_postman_collection(&db, json, &wid).unwrap();
        assert_eq!(result.folder_count, 2);
        assert_eq!(result.request_count, 1);
    }

    #[test]
    fn import_request_body_modes() {
        let (db, wid) = setup_test_db();
        let json = r#"{
            "info": { "name": "Body Modes" },
            "item": [
                {
                    "name": "JSON Body",
                    "request": {
                        "method": "POST",
                        "url": "https://example.com",
                        "header": [],
                        "body": {
                            "mode": "raw",
                            "raw": "{\"key\":\"value\"}",
                            "options": { "raw": { "language": "json" } }
                        }
                    }
                },
                {
                    "name": "Text Body",
                    "request": {
                        "method": "POST",
                        "url": "https://example.com",
                        "header": [],
                        "body": {
                            "mode": "raw",
                            "raw": "plain text",
                            "options": { "raw": { "language": "text" } }
                        }
                    }
                },
                {
                    "name": "Urlencoded",
                    "request": {
                        "method": "POST",
                        "url": "https://example.com",
                        "header": [],
                        "body": {
                            "mode": "urlencoded",
                            "raw": "foo=bar"
                        }
                    }
                },
                {
                    "name": "No Body",
                    "request": {
                        "method": "GET",
                        "url": "https://example.com",
                        "header": []
                    }
                }
            ]
        }"#;

        let result = import_postman_collection(&db, json, &wid).unwrap();
        assert_eq!(result.request_count, 4);

        // Verify collection was created and check the tree
        let colls = db.list_collections(&wid).unwrap();
        let tree = db.get_collection_tree(&colls[0].id).unwrap();
        assert_eq!(tree.root_requests.len(), 4);
    }

    #[test]
    fn import_headers_and_query_params() {
        let (db, wid) = setup_test_db();
        let json = r#"{
            "info": { "name": "Params" },
            "item": [
                {
                    "name": "With Headers",
                    "request": {
                        "method": "GET",
                        "url": {
                            "raw": "https://api.example.com/users?page=1",
                            "query": [
                                { "key": "page", "value": "1" },
                                { "key": "disabled_param", "value": "x", "disabled": true }
                            ]
                        },
                        "header": [
                            { "key": "Authorization", "value": "Bearer token" },
                            { "key": "X-Disabled", "value": "val", "disabled": true }
                        ]
                    }
                }
            ]
        }"#;

        let result = import_postman_collection(&db, json, &wid).unwrap();
        assert_eq!(result.request_count, 1);

        let colls = db.list_collections(&wid).unwrap();
        let tree = db.get_collection_tree(&colls[0].id).unwrap();
        let req = &tree.root_requests[0];

        assert_eq!(req.headers.len(), 2);
        assert!(req.headers[0].enabled);
        assert!(!req.headers[1].enabled);

        assert_eq!(req.query_params.len(), 2);
        assert!(req.query_params[0].enabled);
        assert!(!req.query_params[1].enabled);
    }

    #[test]
    fn import_simple_url_string() {
        let (db, wid) = setup_test_db();
        let json = r#"{
            "info": { "name": "Simple URL" },
            "item": [
                {
                    "name": "Simple",
                    "request": {
                        "method": "GET",
                        "url": "https://example.com/simple",
                        "header": []
                    }
                }
            ]
        }"#;

        let result = import_postman_collection(&db, json, &wid).unwrap();
        assert_eq!(result.request_count, 1);

        let colls = db.list_collections(&wid).unwrap();
        let tree = db.get_collection_tree(&colls[0].id).unwrap();
        assert_eq!(tree.root_requests[0].url, "https://example.com/simple");
    }

    #[test]
    fn import_invalid_json() {
        let (db, wid) = setup_test_db();
        let result = import_postman_collection(&db, "not valid json {{{", &wid);
        assert!(result.is_err());
    }

    #[test]
    fn export_roundtrip() {
        let (db, wid) = setup_test_db();

        // Import a collection
        let json = r#"{
            "info": { "name": "Roundtrip" },
            "item": [
                {
                    "name": "Auth",
                    "item": [
                        {
                            "name": "Login",
                            "request": {
                                "method": "POST",
                                "url": "https://api.example.com/login",
                                "header": [
                                    { "key": "Content-Type", "value": "application/json" }
                                ],
                                "body": {
                                    "mode": "raw",
                                    "raw": "{\"user\":\"test\"}",
                                    "options": { "raw": { "language": "json" } }
                                }
                            }
                        }
                    ]
                },
                {
                    "name": "Get Users",
                    "request": {
                        "method": "GET",
                        "url": {
                            "raw": "https://api.example.com/users",
                            "query": [{ "key": "limit", "value": "10" }]
                        },
                        "header": []
                    }
                }
            ]
        }"#;

        let import_result = import_postman_collection(&db, json, &wid).unwrap();
        let colls = db.list_collections(&wid).unwrap();
        let coll_id = &colls[0].id;

        // Export
        let exported = export_postman_collection(&db, coll_id).unwrap();
        let parsed: serde_json::Value = serde_json::from_str(&exported).unwrap();

        assert_eq!(parsed["info"]["name"], "Roundtrip");
        let items = parsed["item"].as_array().unwrap();
        // Should have a folder + a request
        assert_eq!(items.len(), 2);

        // Folder "Auth" with 1 request
        let folder_item = items.iter().find(|i| i["name"] == "Auth").unwrap();
        let folder_children = folder_item["item"].as_array().unwrap();
        assert_eq!(folder_children.len(), 1);
        assert_eq!(folder_children[0]["name"], "Login");
        assert_eq!(folder_children[0]["request"]["method"], "POST");

        // Root request
        let req_item = items.iter().find(|i| i["name"] == "Get Users").unwrap();
        assert_eq!(req_item["request"]["method"], "GET");

        assert_eq!(import_result.request_count, 2);
        assert_eq!(import_result.folder_count, 1);
    }
}
