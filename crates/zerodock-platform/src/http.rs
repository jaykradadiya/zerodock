use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use crate::{PlatformError, Result};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HttpRequest {
    pub method: String,
    pub url: String,
    pub headers: Vec<(String, String)>,
    pub body: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HttpResponse {
    pub status: u16,
    pub status_text: String,
    pub headers: Vec<(String, String)>,
    pub body: String,
    pub duration_ms: u64,
}

#[cfg_attr(target_arch = "wasm32", async_trait(?Send))]
#[cfg_attr(not(target_arch = "wasm32"), async_trait)]
pub trait HttpClient: Send + Sync {
    async fn send(&self, request: HttpRequest) -> Result<HttpResponse>;
    fn cors_restricted(&self) -> bool;
}

#[cfg(all(feature = "web", target_arch = "wasm32"))]
pub mod web_impl {
    use super::*;
    use gloo_net::http::Request;

    fn performance_now_ms() -> f64 {
        web_sys::window()
            .and_then(|w| w.performance())
            .map(|p| p.now())
            .unwrap_or(0.0)
    }

    pub struct WebHttpClient;

    impl WebHttpClient {
        pub fn new() -> Self {
            Self
        }
    }

    #[cfg_attr(target_arch = "wasm32", async_trait(?Send))]
    #[cfg_attr(not(target_arch = "wasm32"), async_trait)]
    impl HttpClient for WebHttpClient {
        async fn send(&self, request: HttpRequest) -> Result<HttpResponse> {
            let start = performance_now_ms();
            let mut builder = match request.method.to_uppercase().as_str() {
                "GET" | "HEAD" => Request::get(&request.url),
                "POST" => Request::post(&request.url),
                "PUT" => Request::put(&request.url),
                "PATCH" => Request::patch(&request.url),
                "DELETE" => Request::delete(&request.url),
                other => {
                    return Err(PlatformError::Message(format!("Unsupported method: {other}")));
                }
            };
            for (k, v) in &request.headers {
                builder = builder.header(k, v);
            }
            let req = if let Some(body) = &request.body {
                builder
                    .body(body.clone())
                    .map_err(|e| PlatformError::Message(e.to_string()))?
            } else {
                builder
                    .build()
                    .map_err(|e| PlatformError::Message(e.to_string()))?
            };
            let resp = req
                .send()
                .await
                .map_err(|e| PlatformError::Message(e.to_string()))?;

            let status = resp.status();
            let headers = resp
                .headers()
                .entries()
                .collect::<Vec<(String, String)>>();
            let body = resp.text().await.map_err(|e| PlatformError::Message(e.to_string()))?;
            Ok(HttpResponse {
                status,
                status_text: format!("{status}"),
                headers,
                body,
                duration_ms: (performance_now_ms() - start).max(0.0) as u64,
            })
        }

        fn cors_restricted(&self) -> bool {
            true
        }
    }
}

#[cfg(all(feature = "web", target_arch = "wasm32"))]
pub use web_impl::WebHttpClient;

#[cfg(all(feature = "desktop", not(target_arch = "wasm32")))]
pub mod desktop_impl {
    use super::*;
    use std::time::Instant;

    pub struct DesktopHttpClient {
        client: reqwest::Client,
    }

    impl DesktopHttpClient {
        pub fn new() -> crate::Result<Self> {
            let client = reqwest::Client::builder()
                .timeout(std::time::Duration::from_secs(30))
                .build()
                .map_err(|e| PlatformError::Message(e.to_string()))?;
            Ok(Self { client })
        }
    }

    #[async_trait]
    impl HttpClient for DesktopHttpClient {
        async fn send(&self, request: HttpRequest) -> Result<HttpResponse> {
            let start = Instant::now();
            let method = reqwest::Method::from_bytes(request.method.as_bytes())
                .map_err(|e| PlatformError::Message(e.to_string()))?;
            let mut builder = self.client.request(method, &request.url);
            for (k, v) in &request.headers {
                builder = builder.header(k, v);
            }
            if let Some(body) = &request.body {
                builder = builder.body(body.clone());
            }
            let resp = builder
                .send()
                .await
                .map_err(|e| PlatformError::Message(e.to_string()))?;
            let status = resp.status().as_u16();
            let status_text = resp.status().to_string();
            let headers = resp
                .headers()
                .iter()
                .filter_map(|(k, v)| {
                    v.to_str().ok().map(|val| (k.to_string(), val.to_string()))
                })
                .collect();
            let body = resp.text().await.map_err(|e| PlatformError::Message(e.to_string()))?;
            Ok(HttpResponse {
                status,
                status_text,
                headers,
                body,
                duration_ms: start.elapsed().as_millis() as u64,
            })
        }

        fn cors_restricted(&self) -> bool {
            false
        }
    }
}

#[cfg(all(feature = "desktop", not(target_arch = "wasm32")))]
pub use desktop_impl::DesktopHttpClient;
