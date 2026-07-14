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

pub fn verify_jwt_signature(token: &str, secret_or_pubkey: &str) -> crate::Result<bool> {
    let parts: Vec<&str> = token.trim().split('.').collect();
    if parts.len() != 3 {
        return Err(crate::CoreError::Message(
            "JWT must have exactly 3 parts".into(),
        ));
    }

    use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
    let sig_bytes = URL_SAFE_NO_PAD
        .decode(parts[2].trim_end_matches('='))
        .or_else(|_| URL_SAFE_NO_PAD.decode(parts[2]))
        .map_err(|e| crate::CoreError::Message(format!("Base64 decode of signature failed: {e}")))?;

    let padded_header = match parts[0].len() % 4 {
        2 => format!("{}==", parts[0]),
        3 => format!("{}=", parts[0]),
        _ => parts[0].to_string(),
    };
    let header_bytes = URL_SAFE_NO_PAD
        .decode(padded_header.trim_end_matches('='))
        .or_else(|_| URL_SAFE_NO_PAD.decode(&padded_header))
        .map_err(|e| crate::CoreError::Message(format!("Base64 decode of header failed: {e}")))?;
    let header_str = String::from_utf8(header_bytes)
        .map_err(|e| crate::CoreError::Message(format!("UTF-8 decode of header failed: {e}")))?;
    let header_json: Value = serde_json::from_str(&header_str)?;

    let alg = header_json
        .get("alg")
        .and_then(|v| v.as_str())
        .unwrap_or("none");

    let msg = format!("{}.{}", parts[0], parts[1]);

    if alg == "HS256" {
        use hmac::{Hmac, Mac};
        use sha2::Sha256;
        type HmacSha256 = Hmac<Sha256>;
        let mut mac = HmacSha256::new_from_slice(secret_or_pubkey.as_bytes())
            .map_err(|e| crate::CoreError::Message(format!("HMAC init error: {e}")))?;
        mac.update(msg.as_bytes());
        return Ok(mac.verify_slice(&sig_bytes).is_ok());
    } else if alg == "HS384" {
        use hmac::{Hmac, Mac};
        use sha2::Sha384;
        type HmacSha384 = Hmac<Sha384>;
        let mut mac = HmacSha384::new_from_slice(secret_or_pubkey.as_bytes())
            .map_err(|e| crate::CoreError::Message(format!("HMAC init error: {e}")))?;
        mac.update(msg.as_bytes());
        return Ok(mac.verify_slice(&sig_bytes).is_ok());
    } else if alg == "HS512" {
        use hmac::{Hmac, Mac};
        use sha2::Sha512;
        type HmacSha512 = Hmac<Sha512>;
        let mut mac = HmacSha512::new_from_slice(secret_or_pubkey.as_bytes())
            .map_err(|e| crate::CoreError::Message(format!("HMAC init error: {e}")))?;
        mac.update(msg.as_bytes());
        return Ok(mac.verify_slice(&sig_bytes).is_ok());
    } else if alg == "RS256" {
        #[cfg(feature = "native")]
        {
            use rsa::pkcs8::DecodePublicKey;
            use rsa::RsaPublicKey;
            use sha2::{Sha256, Digest};
            
            let pub_key = RsaPublicKey::from_public_key_pem(secret_or_pubkey)
                .map_err(|e| crate::CoreError::Message(format!("Invalid RS256 public key PEM: {e}")))?;
            let mut hasher = Sha256::new();
            hasher.update(msg.as_bytes());
            let hashed = hasher.finalize();
            return Ok(pub_key.verify(rsa::pkcs1v15::Pkcs1v15Sign::new::<Sha256>(), &hashed, &sig_bytes).is_ok());
        }
        #[cfg(not(feature = "native"))]
        {
            return Err(crate::CoreError::Message("RS256 verification requires desktop/native environment".into()));
        }
    }

    Err(crate::CoreError::Message(format!("Unsupported algorithm for verification: {alg}")))
}
