//! Large-file loading paths for the JSON tools' virtualized editor.
//!
//! Desktop and web have fundamentally different "open a file" primitives
//! (a filesystem path vs. an opaque browser `File` handle), so this module
//! provides two independent loaders rather than forcing both through the
//! `zerodock_platform::FileService` trait (which is path-based and doesn't
//! fit the browser's `File` object model at all).

use ropey::Rope;

/// Desktop: mmap the file and build a Rope from it off the render thread.
/// Avoids the extra full-buffer copy a plain `std::fs::read_to_string` would
/// perform — the mmap is only the *load* source; `Rope::from_reader` copies
/// bytes into its own tree, so there's no live write-through / unsafe-mutation
/// risk to the mapped file.
#[cfg(all(feature = "desktop", not(target_arch = "wasm32")))]
pub async fn load_rope_desktop(
    max_bytes: usize,
    path: std::path::PathBuf,
) -> anyhow::Result<(String, Rope)> {
    tokio::task::spawn_blocking(move || {
        let file = std::fs::File::open(&path)?;
        let meta = file.metadata()?;
        if (meta.len() as usize) > max_bytes {
            anyhow::bail!(
                "File is {} bytes which exceeds the {} byte limit",
                meta.len(),
                max_bytes
            );
        }
        let mmap = unsafe { memmap2::Mmap::map(&file)? };
        let rope = Rope::from_reader(std::io::Cursor::new(&mmap[..]))?;
        let name = path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("file")
            .to_string();
        Ok((name, rope))
    })
    .await?
}

/// Web: stream a `web_sys::File` into a Rope in chunks, decoding with a
/// streaming `TextDecoder` so multi-byte UTF-8 sequences split across chunk
/// boundaries are handled correctly, and yielding to the event loop between
/// chunks so a large drop/selection doesn't jank the tab.
#[cfg(target_arch = "wasm32")]
pub mod web {
    use super::Rope;
    use web_sys::File;

    const CHUNK_BYTES: f64 = 8.0 * 1024.0 * 1024.0;

    /// Streams `file` into a `Rope`, yielding to the browser event loop
    /// between chunks. `on_progress` receives `(bytes_loaded, total_bytes)`.
    ///
    /// Uses `Blob.arrayBuffer()` (a standard Promise-returning Web API,
    /// bridged via `wasm_bindgen_futures::JsFuture`) rather than the
    /// event-based `FileReader` API, to avoid hand-rolled callback/channel
    /// plumbing for a one-shot async read. UTF-8 boundary safety across chunk
    /// splits is handled manually (`utf8_valid_prefix_len`) rather than via
    /// `TextDecoder`'s streaming mode, since only the file is assumed to be
    /// UTF-8 text (the case for JSON) and this keeps the byte-boundary logic
    /// directly inspectable/testable in Rust.
    pub async fn load_rope_streaming(
        file: File,
        max_bytes: usize,
        mut on_progress: impl FnMut(usize, usize),
    ) -> Result<Rope, String> {
        let total = file.size() as usize;
        if total > max_bytes {
            return Err(format!(
                "File is {total} bytes which exceeds the {max_bytes} byte limit"
            ));
        }

        let mut rope = Rope::new();
        let mut offset = 0.0f64;
        let total_f = total as f64;
        let mut pending_tail: Vec<u8> = Vec::new();

        while offset < total_f || total_f == 0.0 {
            let end = (offset + CHUNK_BYTES).min(total_f);
            let blob = file
                .slice_with_f64_and_f64(offset, end)
                .map_err(|e| format!("{e:?}"))?;

            let array_buffer_promise = blob.array_buffer();
            let array_buffer = wasm_bindgen_futures::JsFuture::from(array_buffer_promise)
                .await
                .map_err(|e| format!("{e:?}"))?;
            let array = js_sys::Uint8Array::new(&array_buffer);
            let mut bytes = vec![0u8; array.length() as usize];
            array.copy_to(&mut bytes);

            // Prepend any incomplete multi-byte sequence carried over from the
            // previous chunk, then decode only up to the last valid UTF-8
            // boundary — the remaining (possibly incomplete) tail bytes are
            // carried into the next iteration instead of decoded now.
            let mut combined = std::mem::take(&mut pending_tail);
            combined.extend_from_slice(&bytes);

            let is_last = end >= total_f;
            let valid_upto = if is_last {
                combined.len()
            } else {
                utf8_valid_prefix_len(&combined)
            };
            pending_tail = combined[valid_upto..].to_vec();

            let text = std::str::from_utf8(&combined[..valid_upto])
                .map_err(|e| format!("invalid UTF-8 in file: {e}"))?;
            rope.insert(rope.len_chars(), text);

            offset = end;
            on_progress(offset as usize, total);

            if total_f == 0.0 {
                break;
            }

            // Yield so the tab stays responsive across ~60 chunks for a 500MB file.
            gloo_timers::future::TimeoutFuture::new(0).await;
        }

        if !pending_tail.is_empty() {
            return Err("file ended with an incomplete UTF-8 sequence".to_string());
        }

        Ok(rope)
    }

    /// Returns the length of the longest prefix of `bytes` that is valid
    /// UTF-8, so a chunk boundary landing mid-codepoint doesn't corrupt or
    /// panic on decode — the remainder is carried into the next chunk.
    fn utf8_valid_prefix_len(bytes: &[u8]) -> usize {
        match std::str::from_utf8(bytes) {
            Ok(_) => bytes.len(),
            Err(e) => {
                let valid_upto = e.valid_up_to();
                // If the error has no `error_len` (`None`), the tail is an
                // incomplete-but-possibly-valid sequence awaiting more bytes;
                // if it has a length, those bytes are genuinely invalid, but
                // we still only trust the confirmed-valid prefix here and let
                // the *next* chunk's combined decode raise a real error if
                // it's truly malformed.
                valid_upto
            }
        }
    }
}
