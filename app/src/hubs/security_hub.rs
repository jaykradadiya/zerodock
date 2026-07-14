use crate::shell::layout::{HubToolHeader, ToolBody, ToolPage, ToolWorkspace};
use crate::tools::hash_generator;
use crate::state::use_app_state;
use dioxus::prelude::*;

#[component]
pub fn SecurityHub(initial_tab: String) -> Element {
    let mut state = use_app_state();
    let _ = initial_tab;

    use_effect(move || {
        state.record_tool_visit("security");
    });

    rsx! {
        ToolPage {
            HubToolHeader {
                hub_id: "security",
                hub_title: "Hash & Crypto Studio",
                hub_description: "Cryptographic hash generation (MD5, SHA-1, SHA-256, SHA-512)".to_string(),
                active_tab: "hash".to_string(),
            }
            ToolWorkspace {
                ToolBody {
                    hash_generator::HashGeneratorContent {}
                }
            }
        }
    }
}
