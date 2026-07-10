use serde_json::Value;

#[derive(Debug, Clone, PartialEq)]
pub struct JwtParts {
    pub header: String,
    pub payload: String,
    pub signature: String,
    pub header_json: Value,
    pub payload_json: Value,
    pub is_expired: bool,
}

pub fn decode_jwt(token: &str) -> crate::Result<JwtParts> {
    let parts: Vec<&str> = token.trim().split('.').collect();
    if parts.len() != 3 {
        return Err(crate::CoreError::Message(
            "JWT must have exactly 3 parts".into(),
        ));
    }

    use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
    let decode_part = |part: &str| -> crate::Result<String> {
        let padded = match part.len() % 4 {
            2 => format!("{part}=="),
            3 => format!("{part}="),
            _ => part.to_string(),
        };
        let bytes = URL_SAFE_NO_PAD
            .decode(padded.trim_end_matches('='))
            .or_else(|_| URL_SAFE_NO_PAD.decode(&padded))
            .map_err(|e| crate::CoreError::Message(format!("Base64 decode failed: {e}")))?;
        String::from_utf8(bytes)
            .map_err(|e| crate::CoreError::Message(format!("UTF-8 decode failed: {e}")))
    };

    let header_str = decode_part(parts[0])?;
    let payload_str = decode_part(parts[1])?;
    let header_json: Value = serde_json::from_str(&header_str)?;
    let payload_json: Value = serde_json::from_str(&payload_str)?;

    let is_expired = payload_json
        .get("exp")
        .and_then(|v| v.as_i64())
        .map(|exp| {
            let now = chrono::Utc::now().timestamp();
            // RFC 7519: a token MUST NOT be accepted on or after the exp time.
            exp <= now
        })
        .unwrap_or(false);

    Ok(JwtParts {
        header: header_str,
        payload: payload_str,
        signature: parts[2].to_string(),
        header_json,
        payload_json,
        is_expired,
    })
}
