use crate::shell::layout::{HubToolHeader, ToolBody, ToolPage, ToolWorkspace};
use crate::tools::api_tester;
use crate::state::use_app_state;
use dioxus::prelude::*;

#[component]
pub fn HttpHub(initial_tab: String) -> Element {
    let mut state = use_app_state();
    let _ = initial_tab;

    use_effect(move || {
        state.record_tool_visit("http");
    });

    rsx! {
        ToolPage {
            HubToolHeader {
                hub_id: "http",
                hub_title: "HTTP Client Studio",
                hub_description: "REST API testing, cURL import, and multi-language code snippets".to_string(),
                active_tab: "api".to_string(),
            }
            ToolWorkspace {
                ToolBody {
                    api_tester::ApiTesterContent {}
                }
            }
        }
    }
}
