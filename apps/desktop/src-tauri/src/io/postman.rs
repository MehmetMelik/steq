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

/// Exports an Apiary collection to Postman v2.1 JSON format.
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
