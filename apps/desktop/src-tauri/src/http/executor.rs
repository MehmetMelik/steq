use std::time::Instant;

use reqwest::header::{HeaderMap, HeaderName, HeaderValue};
use reqwest::Method;
use serde::{Deserialize, Serialize};

use base64::Engine;
use crate::models::execution::{ExecutionResult, ExecutionTiming};
use crate::models::request::{AuthConfig, BodyType, ExecuteRequestInput, KeyValue};

#[derive(Debug, Deserialize)]
struct GraphQLInput {
    query: String,
    #[serde(default)]
    variables: String,
    #[serde(default, rename = "operationName")]
    operation_name: String,
}

#[derive(Debug, Serialize)]
struct GraphQLBody {
    query: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    variables: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none", rename = "operationName")]
    operation_name: Option<String>,
}

fn build_graphql_body(content: &str) -> String {
    let input: GraphQLInput = match serde_json::from_str(content) {
        Ok(i) => i,
        Err(_) => return content.to_string(),
    };

    let variables: Option<serde_json::Value> = if input.variables.trim().is_empty() {
        None
    } else {
        serde_json::from_str(&input.variables).ok()
    };

    let operation_name = if input.operation_name.trim().is_empty() {
        None
    } else {
        Some(input.operation_name)
    };

    let body = GraphQLBody {
        query: input.query,
        variables,
        operation_name,
    };

    serde_json::to_string(&body).unwrap_or_else(|_| content.to_string())
}

pub async fn execute(input: &ExecuteRequestInput) -> ExecutionResult {
    let redirect_policy = if input.settings.follow_redirects {
        reqwest::redirect::Policy::limited(input.settings.max_redirects)
    } else {
        reqwest::redirect::Policy::none()
    };

    let client = match reqwest::Client::builder()
        .timeout(std::time::Duration::from_millis(input.settings.timeout_ms))
        .redirect(redirect_policy)
        .build()
    {
        Ok(c) => c,
        Err(e) => {
            return ExecutionResult {
                status: 0,
                status_text: String::new(),
                headers: vec![],
                body: String::new(),
                size_bytes: 0,
                timing: ExecutionTiming {
                    dns_ms: None,
                    connect_ms: None,
                    tls_ms: None,
                    first_byte_ms: 0.0,
                    total_ms: 0.0,
                },
                error: Some(format!("Failed to create HTTP client: {}", e)),
            };
        }
    };

    let method = match input.method.as_str() {
        "GET" => Method::GET,
        "POST" => Method::POST,
        "PUT" => Method::PUT,
        "PATCH" => Method::PATCH,
        "DELETE" => Method::DELETE,
        "HEAD" => Method::HEAD,
        "OPTIONS" => Method::OPTIONS,
        _ => Method::GET,
    };

    // Build URL with query params
    let mut url = input.url.clone();
    let enabled_params: Vec<&KeyValue> = input.query_params.iter().filter(|kv| kv.enabled).collect();
    if !enabled_params.is_empty() {
        let query_string: Vec<String> = enabled_params
            .iter()
            .map(|kv| {
                format!(
                    "{}={}",
                    urlencoding_encode(&kv.key),
                    urlencoding_encode(&kv.value)
                )
            })
            .collect();
        let separator = if url.contains('?') { "&" } else { "?" };
        url = format!("{}{}{}", url, separator, query_string.join("&"));
    }

    // Build headers
    let mut header_map = HeaderMap::new();
    for kv in &input.headers {
        if !kv.enabled {
            continue;
        }
        if let (Ok(name), Ok(value)) = (
            HeaderName::from_bytes(kv.key.as_bytes()),
            HeaderValue::from_str(&kv.value),
        ) {
            header_map.insert(name, value);
        }
    }

    // Apply auth
    apply_auth(&input.auth_config, &mut header_map, &mut url);

    let mut request_builder = client.request(method, &url).headers(header_map);

    // Add body
    match &input.body_type {
        BodyType::Json => {
            if let Some(ref content) = input.body_content {
                request_builder = request_builder
                    .header("Content-Type", "application/json")
                    .body(content.clone());
            }
        }
        BodyType::Text => {
            if let Some(ref content) = input.body_content {
                request_builder = request_builder
                    .header("Content-Type", "text/plain")
                    .body(content.clone());
            }
        }
        BodyType::FormUrlEncoded => {
            if let Some(ref content) = input.body_content {
                request_builder = request_builder
                    .header("Content-Type", "application/x-www-form-urlencoded")
                    .body(content.clone());
            }
        }
        BodyType::GraphQL => {
            if let Some(ref content) = input.body_content {
                let graphql_body = build_graphql_body(content);
                request_builder = request_builder
                    .header("Content-Type", "application/json")
                    .body(graphql_body);
            }
        }
        _ => {}
    }

    let start = Instant::now();

    match request_builder.send().await {
        Ok(response) => {
            let first_byte_ms = start.elapsed().as_secs_f64() * 1000.0;
            let status = response.status().as_u16();
            let status_text = response
                .status()
                .canonical_reason()
                .unwrap_or("")
                .to_string();

            let response_headers: Vec<KeyValue> = response
                .headers()
                .iter()
                .map(|(name, value)| KeyValue {
                    key: name.to_string(),
                    value: value.to_str().unwrap_or("").to_string(),
                    enabled: true,
                })
                .collect();

            match response.bytes().await {
                Ok(bytes) => {
                    let total_ms = start.elapsed().as_secs_f64() * 1000.0;
                    let size_bytes = bytes.len() as u64;
                    let body = String::from_utf8_lossy(&bytes).to_string();

                    ExecutionResult {
                        status,
                        status_text,
                        headers: response_headers,
                        body,
                        size_bytes,
                        timing: ExecutionTiming {
                            dns_ms: None,
                            connect_ms: None,
                            tls_ms: None,
                            first_byte_ms,
                            total_ms,
                        },
                        error: None,
                    }
                }
                Err(e) => {
                    let total_ms = start.elapsed().as_secs_f64() * 1000.0;
                    ExecutionResult {
                        status,
                        status_text,
                        headers: response_headers,
                        body: String::new(),
                        size_bytes: 0,
                        timing: ExecutionTiming {
                            dns_ms: None,
                            connect_ms: None,
                            tls_ms: None,
                            first_byte_ms,
                            total_ms,
                        },
                        error: Some(format!("Failed to read response body: {}", e)),
                    }
                }
            }
        }
        Err(e) => {
            let total_ms = start.elapsed().as_secs_f64() * 1000.0;
            let error_msg = if e.is_timeout() {
                "Request timed out".to_string()
            } else if e.is_connect() {
                format!("Connection failed: {}", e)
            } else {
                format!("Request failed: {}", e)
            };

            ExecutionResult {
                status: 0,
                status_text: String::new(),
                headers: vec![],
                body: String::new(),
                size_bytes: 0,
                timing: ExecutionTiming {
                    dns_ms: None,
                    connect_ms: None,
                    tls_ms: None,
                    first_byte_ms: 0.0,
                    total_ms,
                },
                error: Some(error_msg),
            }
        }
    }
}

fn apply_auth(auth_config: &AuthConfig, headers: &mut HeaderMap, url: &mut String) {
    match auth_config {
        AuthConfig::None => {}
        AuthConfig::Bearer { token } => {
            if let Ok(val) = HeaderValue::from_str(&format!("Bearer {}", token)) {
                headers.insert(HeaderName::from_static("authorization"), val);
            }
        }
        AuthConfig::Basic { username, password } => {
            let credentials = base64::engine::general_purpose::STANDARD
                .encode(format!("{}:{}", username, password));
            if let Ok(val) = HeaderValue::from_str(&format!("Basic {}", credentials)) {
                headers.insert(HeaderName::from_static("authorization"), val);
            }
        }
        AuthConfig::ApiKey { key, value, location } => {
            match location.as_str() {
                "query" => {
                    let separator = if url.contains('?') { "&" } else { "?" };
                    url.push_str(&format!(
                        "{}{}={}",
                        separator,
                        urlencoding_encode(key),
                        urlencoding_encode(value)
                    ));
                }
                _ => {
                    // Default to header
                    if let (Ok(name), Ok(val)) = (
                        HeaderName::from_bytes(key.as_bytes()),
                        HeaderValue::from_str(value),
                    ) {
                        headers.insert(name, val);
                    }
                }
            }
        }
        AuthConfig::OAuth2 { access_token, .. } => {
            if !access_token.is_empty() {
                if let Ok(val) = HeaderValue::from_str(&format!("Bearer {}", access_token)) {
                    headers.insert(HeaderName::from_static("authorization"), val);
                }
            }
        }
        AuthConfig::OAuth1 {
            consumer_key,
            token,
            ..
        } => {
            // Simplified OAuth 1.0 — inject the OAuth header with available tokens
            // Full signature computation requires request method/URL/params and is complex;
            // for now we set the token so the server can validate
            let oauth_header = format!(
                "OAuth oauth_consumer_key=\"{}\", oauth_token=\"{}\"",
                urlencoding_encode(consumer_key),
                urlencoding_encode(token)
            );
            if let Ok(val) = HeaderValue::from_str(&oauth_header) {
                headers.insert(HeaderName::from_static("authorization"), val);
            }
        }
        AuthConfig::Digest { username, password } => {
            // Digest auth requires a challenge-response flow. For now, we set
            // Basic as a fallback — proper digest will be implemented with a
            // two-step request flow in a future iteration
            let credentials = base64::engine::general_purpose::STANDARD
                .encode(format!("{}:{}", username, password));
            if let Ok(val) = HeaderValue::from_str(&format!("Basic {}", credentials)) {
                headers.insert(HeaderName::from_static("authorization"), val);
            }
        }
        AuthConfig::AwsV4 { access_key, .. } => {
            // AWS Signature v4 requires signing the entire request (method, URL, headers, body).
            // Full implementation will use the aws-sigv4 crate in a future iteration.
            // For now, set the access key as a custom header for visibility
            if let Ok(val) = HeaderValue::from_str(access_key) {
                headers.insert(
                    HeaderName::from_static("x-steq-aws-access-key"),
                    val,
                );
            }
        }
    }
}

fn urlencoding_encode(s: &str) -> String {
    let mut result = String::new();
    for byte in s.bytes() {
        match byte {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                result.push(byte as char);
            }
            _ => {
                result.push_str(&format!("%{:02X}", byte));
            }
        }
    }
    result
}

#[cfg(test)]
mod tests {
    use super::{build_graphql_body, urlencoding_encode};

    #[test]
    fn encode_no_special_chars() {
        assert_eq!(urlencoding_encode("hello"), "hello");
        assert_eq!(urlencoding_encode("ABCxyz0123456789"), "ABCxyz0123456789");
        assert_eq!(urlencoding_encode("a-b_c.d~e"), "a-b_c.d~e");
    }

    #[test]
    fn encode_spaces() {
        assert_eq!(urlencoding_encode("hello world"), "hello%20world");
        assert_eq!(urlencoding_encode(" "), "%20");
    }

    #[test]
    fn encode_special_chars() {
        assert_eq!(urlencoding_encode("a&b=c"), "a%26b%3Dc");
        assert_eq!(urlencoding_encode("foo@bar"), "foo%40bar");
        assert_eq!(urlencoding_encode("100%"), "100%25");
        assert_eq!(urlencoding_encode("a+b"), "a%2Bb");
    }

    #[test]
    fn encode_unicode() {
        // "café" => "caf%C3%A9" (UTF-8 bytes for é are 0xC3, 0xA9)
        assert_eq!(urlencoding_encode("café"), "caf%C3%A9");
        // "日本" => multi-byte UTF-8
        let encoded = urlencoding_encode("日本");
        assert!(encoded.contains("%"));
        assert!(!encoded.contains("日"));
    }

    #[test]
    fn build_graphql_body_basic() {
        let input = r#"{"query":"query { users { id } }","variables":"","operationName":""}"#;
        let result = build_graphql_body(input);
        let parsed: serde_json::Value = serde_json::from_str(&result).unwrap();
        assert_eq!(parsed["query"], "query { users { id } }");
        assert!(parsed.get("variables").is_none());
        assert!(parsed.get("operationName").is_none());
    }

    #[test]
    fn build_graphql_body_with_variables() {
        let input = r#"{"query":"query GetUser($id: ID!) { user(id: $id) { name } }","variables":"{\"id\":\"123\"}","operationName":"GetUser"}"#;
        let result = build_graphql_body(input);
        let parsed: serde_json::Value = serde_json::from_str(&result).unwrap();
        assert_eq!(parsed["query"], "query GetUser($id: ID!) { user(id: $id) { name } }");
        assert_eq!(parsed["variables"]["id"], "123");
        assert_eq!(parsed["operationName"], "GetUser");
    }

    #[test]
    fn build_graphql_body_invalid_json_passthrough() {
        let input = "not valid json";
        let result = build_graphql_body(input);
        assert_eq!(result, "not valid json");
    }
}
