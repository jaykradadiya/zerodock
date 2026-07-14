use crate::shell::layout::{HubTabs, HubToolHeader, ToolBody, ToolPage, ToolWorkspace};
use crate::tools::{base64_codec, jwt_decoder, url_encoder};
use crate::state::use_app_state;
use dioxus::prelude::*;

#[component]
pub fn EncodeHub(initial_tab: String) -> Element {
    let mut tab = use_signal(move || initial_tab.clone());
    let mut state = use_app_state();

    use_effect(move || {
        if let Some(tool) = crate::registry::tool_for_hub_tab("encode-decode", &tab.read()) {
            state.record_tool_visit(tool.id);
        }
    });

    rsx! {
        ToolPage {
            HubToolHeader {
                hub_id: "encode-decode",
                hub_title: "Inspect & Codec Studio",
                hub_description: "Base64, URL encoding/decoding, and JWT token inspect & decode".to_string(),
                active_tab: tab.read().clone(),
            }
            ToolWorkspace {
                HubTabs {
                    tabs: vec![("base64", "Base64 Codec"), ("url", "URL Encoder"), ("jwt", "JWT Inspector")],
                    active: tab.read().clone(),
                    on_tab: EventHandler::new(move |t| tab.set(t)),
                }
                ToolBody {
                    match tab.read().as_str() {
                        "url" => rsx! { url_encoder::UrlEncoderContent {} },
                        "jwt" => rsx! { jwt_decoder::JwtDecoderContent {} },
                        _ => rsx! { base64_codec::Base64CodecContent {} },
                    }
                }
            }
        }
    }
}
