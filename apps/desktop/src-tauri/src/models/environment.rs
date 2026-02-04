use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Variable {
    pub id: String,
    pub environment_id: String,
    pub key: String,
    pub value: String,
    pub is_secret: bool,
    pub enabled: bool,
    pub sort_order: i32,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Environment {
    pub id: String,
    pub workspace_id: String,
    pub name: String,
    pub is_active: bool,
    pub variables: Vec<Variable>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateEnvironmentInput {
    pub workspace_id: String,
    pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateEnvironmentInput {
    pub id: String,
    pub name: Option<String>,
    pub variables: Option<Vec<Variable>>,
}
