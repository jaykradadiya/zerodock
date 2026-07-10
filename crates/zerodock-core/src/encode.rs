use crate::{CoreError, Result};

pub fn encode_url(input: &str) -> String {
    urlencoding::encode(input).into_owned()
}

pub fn decode_url(input: &str) -> Result<String> {
    urlencoding::decode(input)
        .map(|s| s.into_owned())
        .map_err(|e| CoreError::Message(format!("Invalid URL encoding: {e}")))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn roundtrip() {
        let s = "hello world & foo=bar";
        assert_eq!(decode_url(&encode_url(s)).unwrap(), s);
    }
}
