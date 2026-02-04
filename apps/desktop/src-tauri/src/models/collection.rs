use serde::{Deserialize, Serialize};

use super::request::ApiRequest;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Collection {
    pub id: String,
    pub workspace_id: String,
    pub name: String,
    pub description: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Folder {
    pub id: String,
    pub collection_id: String,
    pub parent_folder_id: Option<String>,
    pub name: String,
    pub sort_order: i32,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CollectionTreeNode {
    pub folder: Folder,
    pub children: Vec<CollectionTreeNode>,
    pub requests: Vec<ApiRequest>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CollectionTree {
    pub collection: Collection,
    pub root_folders: Vec<CollectionTreeNode>,
    pub root_requests: Vec<ApiRequest>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateCollectionInput {
    pub workspace_id: String,
    pub name: String,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateFolderInput {
    pub collection_id: String,
    pub parent_folder_id: Option<String>,
    pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RenameInput {
    pub id: String,
    pub name: String,
}
