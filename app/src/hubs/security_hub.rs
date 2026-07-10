use crate::shell::layout::{HubTabs, HubToolHeader, ToolBody, ToolPage, ToolWorkspace};
use crate::tools::{hash_generator, jwt_decoder, rsa_generator};
use crate::state::use_app_state;
use dioxus::prelude::*;

#[component]
pub fn SecurityHub(initial_tab: String) -> Element {
    let mut tab = use_signal(move || initial_tab.clone());
    let mut state = use_app_state();

    use_effect(move || {
        if let Some(tool) = crate::registry::tool_for_hub_tab("security", &tab.read()) {
            state.record_tool_visit(tool.id);
        }
    });

    rsx! {
        ToolPage {
            HubToolHeader {
                hub_id: "security",
                hub_title: "Security Suite",
                hub_description: "Hashing, JWT decoding, and RSA key generation".to_string(),
                active_tab: tab.read().clone(),
            }
            ToolWorkspace {
                HubTabs {
                    tabs: vec![("hash", "Hash"), ("jwt", "JWT"), ("rsa", "RSA")],
                    active: tab.read().clone(),
                    on_tab: EventHandler::new(move |t| tab.set(t)),
                }
                ToolBody {
                    match tab.read().as_str() {
                        "jwt" => rsx! { jwt_decoder::JwtDecoderContent {} },
                        "rsa" => rsx! { rsa_generator::RsaGeneratorContent {} },
                        _ => rsx! { hash_generator::HashGeneratorContent {} },
                    }
                }
            }
        }
    }
}
