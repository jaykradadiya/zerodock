use crate::shell::drag_drop::DragDropZone;
use crate::shell::layout::{CodePanel, ResponsiveSplitPanels, StandaloneTool, ToolBody, ToolToolbar};
use crate::shell::pipeline::{use_pipeline_input, SendToButton};
use crate::shell::share_link::{state_json, ShareLinkButton, use_shared_state};
use crate::shell::tool_actions::ToolStandardActions;
use crate::shell::ui::SegmentedControl;
use dioxus::prelude::*;
use zerodock_core::{decode_url, encode_url};

const SAMPLE: &str = "hello world & foo=bar";

#[component]
pub fn UrlEncoder() -> Element {
    rsx! {
        StandaloneTool {
            title: "URL Encoder / Decoder",
            description: "Safely encode or decode URL parameters",
            UrlEncoderContent {}
        }
    }
}

#[component]
pub fn UrlEncoderContent() -> Element {
    let mut input = use_signal(String::new);
    let mut mode_encode = use_signal(|| true);
    use_pipeline_input("url-encoder", input);
    use_shared_state("url-encoder", input);

    let output = use_memo(move || {
        if input.read().is_empty() {
            return (String::new(), None);
        }
        if *mode_encode.read() {
            (encode_url(&input.read()), None)
        } else {
            match decode_url(&input.read()) {
                Ok(s) => (s, None),
                Err(e) => (String::new(), Some(e.to_string())),
            }
        }
    });

    let mode = if *mode_encode.read() { "encode" } else { "decode" }.to_string();
    let out_val = output.read().0.clone();

    rsx! {
        ToolBody {
            ToolToolbar {
                SegmentedControl {
                    options: vec![("encode", "Encode"), ("decode", "Decode")],
                    active: mode.clone(),
                    on_change: EventHandler::new(move |m| mode_encode.set(m == "encode")),
                }
                ToolStandardActions {
                    on_clear: EventHandler::new(move |_| input.set(String::new())),
                    on_sample: EventHandler::new(move |_| input.set(SAMPLE.to_string())),
                    extra: rsx! {
                        ShareLinkButton { tool_id: "url-encoder", state_json: state_json(&input.read()) }
                        SendToButton { source_tool_id: "url-encoder", content: out_val.clone() }
                    },
                }
            }
            DragDropZone {
                on_drop_text: EventHandler::new(move |t| input.set(t)),
                ResponsiveSplitPanels {
                    input_label: "Input",
                    output_label: "Output",
                    input_panel: rsx! {
                        CodePanel {
                            title: if *mode_encode.read() { "Plain Text".to_string() } else { "URL Encoded".to_string() },
                            value: input.read().clone(),
                            oninput: Some(EventHandler::new(move |e: Event<FormData>| input.set(e.value()))),
                            on_edit: Some(EventHandler::new(move |v: String| input.set(v))),
                            placeholder: "Enter text...",
                        }
                    },
                    output_panel: rsx! {
                        CodePanel {
                            title: if *mode_encode.read() { "URL Encoded".to_string() } else { "Plain Text".to_string() },
                            value: output.read().0.clone(),
                            oninput: None,
                            placeholder: "Result...",
                            read_only: true,
                            error: output.read().1.clone(),
                            show_empty: true,
                        }
                    },
                }
            }
        }
    }
}
