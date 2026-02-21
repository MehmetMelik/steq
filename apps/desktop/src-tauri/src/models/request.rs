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
    #[serde(rename = "graphql")]
    GraphQL,
}

impl BodyType {
    pub fn as_str(&self) -> &str {
        match self {
            BodyType::None => "none",
            BodyType::Json => "json",
            BodyType::Text => "text",
            BodyType::FormUrlEncoded => "form_url_encoded",
            BodyType::Multipart => "multipart",
            BodyType::GraphQL => "graphql",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "json" => BodyType::Json,
            "text" => BodyType::Text,
            "form_url_encoded" => BodyType::FormUrlEncoded,
            "multipart" => BodyType::Multipart,
            "graphql" => BodyType::GraphQL,
            _ => BodyType::None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AuthType {
    #[serde(rename = "none")]
    None,
    #[serde(rename = "bearer")]
    Bearer,
    #[serde(rename = "basic")]
    Basic,
    #[serde(rename = "api_key")]
    ApiKey,
    #[serde(rename = "oauth2")]
    OAuth2,
    #[serde(rename = "oauth1")]
    OAuth1,
    #[serde(rename = "digest")]
    Digest,
    #[serde(rename = "aws_v4")]
    AwsV4,
}

impl AuthType {
    pub fn as_str(&self) -> &str {
        match self {
            AuthType::None => "none",
            AuthType::Bearer => "bearer",
            AuthType::Basic => "basic",
            AuthType::ApiKey => "api_key",
            AuthType::OAuth2 => "oauth2",
            AuthType::OAuth1 => "oauth1",
            AuthType::Digest => "digest",
            AuthType::AwsV4 => "aws_v4",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "bearer" => AuthType::Bearer,
            "basic" => AuthType::Basic,
            "api_key" => AuthType::ApiKey,
            "oauth2" => AuthType::OAuth2,
            "oauth1" => AuthType::OAuth1,
            "digest" => AuthType::Digest,
            "aws_v4" => AuthType::AwsV4,
            _ => AuthType::None,
        }
    }
}

/// Tagged union for auth configuration. The `type` field determines the variant.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum AuthConfig {
    #[serde(rename = "none")]
    None,
    #[serde(rename = "bearer")]
    Bearer { token: String },
    #[serde(rename = "basic")]
    Basic { username: String, password: String },
    #[serde(rename = "api_key")]
    ApiKey {
        key: String,
        value: String,
        location: String,
    },
    #[serde(rename = "oauth2")]
    OAuth2 {
        grant_type: String,
        access_token: String,
        token_url: String,
        auth_url: String,
        client_id: String,
        client_secret: String,
        scope: String,
        username: String,
        password: String,
        redirect_uri: String,
    },
    #[serde(rename = "oauth1")]
    OAuth1 {
        consumer_key: String,
        consumer_secret: String,
        token: String,
        token_secret: String,
        signature_method: String,
    },
    #[serde(rename = "digest")]
    Digest { username: String, password: String },
    #[serde(rename = "aws_v4")]
    AwsV4 {
        access_key: String,
        secret_key: String,
        region: String,
        service: String,
    },
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
    pub auth_type: AuthType,
    pub auth_config: AuthConfig,
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
    pub auth_type: AuthType,
    pub auth_config: AuthConfig,
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
    pub auth_type: Option<AuthType>,
    pub auth_config: Option<AuthConfig>,
    pub collection_id: Option<String>,
    pub folder_id: Option<String>,
    pub sort_order: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RequestSettings {
    pub timeout_ms: u64,
    pub follow_redirects: bool,
    pub max_redirects: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecuteRequestInput {
    pub method: HttpMethod,
    pub url: String,
    pub headers: Vec<KeyValue>,
    pub query_params: Vec<KeyValue>,
    pub body_type: BodyType,
    pub body_content: Option<String>,
    pub auth_type: AuthType,
    pub auth_config: AuthConfig,
    pub settings: RequestSettings,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn http_method_roundtrip() {
        let methods = vec![
            ("GET", HttpMethod::GET),
            ("POST", HttpMethod::POST),
            ("PUT", HttpMethod::PUT),
            ("PATCH", HttpMethod::PATCH),
            ("DELETE", HttpMethod::DELETE),
            ("HEAD", HttpMethod::HEAD),
            ("OPTIONS", HttpMethod::OPTIONS),
        ];

        for (s, expected_variant) in methods {
            let parsed = HttpMethod::from_str(s).unwrap();
            assert_eq!(parsed.as_str(), expected_variant.as_str());
        }
    }

    #[test]
    fn http_method_from_str_case_insensitive() {
        assert_eq!(HttpMethod::from_str("get").unwrap().as_str(), "GET");
        assert_eq!(HttpMethod::from_str("Post").unwrap().as_str(), "POST");
        assert_eq!(HttpMethod::from_str("dElEtE").unwrap().as_str(), "DELETE");
    }

    #[test]
    fn http_method_from_str_unknown() {
        let result = HttpMethod::from_str("FOOBAR");
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Unknown HTTP method"));
    }

    #[test]
    fn body_type_roundtrip() {
        let types = vec![
            ("none", BodyType::None),
            ("json", BodyType::Json),
            ("text", BodyType::Text),
            ("form_url_encoded", BodyType::FormUrlEncoded),
            ("multipart", BodyType::Multipart),
            ("graphql", BodyType::GraphQL),
        ];

        for (s, variant) in &types {
            assert_eq!(BodyType::from_str(s).as_str(), variant.as_str());
        }

        // Unknown maps to None
        assert_eq!(BodyType::from_str("unknown").as_str(), "none");
        assert_eq!(BodyType::from_str("").as_str(), "none");
    }
}
