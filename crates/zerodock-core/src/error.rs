use thiserror::Error;

#[derive(Debug, Error)]
pub enum CoreError {
    #[error("{0}")]
    Message(String),
    #[error(transparent)]
    Json(#[from] serde_json::Error),
    #[error(transparent)]
    Yaml(#[from] serde_yaml::Error),
    #[error(transparent)]
    Regex(#[from] regex::Error),
    #[cfg(feature = "native")]
    #[error(transparent)]
    Rsa(#[from] rsa::Error),
}

pub type Result<T> = std::result::Result<T, CoreError>;
