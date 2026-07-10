#[cfg(feature = "native")]
pub fn count_tokens(text: &str) -> crate::Result<usize> {
    use tiktoken_rs::cl100k_base;
    let bpe = cl100k_base().map_err(|e| crate::CoreError::Message(e.to_string()))?;
    let tokens = bpe.encode_with_special_tokens(text);
    Ok(tokens.len())
}

#[cfg(not(feature = "native"))]
pub fn count_tokens(text: &str) -> crate::Result<usize> {
    // Rough GPT-style estimate for WASM (~4 chars per token)
    Ok((text.len() as f64 / 4.0).ceil() as usize)
}

pub fn count_chars(text: &str) -> usize {
    text.chars().count()
}
