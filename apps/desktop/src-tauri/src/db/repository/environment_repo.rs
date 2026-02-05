use crate::crypto;
use crate::db::Database;
use crate::models::environment::{
    CreateEnvironmentInput, Environment, UpdateEnvironmentInput, Variable,
};
use rusqlite::params;

impl Database {
    pub fn create_environment(&self, input: &CreateEnvironmentInput) -> Result<Environment, String> {
        let id = uuid::Uuid::now_v7().to_string();
        let now = chrono::Utc::now().to_rfc3339();

        self.conn
            .execute(
                "INSERT INTO environments (id, workspace_id, name, is_active, created_at, updated_at)
                 VALUES (?1, ?2, ?3, 0, ?4, ?5)",
                params![id, input.workspace_id, input.name, &now, &now],
            )
            .map_err(|e| format!("Failed to create environment: {}", e))?;

        Ok(Environment {
            id,
            workspace_id: input.workspace_id.clone(),
            name: input.name.clone(),
            is_active: false,
            variables: vec![],
            created_at: now.clone(),
            updated_at: now,
        })
    }

    pub fn list_environments(&self, workspace_id: &str) -> Result<Vec<Environment>, String> {
        let mut stmt = self
            .conn
            .prepare(
                "SELECT id, workspace_id, name, is_active, created_at, updated_at
                 FROM environments WHERE workspace_id = ?1 ORDER BY created_at",
            )
            .map_err(|e| format!("Failed to prepare query: {}", e))?;

        let envs: Vec<Environment> = stmt
            .query_map(params![workspace_id], |row| {
                Ok(Environment {
                    id: row.get(0)?,
                    workspace_id: row.get(1)?,
                    name: row.get(2)?,
                    is_active: row.get::<_, i32>(3)? != 0,
                    variables: vec![],
                    created_at: row.get(4)?,
                    updated_at: row.get(5)?,
                })
            })
            .map_err(|e| format!("Failed to query environments: {}", e))?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| format!("Failed to read environments: {}", e))?;

        // Load variables for each environment
        let mut result = Vec::with_capacity(envs.len());
        for mut env in envs {
            env.variables = self.list_variables(&env.id)?;
            result.push(env);
        }

        Ok(result)
    }

    pub fn get_environment(&self, id: &str) -> Result<Option<Environment>, String> {
        let mut stmt = self
            .conn
            .prepare(
                "SELECT id, workspace_id, name, is_active, created_at, updated_at
                 FROM environments WHERE id = ?1",
            )
            .map_err(|e| format!("Failed to prepare query: {}", e))?;

        let env = stmt
            .query_row(params![id], |row| {
                Ok(Environment {
                    id: row.get(0)?,
                    workspace_id: row.get(1)?,
                    name: row.get(2)?,
                    is_active: row.get::<_, i32>(3)? != 0,
                    variables: vec![],
                    created_at: row.get(4)?,
                    updated_at: row.get(5)?,
                })
            })
            .optional()
            .map_err(|e| format!("Failed to query environment: {}", e))?;

        match env {
            Some(mut e) => {
                e.variables = self.list_variables(&e.id)?;
                Ok(Some(e))
            }
            None => Ok(None),
        }
    }

    pub fn set_active_environment(
        &self,
        id: &str,
        workspace_id: &str,
    ) -> Result<(), String> {
        // Deactivate all environments in this workspace
        self.conn
            .execute(
                "UPDATE environments SET is_active = 0 WHERE workspace_id = ?1",
                params![workspace_id],
            )
            .map_err(|e| format!("Failed to deactivate environments: {}", e))?;

        // Activate the specified one
        self.conn
            .execute(
                "UPDATE environments SET is_active = 1 WHERE id = ?1",
                params![id],
            )
            .map_err(|e| format!("Failed to activate environment: {}", e))?;

        Ok(())
    }

    pub fn deactivate_all_environments(&self, workspace_id: &str) -> Result<(), String> {
        self.conn
            .execute(
                "UPDATE environments SET is_active = 0 WHERE workspace_id = ?1",
                params![workspace_id],
            )
            .map_err(|e| format!("Failed to deactivate environments: {}", e))?;
        Ok(())
    }

    pub fn update_environment(&self, input: &UpdateEnvironmentInput) -> Result<Environment, String> {
        let now = chrono::Utc::now().to_rfc3339();

        if let Some(ref name) = input.name {
            self.conn
                .execute(
                    "UPDATE environments SET name = ?1, updated_at = ?2 WHERE id = ?3",
                    params![name, &now, input.id],
                )
                .map_err(|e| format!("Failed to update environment name: {}", e))?;
        }

        if let Some(ref variables) = input.variables {
            self.sync_variables(&input.id, variables)?;
        }

        self.get_environment(&input.id)?
            .ok_or_else(|| "Environment not found after update".to_string())
    }

    pub fn delete_environment(&self, id: &str) -> Result<(), String> {
        self.conn
            .execute("DELETE FROM environments WHERE id = ?1", params![id])
            .map_err(|e| format!("Failed to delete environment: {}", e))?;
        Ok(())
    }

    // --- Variable helpers ---

    fn list_variables(&self, environment_id: &str) -> Result<Vec<Variable>, String> {
        let mut stmt = self
            .conn
            .prepare(
                "SELECT id, environment_id, key, value, is_secret, enabled, sort_order, created_at, updated_at
                 FROM variables WHERE environment_id = ?1 ORDER BY sort_order, created_at",
            )
            .map_err(|e| format!("Failed to prepare variables query: {}", e))?;

        let vars = stmt
            .query_map(params![environment_id], |row| {
                Ok(Variable {
                    id: row.get(0)?,
                    environment_id: row.get(1)?,
                    key: row.get(2)?,
                    value: row.get(3)?,
                    is_secret: row.get::<_, i32>(4)? != 0,
                    enabled: row.get::<_, i32>(5)? != 0,
                    sort_order: row.get(6)?,
                    created_at: row.get(7)?,
                    updated_at: row.get(8)?,
                })
            })
            .map_err(|e| format!("Failed to query variables: {}", e))?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| format!("Failed to read variables: {}", e))?;

        // Decrypt secret values for the response
        let mut result = Vec::with_capacity(vars.len());
        for mut var in vars {
            if var.is_secret {
                var.value = crypto::decrypt(&var.value).unwrap_or_else(|_| "***".to_string());
            }
            result.push(var);
        }

        Ok(result)
    }

    /// Syncs variables for an environment: deletes removed ones, upserts existing/new ones.
    fn sync_variables(&self, environment_id: &str, variables: &[Variable]) -> Result<(), String> {
        let now = chrono::Utc::now().to_rfc3339();

        // Get existing variable IDs
        let mut stmt = self
            .conn
            .prepare("SELECT id FROM variables WHERE environment_id = ?1")
            .map_err(|e| format!("Failed to prepare query: {}", e))?;

        let existing_ids: Vec<String> = stmt
            .query_map(params![environment_id], |row| row.get(0))
            .map_err(|e| format!("Failed to query variables: {}", e))?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| format!("Failed to read variable IDs: {}", e))?;

        // Determine which to delete (existing IDs not in input)
        let input_ids: Vec<&str> = variables.iter().map(|v| v.id.as_str()).collect();
        for existing_id in &existing_ids {
            if !input_ids.contains(&existing_id.as_str()) {
                self.conn
                    .execute("DELETE FROM variables WHERE id = ?1", params![existing_id])
                    .map_err(|e| format!("Failed to delete variable: {}", e))?;
            }
        }

        // Upsert each variable
        for (i, var) in variables.iter().enumerate() {
            let stored_value = if var.is_secret {
                crypto::encrypt(&var.value)?
            } else {
                var.value.clone()
            };

            if existing_ids.contains(&var.id) {
                self.conn
                    .execute(
                        "UPDATE variables SET key = ?1, value = ?2, is_secret = ?3, enabled = ?4,
                         sort_order = ?5, updated_at = ?6 WHERE id = ?7",
                        params![
                            var.key,
                            stored_value,
                            var.is_secret as i32,
                            var.enabled as i32,
                            i as i32,
                            &now,
                            var.id
                        ],
                    )
                    .map_err(|e| format!("Failed to update variable: {}", e))?;
            } else {
                let id = if var.id.is_empty() {
                    uuid::Uuid::now_v7().to_string()
                } else {
                    var.id.clone()
                };
                self.conn
                    .execute(
                        "INSERT INTO variables (id, environment_id, key, value, is_secret, enabled, sort_order, created_at, updated_at)
                         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
                        params![
                            id,
                            environment_id,
                            var.key,
                            stored_value,
                            var.is_secret as i32,
                            var.enabled as i32,
                            i as i32,
                            &now,
                            &now
                        ],
                    )
                    .map_err(|e| format!("Failed to insert variable: {}", e))?;
            }
        }

        Ok(())
    }

    /// Returns a flat map of key→value for all enabled variables
    /// in the currently active environment for the given workspace.
    pub fn get_resolved_variables(&self, workspace_id: &str) -> Result<Vec<(String, String)>, String> {
        let mut stmt = self
            .conn
            .prepare(
                "SELECT v.key, v.value, v.is_secret
                 FROM variables v
                 INNER JOIN environments e ON v.environment_id = e.id
                 WHERE e.workspace_id = ?1 AND e.is_active = 1 AND v.enabled = 1
                 ORDER BY v.sort_order",
            )
            .map_err(|e| format!("Failed to prepare resolved variables query: {}", e))?;

        let pairs = stmt
            .query_map(params![workspace_id], |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, i32>(2)? != 0,
                ))
            })
            .map_err(|e| format!("Failed to query resolved variables: {}", e))?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| format!("Failed to read resolved variables: {}", e))?;

        let mut result = Vec::with_capacity(pairs.len());
        for (key, value, is_secret) in pairs {
            let decrypted_value = if is_secret {
                crypto::decrypt(&value).unwrap_or_else(|_| String::new())
            } else {
                value
            };
            result.push((key, decrypted_value));
        }

        Ok(result)
    }
}

use rusqlite::OptionalExtension;

#[cfg(test)]
mod tests {
    use crate::db::Database;
    use crate::models::environment::*;
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
    fn create_and_list_environments() {
        let (db, wid) = setup_test_db();

        db.create_environment(&CreateEnvironmentInput {
            workspace_id: wid.clone(),
            name: "Production".to_string(),
        })
        .unwrap();
        db.create_environment(&CreateEnvironmentInput {
            workspace_id: wid.clone(),
            name: "Staging".to_string(),
        })
        .unwrap();

        let envs = db.list_environments(&wid).unwrap();
        assert_eq!(envs.len(), 2);
        assert_eq!(envs[0].name, "Production");
        assert_eq!(envs[1].name, "Staging");
        assert!(!envs[0].is_active);
    }

    #[test]
    fn get_environment() {
        let (db, wid) = setup_test_db();
        let env = db
            .create_environment(&CreateEnvironmentInput {
                workspace_id: wid.clone(),
                name: "Dev".to_string(),
            })
            .unwrap();

        let fetched = db.get_environment(&env.id).unwrap().unwrap();
        assert_eq!(fetched.name, "Dev");
        assert_eq!(fetched.workspace_id, wid);
    }

    #[test]
    fn get_environment_not_found() {
        let (db, _) = setup_test_db();
        let result = db.get_environment("nonexistent").unwrap();
        assert!(result.is_none());
    }

    #[test]
    fn set_active_environment() {
        let (db, wid) = setup_test_db();
        let env1 = db
            .create_environment(&CreateEnvironmentInput {
                workspace_id: wid.clone(),
                name: "Env1".to_string(),
            })
            .unwrap();
        let env2 = db
            .create_environment(&CreateEnvironmentInput {
                workspace_id: wid.clone(),
                name: "Env2".to_string(),
            })
            .unwrap();

        db.set_active_environment(&env1.id, &wid).unwrap();
        let envs = db.list_environments(&wid).unwrap();
        assert!(envs.iter().find(|e| e.id == env1.id).unwrap().is_active);
        assert!(!envs.iter().find(|e| e.id == env2.id).unwrap().is_active);

        // Switching to env2 deactivates env1
        db.set_active_environment(&env2.id, &wid).unwrap();
        let envs = db.list_environments(&wid).unwrap();
        assert!(!envs.iter().find(|e| e.id == env1.id).unwrap().is_active);
        assert!(envs.iter().find(|e| e.id == env2.id).unwrap().is_active);
    }

    #[test]
    fn deactivate_all_environments() {
        let (db, wid) = setup_test_db();
        let env = db
            .create_environment(&CreateEnvironmentInput {
                workspace_id: wid.clone(),
                name: "Env".to_string(),
            })
            .unwrap();

        db.set_active_environment(&env.id, &wid).unwrap();
        db.deactivate_all_environments(&wid).unwrap();

        let envs = db.list_environments(&wid).unwrap();
        assert!(envs.iter().all(|e| !e.is_active));
    }

    #[test]
    fn update_environment_name() {
        let (db, wid) = setup_test_db();
        let env = db
            .create_environment(&CreateEnvironmentInput {
                workspace_id: wid.clone(),
                name: "Old".to_string(),
            })
            .unwrap();

        let updated = db
            .update_environment(&UpdateEnvironmentInput {
                id: env.id.clone(),
                name: Some("New".to_string()),
                variables: None,
            })
            .unwrap();

        assert_eq!(updated.name, "New");
    }

    #[test]
    fn sync_variables_add() {
        let (db, wid) = setup_test_db();
        let env = db
            .create_environment(&CreateEnvironmentInput {
                workspace_id: wid.clone(),
                name: "Env".to_string(),
            })
            .unwrap();

        let vars = vec![Variable {
            id: "".to_string(), // empty = new
            environment_id: env.id.clone(),
            key: "API_KEY".to_string(),
            value: "secret123".to_string(),
            is_secret: false,
            enabled: true,
            sort_order: 0,
            created_at: String::new(),
            updated_at: String::new(),
        }];

        let updated = db
            .update_environment(&UpdateEnvironmentInput {
                id: env.id.clone(),
                name: None,
                variables: Some(vars),
            })
            .unwrap();

        assert_eq!(updated.variables.len(), 1);
        assert_eq!(updated.variables[0].key, "API_KEY");
        assert_eq!(updated.variables[0].value, "secret123");
        assert!(!updated.variables[0].id.is_empty());
    }

    #[test]
    fn sync_variables_update() {
        let (db, wid) = setup_test_db();
        let env = db
            .create_environment(&CreateEnvironmentInput {
                workspace_id: wid.clone(),
                name: "Env".to_string(),
            })
            .unwrap();

        // Add initial variable
        let vars = vec![Variable {
            id: "".to_string(),
            environment_id: env.id.clone(),
            key: "HOST".to_string(),
            value: "localhost".to_string(),
            is_secret: false,
            enabled: true,
            sort_order: 0,
            created_at: String::new(),
            updated_at: String::new(),
        }];

        let updated = db
            .update_environment(&UpdateEnvironmentInput {
                id: env.id.clone(),
                name: None,
                variables: Some(vars),
            })
            .unwrap();

        let var_id = updated.variables[0].id.clone();

        // Update the variable value
        let updated_vars = vec![Variable {
            id: var_id.clone(),
            environment_id: env.id.clone(),
            key: "HOST".to_string(),
            value: "production.example.com".to_string(),
            is_secret: false,
            enabled: true,
            sort_order: 0,
            created_at: String::new(),
            updated_at: String::new(),
        }];

        let result = db
            .update_environment(&UpdateEnvironmentInput {
                id: env.id.clone(),
                name: None,
                variables: Some(updated_vars),
            })
            .unwrap();

        assert_eq!(result.variables.len(), 1);
        assert_eq!(result.variables[0].value, "production.example.com");
        assert_eq!(result.variables[0].id, var_id);
    }

    #[test]
    fn sync_variables_delete() {
        let (db, wid) = setup_test_db();
        let env = db
            .create_environment(&CreateEnvironmentInput {
                workspace_id: wid.clone(),
                name: "Env".to_string(),
            })
            .unwrap();

        // Add two variables
        let vars = vec![
            Variable {
                id: "".to_string(),
                environment_id: env.id.clone(),
                key: "A".to_string(),
                value: "1".to_string(),
                is_secret: false,
                enabled: true,
                sort_order: 0,
                created_at: String::new(),
                updated_at: String::new(),
            },
            Variable {
                id: "".to_string(),
                environment_id: env.id.clone(),
                key: "B".to_string(),
                value: "2".to_string(),
                is_secret: false,
                enabled: true,
                sort_order: 1,
                created_at: String::new(),
                updated_at: String::new(),
            },
        ];

        let updated = db
            .update_environment(&UpdateEnvironmentInput {
                id: env.id.clone(),
                name: None,
                variables: Some(vars),
            })
            .unwrap();

        assert_eq!(updated.variables.len(), 2);

        // Sync with only one variable (omit B to delete it)
        let keep = vec![Variable {
            id: updated.variables[0].id.clone(),
            environment_id: env.id.clone(),
            key: "A".to_string(),
            value: "1".to_string(),
            is_secret: false,
            enabled: true,
            sort_order: 0,
            created_at: String::new(),
            updated_at: String::new(),
        }];

        let result = db
            .update_environment(&UpdateEnvironmentInput {
                id: env.id.clone(),
                name: None,
                variables: Some(keep),
            })
            .unwrap();

        assert_eq!(result.variables.len(), 1);
        assert_eq!(result.variables[0].key, "A");
    }

    #[test]
    fn sync_variables_with_secrets() {
        let (db, wid) = setup_test_db();
        let env = db
            .create_environment(&CreateEnvironmentInput {
                workspace_id: wid.clone(),
                name: "Env".to_string(),
            })
            .unwrap();

        let vars = vec![Variable {
            id: "".to_string(),
            environment_id: env.id.clone(),
            key: "SECRET_KEY".to_string(),
            value: "super-secret-value".to_string(),
            is_secret: true,
            enabled: true,
            sort_order: 0,
            created_at: String::new(),
            updated_at: String::new(),
        }];

        let updated = db
            .update_environment(&UpdateEnvironmentInput {
                id: env.id.clone(),
                name: None,
                variables: Some(vars),
            })
            .unwrap();

        // The stored value should be decrypted back to the original
        assert_eq!(updated.variables[0].value, "super-secret-value");
        assert!(updated.variables[0].is_secret);
    }

    #[test]
    fn get_resolved_variables() {
        let (db, wid) = setup_test_db();
        let env = db
            .create_environment(&CreateEnvironmentInput {
                workspace_id: wid.clone(),
                name: "Env".to_string(),
            })
            .unwrap();

        // Add variables: one enabled, one disabled
        let vars = vec![
            Variable {
                id: "".to_string(),
                environment_id: env.id.clone(),
                key: "ENABLED_VAR".to_string(),
                value: "yes".to_string(),
                is_secret: false,
                enabled: true,
                sort_order: 0,
                created_at: String::new(),
                updated_at: String::new(),
            },
            Variable {
                id: "".to_string(),
                environment_id: env.id.clone(),
                key: "DISABLED_VAR".to_string(),
                value: "no".to_string(),
                is_secret: false,
                enabled: false,
                sort_order: 1,
                created_at: String::new(),
                updated_at: String::new(),
            },
        ];

        db.update_environment(&UpdateEnvironmentInput {
            id: env.id.clone(),
            name: None,
            variables: Some(vars),
        })
        .unwrap();

        // Activate the environment
        db.set_active_environment(&env.id, &wid).unwrap();

        let resolved = db.get_resolved_variables(&wid).unwrap();
        assert_eq!(resolved.len(), 1);
        assert_eq!(resolved[0].0, "ENABLED_VAR");
        assert_eq!(resolved[0].1, "yes");
    }
}
