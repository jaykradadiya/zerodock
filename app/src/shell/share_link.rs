use crate::state::{use_app_state, ToastKind};
use dioxus::prelude::*;

fn encode_state_for_url(state_json: &str) -> String {
    // URL-encode on every target so shared links survive regardless of platform.
    urlencoding::encode(state_json).into_owned()
}

#[component]
pub fn ShareLinkButton(tool_id: &'static str, state_json: String) -> Element {
    let app_state = use_app_state();

    rsx! {
        button {
            class: "toolbar-btn",
            disabled: state_json.is_empty(),
            title: "Copy shareable link with current state",
            onclick: move |_| {
                let encoded = encode_state_for_url(&state_json);
                let path = window_path_for_tool(tool_id);
                let link = format!("{path}?s={encoded}");
                let mut app_state = app_state.clone();
                spawn(async move {
                    if crate::shell::ui::copy_to_clipboard(&link).await {
                        app_state.toast("Share link copied", ToastKind::Success);
                    } else {
                        app_state.toast("Failed to copy link", ToastKind::Error);
                    }
                });
            },
            "Share"
        }
    }
}

fn window_path_for_tool(tool_id: &str) -> String {
    if let Some(tool) = crate::registry::find_tool(tool_id) {
        tool.route.to_string()
    } else {
        "/".to_string()
    }
}

pub fn read_shared_state_from_url() -> Option<String> {
    #[cfg(target_arch = "wasm32")]
    {
        let search = web_sys::window()?.location().search().ok()?;
        for part in search.trim_start_matches('?').split('&') {
            if let Some(encoded) = part.strip_prefix("s=") {
                return urlencoding::decode(encoded).ok().map(|s| s.into_owned());
            }
        }
        None
    }
    #[cfg(not(target_arch = "wasm32"))]
    {
        None
    }
}

pub fn use_shared_state(_tool_id: &'static str, mut input: Signal<String>) {
    use_effect(move || {
        if let Some(json) = read_shared_state_from_url() {
            if let Ok(value) = serde_json::from_str::<serde_json::Value>(&json) {
                if let Some(content) = value.get("content").and_then(|v| v.as_str()) {
                    input.set(content.to_string());
                }
            } else {
                input.set(json);
            }
        }
    });
}

pub fn state_json(content: &str) -> String {
    serde_json::json!({ "content": content }).to_string()
}
