use rusqlite::params;

use crate::db::Database;
use crate::models::collection::{
    Collection, CollectionTree, CollectionTreeNode, CreateCollectionInput, CreateFolderInput,
    Folder, RenameInput,
};
use crate::models::request::ApiRequest;

impl Database {
    pub fn create_collection(&self, input: CreateCollectionInput) -> Result<Collection, String> {
        let id = uuid::Uuid::now_v7().to_string();
        let now = chrono::Utc::now().to_rfc3339();

        self.conn
            .execute(
                "INSERT INTO collections (id, workspace_id, name, description, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                params![id, input.workspace_id, input.name, input.description, now, now],
            )
            .map_err(|e| format!("Insert collection: {}", e))?;

        Ok(Collection {
            id,
            workspace_id: input.workspace_id,
            name: input.name,
            description: input.description,
            created_at: now.clone(),
            updated_at: now,
        })
    }

    pub fn list_collections(&self, workspace_id: &str) -> Result<Vec<Collection>, String> {
        let mut stmt = self
            .conn
            .prepare(
                "SELECT id, workspace_id, name, description, created_at, updated_at
                 FROM collections WHERE workspace_id = ?1 ORDER BY name ASC",
            )
            .map_err(|e| format!("Prepare list_collections: {}", e))?;

        let rows = stmt
            .query_map(params![workspace_id], |row| {
                Ok(Collection {
                    id: row.get(0)?,
                    workspace_id: row.get(1)?,
                    name: row.get(2)?,
                    description: row.get(3)?,
                    created_at: row.get(4)?,
                    updated_at: row.get(5)?,
                })
            })
            .map_err(|e| format!("Query list_collections: {}", e))?;

        let mut collections = Vec::new();
        for row in rows {
            collections.push(row.map_err(|e| format!("Read collection row: {}", e))?);
        }
        Ok(collections)
    }

    pub fn rename_collection(&self, input: RenameInput) -> Result<(), String> {
        let now = chrono::Utc::now().to_rfc3339();
        self.conn
            .execute(
                "UPDATE collections SET name = ?1, updated_at = ?2 WHERE id = ?3",
                params![input.name, now, input.id],
            )
            .map_err(|e| format!("Rename collection: {}", e))?;
        Ok(())
    }

    pub fn delete_collection(&self, id: &str) -> Result<(), String> {
        self.conn
            .execute("DELETE FROM collections WHERE id = ?1", params![id])
            .map_err(|e| format!("Delete collection: {}", e))?;
        Ok(())
    }

    pub fn create_folder(&self, input: CreateFolderInput) -> Result<Folder, String> {
        let id = uuid::Uuid::now_v7().to_string();
        let now = chrono::Utc::now().to_rfc3339();

        self.conn
            .execute(
                "INSERT INTO folders (id, collection_id, parent_folder_id, name, sort_order, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, 0, ?5, ?6)",
                params![id, input.collection_id, input.parent_folder_id, input.name, now, now],
            )
            .map_err(|e| format!("Insert folder: {}", e))?;

        Ok(Folder {
            id,
            collection_id: input.collection_id,
            parent_folder_id: input.parent_folder_id,
            name: input.name,
            sort_order: 0,
            created_at: now.clone(),
            updated_at: now,
        })
    }

    pub fn rename_folder(&self, input: RenameInput) -> Result<(), String> {
        let now = chrono::Utc::now().to_rfc3339();
        self.conn
            .execute(
                "UPDATE folders SET name = ?1, updated_at = ?2 WHERE id = ?3",
                params![input.name, now, input.id],
            )
            .map_err(|e| format!("Rename folder: {}", e))?;
        Ok(())
    }

    pub fn delete_folder(&self, id: &str) -> Result<(), String> {
        self.conn
            .execute("DELETE FROM folders WHERE id = ?1", params![id])
            .map_err(|e| format!("Delete folder: {}", e))?;
        Ok(())
    }

    pub fn get_collection_tree(&self, collection_id: &str) -> Result<CollectionTree, String> {
        // Get the collection
        let collection: Collection = self
            .conn
            .query_row(
                "SELECT id, workspace_id, name, description, created_at, updated_at
                 FROM collections WHERE id = ?1",
                params![collection_id],
                |row| {
                    Ok(Collection {
                        id: row.get(0)?,
                        workspace_id: row.get(1)?,
                        name: row.get(2)?,
                        description: row.get(3)?,
                        created_at: row.get(4)?,
                        updated_at: row.get(5)?,
                    })
                },
            )
            .map_err(|e| format!("Get collection: {}", e))?;

        // Get all folders for this collection
        let mut folder_stmt = self
            .conn
            .prepare(
                "SELECT id, collection_id, parent_folder_id, name, sort_order, created_at, updated_at
                 FROM folders WHERE collection_id = ?1 ORDER BY sort_order ASC, name ASC",
            )
            .map_err(|e| format!("Prepare list_folders: {}", e))?;

        let folders: Vec<Folder> = folder_stmt
            .query_map(params![collection_id], |row| {
                Ok(Folder {
                    id: row.get(0)?,
                    collection_id: row.get(1)?,
                    parent_folder_id: row.get(2)?,
                    name: row.get(3)?,
                    sort_order: row.get(4)?,
                    created_at: row.get(5)?,
                    updated_at: row.get(6)?,
                })
            })
            .map_err(|e| format!("Query list_folders: {}", e))?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| format!("Read folder rows: {}", e))?;

        // Get all requests for this collection
        let mut req_stmt = self
            .conn
            .prepare(
                "SELECT id, collection_id, folder_id, name, method, url, headers, query_params, body_type, body_content, sort_order, created_at, updated_at
                 FROM requests WHERE collection_id = ?1 ORDER BY sort_order ASC, name ASC",
            )
            .map_err(|e| format!("Prepare list_requests_tree: {}", e))?;

        let requests: Vec<ApiRequest> = req_stmt
            .query_map(params![collection_id], |row| {
                Ok(Self::row_to_request(row))
            })
            .map_err(|e| format!("Query list_requests_tree: {}", e))?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| format!("Read request rows: {}", e))?
            .into_iter()
            .collect::<Result<Vec<_>, _>>()?;

        // Build tree recursively
        let root_folders = Self::build_folder_tree(None, &folders, &requests);
        let root_requests: Vec<ApiRequest> = requests
            .iter()
            .filter(|r| r.folder_id.is_none())
            .cloned()
            .collect();

        Ok(CollectionTree {
            collection,
            root_folders,
            root_requests,
        })
    }

    fn build_folder_tree(
        parent_id: Option<&str>,
        all_folders: &[Folder],
        all_requests: &[ApiRequest],
    ) -> Vec<CollectionTreeNode> {
        all_folders
            .iter()
            .filter(|f| f.parent_folder_id.as_deref() == parent_id)
            .map(|folder| {
                let children =
                    Self::build_folder_tree(Some(&folder.id), all_folders, all_requests);
                let requests: Vec<ApiRequest> = all_requests
                    .iter()
                    .filter(|r| r.folder_id.as_deref() == Some(&folder.id))
                    .cloned()
                    .collect();
                CollectionTreeNode {
                    folder: folder.clone(),
                    children,
                    requests,
                }
            })
            .collect()
    }
}

#[cfg(test)]
mod tests {
    use crate::db::Database;
    use crate::models::collection::*;
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

    #[test]
    fn create_and_list_collections() {
        let (db, wid) = setup_test_db();

        db.create_collection(CreateCollectionInput {
            workspace_id: wid.clone(),
            name: "Beta".to_string(),
            description: None,
        })
        .unwrap();
        db.create_collection(CreateCollectionInput {
            workspace_id: wid.clone(),
            name: "Alpha".to_string(),
            description: Some("Desc".to_string()),
        })
        .unwrap();

        let list = db.list_collections(&wid).unwrap();
        assert_eq!(list.len(), 2);
        // Ordered by name ASC
        assert_eq!(list[0].name, "Alpha");
        assert_eq!(list[1].name, "Beta");
        assert_eq!(list[0].description, Some("Desc".to_string()));
    }

    #[test]
    fn rename_collection() {
        let (db, wid) = setup_test_db();
        let coll = db
            .create_collection(CreateCollectionInput {
                workspace_id: wid.clone(),
                name: "Old Name".to_string(),
                description: None,
            })
            .unwrap();

        db.rename_collection(RenameInput {
            id: coll.id.clone(),
            name: "New Name".to_string(),
        })
        .unwrap();

        let list = db.list_collections(&wid).unwrap();
        assert_eq!(list[0].name, "New Name");
    }

    #[test]
    fn delete_collection() {
        let (db, wid) = setup_test_db();
        let coll = db
            .create_collection(CreateCollectionInput {
                workspace_id: wid.clone(),
                name: "To Delete".to_string(),
                description: None,
            })
            .unwrap();

        db.delete_collection(&coll.id).unwrap();
        let list = db.list_collections(&wid).unwrap();
        assert!(list.is_empty());
    }

    #[test]
    fn create_folder_root_level() {
        let (db, wid) = setup_test_db();
        let coll = db
            .create_collection(CreateCollectionInput {
                workspace_id: wid,
                name: "Coll".to_string(),
                description: None,
            })
            .unwrap();

        let folder = db
            .create_folder(CreateFolderInput {
                collection_id: coll.id.clone(),
                parent_folder_id: None,
                name: "Root Folder".to_string(),
            })
            .unwrap();

        assert!(!folder.id.is_empty());
        assert_eq!(folder.name, "Root Folder");
        assert!(folder.parent_folder_id.is_none());
    }

    #[test]
    fn create_nested_folder() {
        let (db, wid) = setup_test_db();
        let coll = db
            .create_collection(CreateCollectionInput {
                workspace_id: wid,
                name: "Coll".to_string(),
                description: None,
            })
            .unwrap();

        let parent = db
            .create_folder(CreateFolderInput {
                collection_id: coll.id.clone(),
                parent_folder_id: None,
                name: "Parent".to_string(),
            })
            .unwrap();

        let child = db
            .create_folder(CreateFolderInput {
                collection_id: coll.id.clone(),
                parent_folder_id: Some(parent.id.clone()),
                name: "Child".to_string(),
            })
            .unwrap();

        assert_eq!(child.parent_folder_id.as_deref(), Some(parent.id.as_str()));
    }

    #[test]
    fn rename_folder() {
        let (db, wid) = setup_test_db();
        let coll = db
            .create_collection(CreateCollectionInput {
                workspace_id: wid,
                name: "Coll".to_string(),
                description: None,
            })
            .unwrap();

        let folder = db
            .create_folder(CreateFolderInput {
                collection_id: coll.id.clone(),
                parent_folder_id: None,
                name: "Old".to_string(),
            })
            .unwrap();

        db.rename_folder(RenameInput {
            id: folder.id.clone(),
            name: "New".to_string(),
        })
        .unwrap();

        let tree = db.get_collection_tree(&coll.id).unwrap();
        assert_eq!(tree.root_folders[0].folder.name, "New");
    }

    #[test]
    fn delete_folder() {
        let (db, wid) = setup_test_db();
        let coll = db
            .create_collection(CreateCollectionInput {
                workspace_id: wid,
                name: "Coll".to_string(),
                description: None,
            })
            .unwrap();

        let folder = db
            .create_folder(CreateFolderInput {
                collection_id: coll.id.clone(),
                parent_folder_id: None,
                name: "Folder".to_string(),
            })
            .unwrap();

        db.delete_folder(&folder.id).unwrap();
        let tree = db.get_collection_tree(&coll.id).unwrap();
        assert!(tree.root_folders.is_empty());
    }

    #[test]
    fn get_collection_tree_empty() {
        let (db, wid) = setup_test_db();
        let coll = db
            .create_collection(CreateCollectionInput {
                workspace_id: wid,
                name: "Empty".to_string(),
                description: None,
            })
            .unwrap();

        let tree = db.get_collection_tree(&coll.id).unwrap();
        assert_eq!(tree.collection.name, "Empty");
        assert!(tree.root_folders.is_empty());
        assert!(tree.root_requests.is_empty());
    }

    #[test]
    fn get_collection_tree_with_structure() {
        let (db, wid) = setup_test_db();
        let coll = db
            .create_collection(CreateCollectionInput {
                workspace_id: wid,
                name: "Full".to_string(),
                description: None,
            })
            .unwrap();

        // Root folder with a nested folder
        let root_folder = db
            .create_folder(CreateFolderInput {
                collection_id: coll.id.clone(),
                parent_folder_id: None,
                name: "Auth".to_string(),
            })
            .unwrap();

        let nested_folder = db
            .create_folder(CreateFolderInput {
                collection_id: coll.id.clone(),
                parent_folder_id: Some(root_folder.id.clone()),
                name: "OAuth".to_string(),
            })
            .unwrap();

        // Root-level request (no folder)
        db.create_request(CreateRequestInput {
            name: "Health Check".to_string(),
            method: HttpMethod::GET,
            url: "https://api.example.com/health".to_string(),
            headers: vec![],
            query_params: vec![],
            body_type: BodyType::None,
            body_content: None,
            collection_id: Some(coll.id.clone()),
            folder_id: None,
        })
        .unwrap();

        // Request in root folder
        db.create_request(CreateRequestInput {
            name: "Login".to_string(),
            method: HttpMethod::POST,
            url: "https://api.example.com/login".to_string(),
            headers: vec![],
            query_params: vec![],
            body_type: BodyType::Json,
            body_content: Some("{\"user\":\"test\"}".to_string()),
            collection_id: Some(coll.id.clone()),
            folder_id: Some(root_folder.id.clone()),
        })
        .unwrap();

        // Request in nested folder
        db.create_request(CreateRequestInput {
            name: "Token".to_string(),
            method: HttpMethod::POST,
            url: "https://api.example.com/oauth/token".to_string(),
            headers: vec![],
            query_params: vec![],
            body_type: BodyType::FormUrlEncoded,
            body_content: Some("grant_type=client_credentials".to_string()),
            collection_id: Some(coll.id.clone()),
            folder_id: Some(nested_folder.id.clone()),
        })
        .unwrap();

        let tree = db.get_collection_tree(&coll.id).unwrap();
        assert_eq!(tree.root_requests.len(), 1);
        assert_eq!(tree.root_requests[0].name, "Health Check");

        assert_eq!(tree.root_folders.len(), 1);
        assert_eq!(tree.root_folders[0].folder.name, "Auth");
        assert_eq!(tree.root_folders[0].requests.len(), 1);
        assert_eq!(tree.root_folders[0].requests[0].name, "Login");

        assert_eq!(tree.root_folders[0].children.len(), 1);
        assert_eq!(tree.root_folders[0].children[0].folder.name, "OAuth");
        assert_eq!(tree.root_folders[0].children[0].requests.len(), 1);
        assert_eq!(tree.root_folders[0].children[0].requests[0].name, "Token");
    }

    #[test]
    fn delete_collection_cascades() {
        let (db, wid) = setup_test_db();
        let coll = db
            .create_collection(CreateCollectionInput {
                workspace_id: wid.clone(),
                name: "Cascade".to_string(),
                description: None,
            })
            .unwrap();

        let folder = db
            .create_folder(CreateFolderInput {
                collection_id: coll.id.clone(),
                parent_folder_id: None,
                name: "Folder".to_string(),
            })
            .unwrap();

        db.create_request(CreateRequestInput {
            name: "Req".to_string(),
            method: HttpMethod::GET,
            url: "https://example.com".to_string(),
            headers: vec![],
            query_params: vec![],
            body_type: BodyType::None,
            body_content: None,
            collection_id: Some(coll.id.clone()),
            folder_id: Some(folder.id.clone()),
        })
        .unwrap();

        db.delete_collection(&coll.id).unwrap();

        // Collection gone
        let colls = db.list_collections(&wid).unwrap();
        assert!(colls.is_empty());

        // Folders cascade-deleted; requests set to NULL collection
        // Since folder is deleted, request's folder_id is SET NULL, and collection_id is SET NULL
        let all_requests = db.list_requests_by_collection(&coll.id).unwrap();
        assert!(all_requests.is_empty());
    }
}
