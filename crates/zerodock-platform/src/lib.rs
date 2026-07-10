pub mod error;
pub mod file;
pub mod http;
pub mod storage;

pub use error::*;
pub use file::*;
pub use http::*;
pub use storage::*;

use std::sync::Arc;

/// Platform services bundle injected into Dioxus context.
#[derive(Clone)]
pub struct PlatformServices {
    pub storage: Arc<dyn Storage>,
    pub http: Arc<dyn HttpClient>,
    pub files: Arc<dyn FileService>,
    pub is_desktop: bool,
}

impl PlatformServices {
    pub fn new(storage: Arc<dyn Storage>, http: Arc<dyn HttpClient>, files: Arc<dyn FileService>, is_desktop: bool) -> Self {
        Self { storage, http, files, is_desktop }
    }

    #[cfg(all(feature = "web", target_arch = "wasm32"))]
    pub fn web() -> Self {
        Self {
            storage: Arc::new(storage::WebStorage::new()),
            http: Arc::new(http::WebHttpClient::new()),
            files: Arc::new(file::WebFileService::new()),
            is_desktop: false,
        }
    }

    #[cfg(all(feature = "desktop", not(target_arch = "wasm32")))]
    pub fn desktop() -> anyhow::Result<Self> {
        Ok(Self {
            storage: Arc::new(storage::DesktopStorage::open()?),
            http: Arc::new(http::DesktopHttpClient::new()?),
            files: Arc::new(file::DesktopFileService::new()?),
            is_desktop: true,
        })
    }
}
