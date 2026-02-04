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
