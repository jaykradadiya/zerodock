use crate::shell::empty_state::EmptyState;
use crate::shell::layout::{CodePanel, ResponsiveSplitPanels, StandaloneTool, ToolBody, ToolToolbar};
use crate::shell::code_editor::CodeLanguage;
use crate::shell::pipeline::SendToButton;
use crate::shell::tool_actions::ToolStandardActions;
use crate::shell::ui::{Badge, Card, CopyButton, InlineAlert, Input};
use dioxus::prelude::*;
use zerodock_core::{all_hashes, hmac_sha256_hex};

const SAMPLE: &str = "Hello World";

#[component]
pub fn HashGenerator() -> Element {
    rsx! {
        StandaloneTool {
            title: "Hash Generator",
            description: "Generate cryptographic hashes using native Rust",
            HashGeneratorContent {}
        }
    }
}

#[component]
pub fn HashGeneratorContent() -> Element {
    let mut input = use_signal(|| SAMPLE.to_string());
    let mut secret = use_signal(String::new);
    let mut hmac_mode = use_signal(|| false);

    let hashes = use_memo(move || {
        if input.read().is_empty() {
            return vec![];
        }
        if *hmac_mode.read() {
            if secret.read().is_empty() {
                return vec![];
            }
            if let Some(h) = hmac_sha256_hex(&input.read(), &secret.read()) {
                return vec![("HMAC (SHA-256)", h)];
            }
            return vec![];
        }
        all_hashes(&input.read())
    });

    let hmac_empty = *hmac_mode.read() && secret.read().is_empty() && !input.read().is_empty();

    rsx! {
        ToolBody {
            ToolToolbar {
                ToolStandardActions {
                    on_clear: EventHandler::new(move |_| input.set(String::new())),
                    on_sample: EventHandler::new(move |_| input.set(SAMPLE.to_string())),
                    extra: rsx! {
                        SendToButton { source_tool_id: "hash-generator", content: input.read().clone() }
                    },
                }
            }
            if hmac_empty {
                div {
                    class: "px-3 shrink-0",
                    InlineAlert {
                        message: "Enter an HMAC secret to generate keyed hashes.".to_string(),
                        variant: crate::shell::ui::AlertVariant::Warning,
                    }
                }
            }
            ResponsiveSplitPanels {
                input_label: "Input",
                output_label: "Hashes",
                input_panel: rsx! {
                    div {
                        class: "zd-tool-fill flex flex-col min-h-0",
                        CodePanel {
                            title: "Input".to_string(),
                            value: input.read().clone(),
                            oninput: Some(EventHandler::new(move |e: Event<FormData>| input.set(e.value()))),
                            on_edit: Some(EventHandler::new(move |v: String| input.set(v))),
                            placeholder: "Enter text to hash...",
                            language: CodeLanguage::Plain,
                        }
                        div {
                            class: "px-4 py-3 border-t border-[var(--zd-border)] space-y-2 shrink-0",
                            label {
                                class: "flex items-center gap-2 text-sm text-[var(--zd-text-secondary)]",
                                input {
                                    r#type: "checkbox",
                                    checked: *hmac_mode.read(),
                                    onchange: move |e| hmac_mode.set(e.checked()),
                                }
                                "HMAC mode"
                            }
                            if *hmac_mode.read() {
                                Input {
                                    value: secret.read().clone(),
                                    oninput: EventHandler::new(move |e: Event<FormData>| secret.set(e.value())),
                                    placeholder: "HMAC secret".to_string(),
                                }
                            }
                        }
                    }
                },
                output_panel: rsx! {
                    div {
                        class: "zd-tool-fill p-4 overflow-y-auto custom-scrollbar space-y-3 min-h-0",
                        if hashes.read().is_empty() {
                            EmptyState {
                                icon: "#",
                                title: "No hashes yet",
                                hint: "Enter text to generate cryptographic hashes.",
                            }
                        }
                        for (algo, hash) in hashes.read().iter() {
                            {
                                let hash_copy = hash.clone();
                                rsx! {
                                    Card {
                                        div {
                                            class: "flex items-center justify-between mb-2 gap-2",
                                            Badge { "{algo}" }
                                            CopyButton { text: hash_copy, label: "Copy" }
                                        }
                                        code {
                                            class: "block font-mono text-xs break-all text-[var(--zd-text-primary)]",
                                            "{hash}"
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
            }
        }
    }
}
