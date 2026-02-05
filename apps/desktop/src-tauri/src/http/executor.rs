use std::time::Instant;

use reqwest::header::{HeaderMap, HeaderName, HeaderValue};
use reqwest::Method;

use crate::models::execution::{ExecutionResult, ExecutionTiming};
use crate::models::request::{BodyType, ExecuteRequestInput, KeyValue};

pub async fn execute(input: &ExecuteRequestInput) -> ExecutionResult {
    let client = match reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .redirect(reqwest::redirect::Policy::limited(10))
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
    use super::urlencoding_encode;

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
}
