use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum HttpMethod {
    GET,
    POST,
    PUT,
    PATCH,
    DELETE,
    HEAD,
    OPTIONS,
}

impl HttpMethod {
    pub fn as_str(&self) -> &str {
        match self {
            HttpMethod::GET => "GET",
            HttpMethod::POST => "POST",
            HttpMethod::PUT => "PUT",
            HttpMethod::PATCH => "PATCH",
            HttpMethod::DELETE => "DELETE",
            HttpMethod::HEAD => "HEAD",
            HttpMethod::OPTIONS => "OPTIONS",
        }
    }

    pub fn from_str(s: &str) -> Result<Self, String> {
        match s.to_uppercase().as_str() {
            "GET" => Ok(HttpMethod::GET),
            "POST" => Ok(HttpMethod::POST),
            "PUT" => Ok(HttpMethod::PUT),
            "PATCH" => Ok(HttpMethod::PATCH),
            "DELETE" => Ok(HttpMethod::DELETE),
            "HEAD" => Ok(HttpMethod::HEAD),
            "OPTIONS" => Ok(HttpMethod::OPTIONS),
            other => Err(format!("Unknown HTTP method: {}", other)),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KeyValue {
    pub key: String,
    pub value: String,
    pub enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum BodyType {
    #[serde(rename = "none")]
    None,
    #[serde(rename = "json")]
    Json,
    #[serde(rename = "text")]
    Text,
    #[serde(rename = "form_url_encoded")]
    FormUrlEncoded,
    #[serde(rename = "multipart")]
    Multipart,
}

impl BodyType {
    pub fn as_str(&self) -> &str {
        match self {
            BodyType::None => "none",
            BodyType::Json => "json",
            BodyType::Text => "text",
            BodyType::FormUrlEncoded => "form_url_encoded",
            BodyType::Multipart => "multipart",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "json" => BodyType::Json,
            "text" => BodyType::Text,
            "form_url_encoded" => BodyType::FormUrlEncoded,
            "multipart" => BodyType::Multipart,
            _ => BodyType::None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiRequest {
    pub id: String,
    pub name: String,
    pub method: HttpMethod,
    pub url: String,
    pub headers: Vec<KeyValue>,
    pub query_params: Vec<KeyValue>,
    pub body_type: BodyType,
    pub body_content: Option<String>,
    pub collection_id: Option<String>,
    pub folder_id: Option<String>,
    pub sort_order: i32,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateRequestInput {
    pub name: String,
    pub method: HttpMethod,
    pub url: String,
    pub headers: Vec<KeyValue>,
    pub query_params: Vec<KeyValue>,
    pub body_type: BodyType,
    pub body_content: Option<String>,
    pub collection_id: Option<String>,
    pub folder_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateRequestInput {
    pub id: String,
    pub name: Option<String>,
    pub method: Option<HttpMethod>,
    pub url: Option<String>,
    pub headers: Option<Vec<KeyValue>>,
    pub query_params: Option<Vec<KeyValue>>,
    pub body_type: Option<BodyType>,
    pub body_content: Option<String>,
    pub collection_id: Option<String>,
    pub folder_id: Option<String>,
    pub sort_order: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecuteRequestInput {
    pub method: HttpMethod,
    pub url: String,
    pub headers: Vec<KeyValue>,
    pub query_params: Vec<KeyValue>,
    pub body_type: BodyType,
    pub body_content: Option<String>,
}
