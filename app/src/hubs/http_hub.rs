use crate::shell::layout::{HubTabs, HubToolHeader, ToolBody, ToolPage, ToolWorkspace};
use crate::tools::{api_tester, curl_converter};
use crate::state::use_app_state;
use dioxus::prelude::*;

#[component]
pub fn HttpHub(initial_tab: String) -> Element {
    let mut tab = use_signal(move || initial_tab.clone());
    let mut state = use_app_state();

    use_effect(move || {
        if let Some(tool) = crate::registry::tool_for_hub_tab("http", &tab.read()) {
            state.record_tool_visit(tool.id);
        }
    });

    rsx! {
        ToolPage {
            HubToolHeader {
                hub_id: "http",
                hub_title: "HTTP Workshop",
                hub_description: "API testing and cURL conversion".to_string(),
                active_tab: tab.read().clone(),
            }
            ToolWorkspace {
                HubTabs {
                    tabs: vec![("api", "API Tester"), ("curl", "cURL Converter")],
                    active: tab.read().clone(),
                    on_tab: EventHandler::new(move |t| tab.set(t)),
                }
                ToolBody {
                    match tab.read().as_str() {
                        "curl" => rsx! { curl_converter::CurlConverterContent {} },
                        _ => rsx! { api_tester::ApiTesterContent {} },
                    }
                }
            }
        }
    }
}
