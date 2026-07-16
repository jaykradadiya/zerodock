use crate::shell::layout::{HubTabs, HubToolHeader, ToolBody, ToolPage, ToolWorkspace};
use crate::tools::{base64_codec, jwt_decoder, url_encoder};
use crate::state::use_app_state;
use dioxus::prelude::*;

#[component]
pub fn EncodeHub(initial_tab: String) -> Element {
    let initial_tab_cloned = initial_tab.clone();
    let mut tab = use_signal(move || initial_tab_cloned.clone());
    let initial_tab_for_sig = initial_tab.clone();
    let mut initial_tab_sig = use_signal(move || initial_tab_for_sig.clone());
    if *initial_tab_sig.read() != initial_tab {
        initial_tab_sig.set(initial_tab.clone());
        tab.set(initial_tab.clone());
    }
    let mut state = use_app_state();

    use_effect(move || {
        state.record_tool_visit("encode-decode");
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
