use crate::shell::drag_drop::DragDropZone;
use crate::shell::layout::{CodePanel, ResponsiveSplitPanels, StandaloneTool, ToolBody, ToolToolbar};

use crate::shell::share_link::{state_json, ShareLinkButton, use_shared_state};
use crate::shell::tool_actions::ToolStandardActions;
use crate::shell::ui::SegmentedControl;
use crate::state::use_app_state;
use dioxus::prelude::*;
use zerodock_core::{decode_base64, encode_base64};

const SAMPLE: &str = "Hello, ZeroDock!";

#[component]
pub fn Base64Codec() -> Element {
    rsx! {
        StandaloneTool {
            title: "Base64 Codec",
            description: "Encode and decode Base64 strings",
            Base64CodecContent {}
        }
    }
}

#[component]
pub fn Base64CodecContent() -> Element {
    let mut state = use_app_state();
    let initial_data = use_hook(|| {
        let pasted = state.tool_states.read().get("base64-codec").cloned();
        if pasted.is_some() {
            state.tool_states.write().remove("base64-codec");
        }
        pasted
    });
    let mut input = use_signal(|| initial_data.clone().unwrap_or_default());
    let mut encode_mode = use_signal(|| initial_data.is_none());

    use_shared_state("base64-codec", input);

    let output = use_memo(move || {
        if input.read().is_empty() {
            return (String::new(), None);
        }
        if *encode_mode.read() {
            (encode_base64(&input.read()), None)
        } else {
            match decode_base64(&input.read()) {
                Ok(s) => (s, None),
                Err(e) => (String::new(), Some(e.to_string())),
            }
        }
    });

    let mode = if *encode_mode.read() { "encode" } else { "decode" }.to_string();
    let out_val = output.read().0.clone();
    let share_state = state_json(&input.read());

    rsx! {
        ToolBody {
            ToolToolbar {
                SegmentedControl {
                    options: vec![("encode", "Encode"), ("decode", "Decode")],
                    active: mode.clone(),
                    on_change: EventHandler::new(move |m| encode_mode.set(m == "encode")),
                }
                ToolStandardActions {
                    on_clear: EventHandler::new(move |_| input.set(String::new())),
                    on_sample: EventHandler::new(move |_| input.set(SAMPLE.to_string())),
                    extra: rsx! {
                        ShareLinkButton { tool_id: "base64-codec", state_json: share_state }
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
                            title: "Input".to_string(),
                            value: input.read().clone(),
                            oninput: Some(EventHandler::new(move |e: Event<FormData>| input.set(e.value()))),
                            on_edit: Some(EventHandler::new(move |v: String| input.set(v))),
                            placeholder: "Enter text...",
                        }
                    },
                    output_panel: rsx! {
                        CodePanel {
                            title: "Output".to_string(),
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
