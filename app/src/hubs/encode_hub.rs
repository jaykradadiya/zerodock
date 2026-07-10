use crate::shell::layout::{HubTabs, HubToolHeader, ToolBody, ToolPage, ToolWorkspace};
use crate::tools::{base64_codec, url_encoder};
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
                hub_title: "Encode / Decode",
                hub_description: "Base64 and URL encoding tools".to_string(),
                active_tab: tab.read().clone(),
            }
            ToolWorkspace {
                HubTabs {
                    tabs: vec![("base64", "Base64"), ("url", "URL")],
                    active: tab.read().clone(),
                    on_tab: EventHandler::new(move |t| tab.set(t)),
                }
                ToolBody {
                    match tab.read().as_str() {
                        "url" => rsx! { url_encoder::UrlEncoderContent {} },
                        _ => rsx! { base64_codec::Base64CodecContent {} },
                    }
                }
            }
        }
    }
}
