use async_trait::async_trait;
use crate::{PlatformError, Result};

#[derive(Debug, Clone)]
pub struct FileContent {
    pub name: String,
    pub content: String,
    pub size: usize,
}

#[cfg_attr(target_arch = "wasm32", async_trait(?Send))]
#[cfg_attr(not(target_arch = "wasm32"), async_trait)]
pub trait FileService: Send + Sync {
    async fn read_text_file(&self, path: &str) -> Result<FileContent>;
    fn max_recommended_bytes(&self) -> usize;
}

#[cfg(all(feature = "web", target_arch = "wasm32"))]
mod web_impl {
    use super::*;

    pub struct WebFileService;

    impl WebFileService {
        pub fn new() -> Self {
            Self
        }
    }

    #[cfg_attr(target_arch = "wasm32", async_trait(?Send))]
    #[cfg_attr(not(target_arch = "wasm32"), async_trait)]
    impl FileService for WebFileService {
        async fn read_text_file(&self, _path: &str) -> Result<FileContent> {
            Err(PlatformError::Message(
                "Use browser file picker on web".into(),
            ))
        }

        fn max_recommended_bytes(&self) -> usize {
            500 * 1024 * 1024
        }
    }
}

#[cfg(all(feature = "web", target_arch = "wasm32"))]
pub use web_impl::WebFileService;

#[cfg(all(feature = "desktop", not(target_arch = "wasm32")))]
mod desktop_impl {
    use super::*;
    use std::path::Path;

    pub struct DesktopFileService {
        max_bytes: usize,
    }

    impl DesktopFileService {
        pub fn new() -> anyhow::Result<Self> {
            Ok(Self {
                max_bytes: 10 * 1024 * 1024 * 1024,
            })
        }
    }

    #[async_trait]
    impl FileService for DesktopFileService {
        async fn read_text_file(&self, path: &str) -> Result<FileContent> {
            let path = path.to_string();
            let max_bytes = self.max_bytes;
            tokio::task::spawn_blocking(move || {
                let meta = std::fs::metadata(&path)
                    .map_err(|e| PlatformError::Message(e.to_string()))?;
                if (meta.len() as usize) > max_bytes {
                    return Err(PlatformError::Message(format!(
                        "File is {} bytes which exceeds the {max_bytes} byte limit",
                        meta.len()
                    )));
                }
                let name = Path::new(&path)
                    .file_name()
                    .and_then(|n| n.to_str())
                    .unwrap_or("file")
                    .to_string();
                let content = std::fs::read_to_string(&path)
                    .map_err(|e| PlatformError::Message(e.to_string()))?;
                Ok(FileContent {
                    size: meta.len() as usize,
                    name,
                    content,
                })
            })
            .await
            .map_err(|e| PlatformError::Message(e.to_string()))?
        }

        fn max_recommended_bytes(&self) -> usize {
            self.max_bytes
        }
    }

    impl DesktopFileService {
        /// Loads a file into a `ropey::Rope` via mmap, avoiding the extra
        /// full-buffer copy `std::fs::read_to_string` performs. The mmap is
        /// only the *load* source — `Rope::from_reader` copies bytes into its
        /// own tree structure, so there's no live write-through to the mapped
        /// file and no unsafe-mutation risk.
        ///
        /// Intended for large-file loads (JSON tools' virtualized editor);
        /// small/typical files can keep using `read_text_file` above.
        pub fn read_rope_mmap(&self, path: &std::path::Path) -> anyhow::Result<(String, ropey::Rope)> {
            let file = std::fs::File::open(path)?;
            let meta = file.metadata()?;
            if (meta.len() as usize) > self.max_bytes {
                anyhow::bail!(
                    "File is {} bytes which exceeds the {} byte limit",
                    meta.len(),
                    self.max_bytes
                );
            }
            let mmap = unsafe { memmap2::Mmap::map(&file)? };
            let rope = ropey::Rope::from_reader(std::io::Cursor::new(&mmap[..]))?;
            let name = path
                .file_name()
                .and_then(|n| n.to_str())
                .unwrap_or("file")
                .to_string();
            Ok((name, rope))
        }
    }
}

#[cfg(all(feature = "desktop", not(target_arch = "wasm32")))]
pub use desktop_impl::DesktopFileService;
