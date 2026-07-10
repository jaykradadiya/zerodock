use async_trait::async_trait;
use crate::{PlatformError, Result};

#[cfg_attr(target_arch = "wasm32", async_trait(?Send))]
#[cfg_attr(not(target_arch = "wasm32"), async_trait)]
pub trait Storage: Send + Sync {
    async fn get(&self, key: &str) -> Result<Option<String>>;
    async fn set(&self, key: &str, value: &str) -> Result<()>;
    async fn remove(&self, key: &str) -> Result<()>;
}

pub fn tool_state_key(tool_id: &str) -> String {
    format!("zerodock-tool-{tool_id}")
}

pub const PREFERENCES_KEY: &str = "zerodock-preferences";
pub const JSON_TABS_KEY: &str = "zd_json_tabs";
pub const ACTIVE_TAB_KEY: &str = "zd_active_tab_id";

#[cfg(all(feature = "web", target_arch = "wasm32"))]
pub mod web_impl {
    use super::*;
    use gloo_storage::{LocalStorage, Storage as GlooStorage};

    pub struct WebStorage;

    impl WebStorage {
        pub fn new() -> Self {
            Self
        }
    }

    #[cfg_attr(target_arch = "wasm32", async_trait(?Send))]
    #[cfg_attr(not(target_arch = "wasm32"), async_trait)]
    impl Storage for WebStorage {
        async fn get(&self, key: &str) -> Result<Option<String>> {
            Ok(LocalStorage::get(key).ok())
        }

        async fn set(&self, key: &str, value: &str) -> Result<()> {
            LocalStorage::set(key, value)
                .map_err(|e| PlatformError::Message(format!("Storage error: {e:?}")))
        }

        async fn remove(&self, key: &str) -> Result<()> {
            LocalStorage::delete(key);
            Ok(())
        }
    }
}

#[cfg(all(feature = "web", target_arch = "wasm32"))]
pub use web_impl::WebStorage;

#[cfg(all(feature = "desktop", not(target_arch = "wasm32")))]
pub mod desktop_impl {
    use super::*;
    use directories::ProjectDirs;
    use r2d2_sqlite::SqliteConnectionManager;
    use rusqlite::{params, Connection};
    use std::path::PathBuf;
    use std::sync::Mutex;

    pub struct DesktopStorage {
        pool: r2d2::Pool<SqliteConnectionManager>,
        data_dir: PathBuf,
    }

    impl DesktopStorage {
        pub fn open() -> anyhow::Result<Self> {
            let dirs = ProjectDirs::from("com", "zerodock", "ZeroDock")
                .ok_or_else(|| anyhow::anyhow!("Could not resolve data dir"))?;
            let data_dir = dirs.data_dir().to_path_buf();
            std::fs::create_dir_all(&data_dir)?;
            let db_path = data_dir.join("zerodock.db");
            let manager = SqliteConnectionManager::file(&db_path);
            let pool = r2d2::Pool::new(manager)?;
            {
                let conn = pool.get()?;
                init_schema(&conn)?;
            }
            Ok(Self { pool, data_dir })
        }

        pub fn data_dir(&self) -> &PathBuf {
            &self.data_dir
        }
    }

    fn init_schema(conn: &Connection) -> rusqlite::Result<()> {
        conn.execute_batch(
            r#"
            CREATE TABLE IF NOT EXISTS kv_store (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS json_tabs (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                file_path TEXT,
                byte_size INTEGER NOT NULL DEFAULT 0,
                is_modified INTEGER NOT NULL DEFAULT 0,
                mmap_index_path TEXT
            );
            "#,
        )
    }

    #[async_trait]
    impl Storage for DesktopStorage {
        async fn get(&self, key: &str) -> Result<Option<String>> {
            let pool = self.pool.clone();
            let key = key.to_string();
            tokio::task::spawn_blocking(move || {
                let conn = pool.get().map_err(|e| PlatformError::Message(e.to_string()))?;
                let mut stmt = conn
                    .prepare("SELECT value FROM kv_store WHERE key = ?1")
                    .map_err(|e| PlatformError::Message(e.to_string()))?;
                let mut rows = stmt
                    .query_map(params![key], |row| row.get::<_, String>(0))
                    .map_err(|e| PlatformError::Message(e.to_string()))?;
                match rows.next() {
                    Some(Ok(v)) => Ok(Some(v)),
                    Some(Err(e)) => Err(PlatformError::Message(e.to_string())),
                    None => Ok(None),
                }
            })
            .await
            .map_err(|e| PlatformError::Message(e.to_string()))?
        }

        async fn set(&self, key: &str, value: &str) -> Result<()> {
            let pool = self.pool.clone();
            let key = key.to_string();
            let value = value.to_string();
            tokio::task::spawn_blocking(move || {
                let conn = pool.get().map_err(|e| PlatformError::Message(e.to_string()))?;
                conn.execute(
                    "INSERT INTO kv_store (key, value) VALUES (?1, ?2) ON CONFLICT(key) DO UPDATE SET value = ?2",
                    params![key, value],
                )
                .map_err(|e| PlatformError::Message(e.to_string()))?;
                Ok(())
            })
            .await
            .map_err(|e| PlatformError::Message(e.to_string()))?
        }

        async fn remove(&self, key: &str) -> Result<()> {
            let pool = self.pool.clone();
            let key = key.to_string();
            tokio::task::spawn_blocking(move || {
                let conn = pool.get().map_err(|e| PlatformError::Message(e.to_string()))?;
                conn.execute("DELETE FROM kv_store WHERE key = ?1", params![key])
                    .map_err(|e| PlatformError::Message(e.to_string()))?;
                Ok(())
            })
            .await
            .map_err(|e| PlatformError::Message(e.to_string()))?
        }
    }
}

#[cfg(all(feature = "desktop", not(target_arch = "wasm32")))]
pub use desktop_impl::DesktopStorage;
