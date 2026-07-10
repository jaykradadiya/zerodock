use crate::{CoreError, Result};

pub fn encode_base64(input: &str) -> String {
    use base64::{engine::general_purpose::STANDARD, Engine};
    STANDARD.encode(input.as_bytes())
}

pub fn decode_base64(input: &str) -> Result<String> {
    use base64::{engine::general_purpose::STANDARD, Engine};
    let bytes = STANDARD
        .decode(input.trim())
        .map_err(|e| CoreError::Message(format!("Invalid Base64: {e}")))?;
    String::from_utf8(bytes).map_err(|e| CoreError::Message(format!("Invalid UTF-8: {e}")))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn roundtrip() {
        assert_eq!(decode_base64(&encode_base64("hello")).unwrap(), "hello");
    }
}
