use crate::state::{use_app_state, ToastKind};
use dioxus::prelude::*;

/// Download `content` as a file named `filename`.
///
/// On web this triggers a browser download via an anchor element. On desktop
/// (Dioxus native renderer, no JS file-dialog) it writes the file to a
/// `zerodock-exports/` folder next to the executable and returns the path.
pub fn download_text(filename: &str, content: &str, mime: &str) -> Result<String, String> {
    #[cfg(target_arch = "wasm32")]
    {
        use wasm_bindgen::JsCast;
        let window = web_sys::window().ok_or_else(|| "no window".to_string())?;
        let document = window.document().ok_or_else(|| "no document".to_string())?;
        let elem = document
            .create_element("a")
            .map_err(|e| format!("create element failed: {e:?}"))?;
        let anchor: web_sys::HtmlAnchorElement = elem
            .dyn_into()
            .map_err(|_| "cast anchor failed".to_string())?;
        let href = format!("data:{mime};charset=utf-8,{}", urlencoding::encode(content));
        anchor.set_href(&href);
        anchor.set_download(filename);
        let _ = anchor.click();
        Ok(filename.to_string())
    }
    #[cfg(not(target_arch = "wasm32"))]
    {
        let _ = mime;
        let dir = std::env::current_dir()
            .map_err(|e| e.to_string())?
            .join("zerodock-exports");
        std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
        let path = dir.join(filename);
        std::fs::write(&path, content).map_err(|e| e.to_string())?;
        Ok(path.to_string_lossy().to_string())
    }
}

#[component]
pub fn ExportButton(
    #[props(into)] filename: String,
    content: String,
    #[props(default)] mime: &'static str,
    #[props(default)] label: &'static str,
) -> Element {
    let state = use_app_state();
    rsx! {
        button {
            class: "toolbar-btn",
            disabled: content.trim().is_empty(),
            onclick: {
                let filename = filename.clone();
                let content = content.clone();
                let mut state = state.clone();
                move |_| {
                    match download_text(&filename, &content, mime) {
                        Ok(_path) => state.toast(format!("Exported {}", filename), ToastKind::Success),
                        Err(e) => state.toast(format!("Export failed: {e}"), ToastKind::Error),
                    }
                }
            },
            "{label}"
        }
    }
}
