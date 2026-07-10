use hmac::{Hmac, Mac};
use md5::Md5;
use sha1::Sha1;
use sha2::{Digest, Sha256, Sha384, Sha512};

type HmacSha256 = Hmac<Sha256>;

pub fn sha1_hex(input: &str) -> String {
    let mut hasher = Sha1::new();
    hasher.update(input.as_bytes());
    hex::encode(hasher.finalize())
}

pub fn sha256_hex(input: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(input.as_bytes());
    hex::encode(hasher.finalize())
}

pub fn sha384_hex(input: &str) -> String {
    let mut hasher = Sha384::new();
    hasher.update(input.as_bytes());
    hex::encode(hasher.finalize())
}

pub fn sha512_hex(input: &str) -> String {
    let mut hasher = Sha512::new();
    hasher.update(input.as_bytes());
    hex::encode(hasher.finalize())
}

pub fn md5_hex(input: &str) -> String {
    let mut hasher = Md5::new();
    hasher.update(input.as_bytes());
    hex::encode(hasher.finalize())
}

pub fn hmac_sha256_hex(input: &str, secret: &str) -> Option<String> {
    let mut mac = HmacSha256::new_from_slice(secret.as_bytes()).ok()?;
    mac.update(input.as_bytes());
    Some(hex::encode(mac.finalize().into_bytes()))
}

pub fn all_hashes(input: &str) -> Vec<(&'static str, String)> {
    vec![
        ("SHA-1", sha1_hex(input)),
        ("SHA-256", sha256_hex(input)),
        ("SHA-384", sha384_hex(input)),
        ("SHA-512", sha512_hex(input)),
        ("MD5", md5_hex(input)),
    ]
}
