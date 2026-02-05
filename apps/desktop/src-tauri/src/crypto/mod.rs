use aes_gcm::{
    aead::{Aead, KeyInit, OsRng},
    Aes256Gcm, Nonce,
};
use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use rand::RngCore;
use sha2::{Digest, Sha256};

/// Derives a 256-bit key from a seed string using SHA-256.
fn derive_key(seed: &str) -> [u8; 32] {
    let mut hasher = Sha256::new();
    hasher.update(seed.as_bytes());
    hasher.finalize().into()
}

/// Returns a machine-specific seed for key derivation.
/// Uses the hostname + a fixed salt. This is intentionally simple —
/// it ties encryption to the machine without requiring user passwords.
fn get_machine_seed() -> String {
    let hostname = hostname::get()
        .map(|h| h.to_string_lossy().to_string())
        .unwrap_or_else(|_| "steq-default".to_string());
    format!("steq-secret-key-{}", hostname)
}

/// Encrypts a plaintext string. Returns a base64-encoded string
/// containing the 12-byte nonce prepended to the ciphertext.
pub fn encrypt(plaintext: &str) -> Result<String, String> {
    let key_bytes = derive_key(&get_machine_seed());
    let cipher = Aes256Gcm::new_from_slice(&key_bytes)
        .map_err(|e| format!("Failed to create cipher: {}", e))?;

    let mut nonce_bytes = [0u8; 12];
    OsRng.fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);

    let ciphertext = cipher
        .encrypt(nonce, plaintext.as_bytes())
        .map_err(|e| format!("Encryption failed: {}", e))?;

    // Prepend nonce to ciphertext, then base64 encode
    let mut combined = Vec::with_capacity(12 + ciphertext.len());
    combined.extend_from_slice(&nonce_bytes);
    combined.extend_from_slice(&ciphertext);

    Ok(BASE64.encode(&combined))
}

/// Decrypts a base64-encoded string (nonce + ciphertext) back to plaintext.
pub fn decrypt(encrypted: &str) -> Result<String, String> {
    let key_bytes = derive_key(&get_machine_seed());
    let cipher = Aes256Gcm::new_from_slice(&key_bytes)
        .map_err(|e| format!("Failed to create cipher: {}", e))?;

    let combined = BASE64
        .decode(encrypted)
        .map_err(|e| format!("Failed to decode base64: {}", e))?;

    if combined.len() < 12 {
        return Err("Encrypted data too short".to_string());
    }

    let (nonce_bytes, ciphertext) = combined.split_at(12);
    let nonce = Nonce::from_slice(nonce_bytes);

    let plaintext = cipher
        .decrypt(nonce, ciphertext)
        .map_err(|e| format!("Decryption failed: {}", e))?;

    String::from_utf8(plaintext).map_err(|e| format!("Invalid UTF-8 in decrypted data: {}", e))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_encrypt_decrypt_roundtrip() {
        let plaintext = "my-secret-api-key-12345";
        let encrypted = encrypt(plaintext).expect("Encryption should succeed");
        assert_ne!(encrypted, plaintext);
        let decrypted = decrypt(&encrypted).expect("Decryption should succeed");
        assert_eq!(decrypted, plaintext);
    }

    #[test]
    fn test_encrypt_produces_different_ciphertexts() {
        let plaintext = "same-value";
        let a = encrypt(plaintext).unwrap();
        let b = encrypt(plaintext).unwrap();
        // Different nonces should produce different ciphertexts
        assert_ne!(a, b);
        // Both should decrypt to the same value
        assert_eq!(decrypt(&a).unwrap(), plaintext);
        assert_eq!(decrypt(&b).unwrap(), plaintext);
    }

    #[test]
    fn test_decrypt_invalid_data() {
        assert!(decrypt("not-valid-base64!!!").is_err());
        // Valid base64 but too short for nonce
        assert!(decrypt("AQID").is_err());
    }

    #[test]
    fn test_encrypt_empty_string() {
        let encrypted = encrypt("").expect("Encrypting empty string should work");
        let decrypted = decrypt(&encrypted).expect("Decrypting should work");
        assert_eq!(decrypted, "");
    }
}
