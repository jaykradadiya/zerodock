use crate::shell::layout::{CodePanel, ResponsiveSplitPanels, StandaloneTool, ToolBody, ToolToolbar};
use crate::shell::pipeline::SendToButton;
use crate::shell::tool_actions::ToolStandardActions;
use crate::shell::ui::TabGroup;
use dioxus::prelude::*;
use zerodock_core::{curl_to_code, parse_curl, CurlTarget};

const SAMPLE_CURL: &str = r#"curl -X POST https://api.example.com/users -H "Content-Type: application/json" -d '{"name":"test"}'"#;

#[component]
pub fn CurlConverter() -> Element {
    rsx! {
        StandaloneTool {
            title: "cURL Converter",
            description: "Convert cURL commands to code snippets",
            CurlConverterContent {}
        }
    }
}

#[component]
pub fn CurlConverterContent() -> Element {
    let mut curl = use_signal(|| SAMPLE_CURL.to_string());
    let mut lang = use_signal(|| "javascript".to_string());

    let output = use_memo(move || {
        if curl.read().trim().is_empty() {
            return (String::new(), None);
        }
        let req = parse_curl(&curl.read());
        if req.url.is_empty() {
            return (String::new(), Some("Could not parse cURL — check the command format".to_string()));
        }
        let target = match lang.read().as_str() {
            "python" => CurlTarget::Python,
            "go" => CurlTarget::Go,
            "rust" => CurlTarget::Rust,
            _ => CurlTarget::JavaScript,
        };
        (curl_to_code(&req, target), None)
    });

    rsx! {
        ToolBody {
            ToolToolbar {
                TabGroup {
                    tabs: vec![
                        ("javascript", "JavaScript"),
                        ("python", "Python"),
                        ("go", "Go"),
                        ("rust", "Rust"),
                    ],
                    active: lang.read().clone(),
                    on_change: EventHandler::new(move |l| lang.set(l)),
                    variant: crate::shell::ui::TabVariant::Toolbar,
                }
                ToolStandardActions {
                    on_clear: EventHandler::new(move |_| curl.set(String::new())),
                    on_sample: EventHandler::new(move |_| curl.set(SAMPLE_CURL.to_string())),
                    extra: rsx! {
                        SendToButton { source_tool_id: "curl-converter", content: output.read().0.clone() }
                    },
                }
            }
            ResponsiveSplitPanels {
                input_label: "cURL",
                output_label: "Code",
                input_panel: rsx! {
                    CodePanel {
                        title: "cURL Command".to_string(),
                        value: curl.read().clone(),
                        oninput: Some(EventHandler::new(move |e: Event<FormData>| curl.set(e.value()))),
                        on_edit: Some(EventHandler::new(move |v: String| curl.set(v))),
                        placeholder: "Paste cURL...",
                        language: crate::shell::code_editor::CodeLanguage::Shell,
                    }
                },
                output_panel: rsx! {
                    CodePanel {
                        title: "Generated Code".to_string(),
                        value: output.read().0.clone(),
                        oninput: None,
                        read_only: true,
                        error: output.read().1.clone(),
                        show_empty: true,
                        language: crate::shell::code_editor::CodeLanguage::Plain,
                    }
                },
            }
        }
    }
}
