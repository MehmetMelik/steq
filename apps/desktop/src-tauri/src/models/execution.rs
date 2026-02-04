use serde::{Deserialize, Serialize};

use super::request::KeyValue;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecutionTiming {
    pub dns_ms: Option<f64>,
    pub connect_ms: Option<f64>,
    pub tls_ms: Option<f64>,
    pub first_byte_ms: f64,
    pub total_ms: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecutionResult {
    pub status: u16,
    pub status_text: String,
    pub headers: Vec<KeyValue>,
    pub body: String,
    pub size_bytes: u64,
    pub timing: ExecutionTiming,
    pub error: Option<String>,
}
