//! Core unit tests for zerodock-core

#[cfg(test)]
mod tests {
    use zerodock_core::*;

    #[test]
    fn url_roundtrip() {
        let s = "hello world & foo=bar";
        assert_eq!(decode_url(&encode_url(s)).unwrap(), s);
    }

    #[test]
    fn base64_roundtrip() {
        assert_eq!(decode_base64(&encode_base64("hello")).unwrap(), "hello");
    }

    #[test]
    fn jwt_decode() {
        let token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
        let parts = decode_jwt(token).unwrap();
        assert_eq!(parts.payload_json["sub"], "1234567890");
    }

    #[test]
    fn regex_matches() {
        let matches = test_regex(r"\d+", "order 123", "g").unwrap();
        assert_eq!(matches.len(), 1);
        assert_eq!(matches[0].full_match, "123");
    }

    #[test]
    fn diff_detects_change() {
        let lines = diff_lines("a\nb", "a\nc");
        assert!(lines.iter().any(|l| l.kind == DiffLineKind::Delete));
        assert!(lines.iter().any(|l| l.kind == DiffLineKind::Insert));
    }
}
