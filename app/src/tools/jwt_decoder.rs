use crate::shell::empty_state::EmptyState;
use crate::shell::layout::{CodePanel, ResponsiveSplitPanels, StandaloneTool, ToolBody};

use crate::shell::ui::{Badge, BadgeVariant, CopyButton, InlineAlert};
use dioxus::prelude::*;
use zerodock_core::decode_jwt;

#[component]
pub fn JwtDecoder() -> Element {
    rsx! {
        StandaloneTool {
            title: "JWT Decoder",
            description: "Decode JWT tokens offline — no signature verification",
            JwtDecoderContent {}
        }
    }
}

#[component]
pub fn JwtDecoderContent() -> Element {
    let mut input = use_signal(String::new);


    let decoded = use_memo(move || {
        if input.read().trim().is_empty() {
            return None;
        }
        decode_jwt(&input.read()).ok()
    });

    let header_json = decoded
        .read()
        .as_ref()
        .map(|p| serde_json::to_string_pretty(&p.header_json).unwrap_or_default())
        .unwrap_or_default();
    let payload_json = decoded
        .read()
        .as_ref()
        .map(|p| serde_json::to_string_pretty(&p.payload_json).unwrap_or_default())
        .unwrap_or_default();

    rsx! {
        ToolBody {
            div {
                class: "px-3 pt-3 shrink-0",
                InlineAlert {
                    message: "Signature is not verified — for inspection only.".to_string(),
                    variant: crate::shell::ui::AlertVariant::Warning,
                }
            }
            ResponsiveSplitPanels {
                input_label: "Token",
                output_label: "Decoded",
                input_panel: rsx! {
                    CodePanel {
                        title: "JWT Token".to_string(),
                        value: input.read().clone(),
                        oninput: Some(EventHandler::new(move |e: Event<FormData>| input.set(e.value()))),
                        on_edit: Some(EventHandler::new(move |v: String| input.set(v))),
                        placeholder: "Paste JWT here...",
                        language: crate::shell::code_editor::CodeLanguage::Plain,
                    }
                },
                output_panel: rsx! {
                    div {
                        class: "zd-tool-fill p-4 overflow-y-auto custom-scrollbar space-y-4 min-h-0",
                        if let Some(parts) = decoded.read().as_ref() {
                            div {
                                class: "flex flex-wrap gap-2 mb-2",
                                if parts.is_expired {
                                    Badge { variant: BadgeVariant::Error, "Expired" }
                                } else if parts.payload_json.get("exp").is_some() {
                                    Badge { variant: BadgeVariant::Accent, "Valid" }
                                }
                            }
                            section {
                                div {
                                    class: "flex items-center justify-between mb-2",
                                    h3 { class: "zd-mono-label", "Header" }
                                    CopyButton { text: header_json.clone(), label: "Copy" }
                                }
                                div {
                                    class: "rounded-lg border border-[var(--zd-border)] overflow-hidden min-h-[6rem] h-48",
                                    CodePanel {
                                        title: "Header".to_string(),
                                        value: header_json.clone(),
                                        read_only: true,
                                        language: crate::shell::code_editor::CodeLanguage::Json,
                                        aria_label: "Decoded JWT header",
                                    }
                                }
                            }
                            section {
                                div {
                                    class: "flex items-center justify-between mb-2",
                                    h3 { class: "zd-mono-label", "Payload" }
                                    CopyButton { text: payload_json.clone(), label: "Copy" }
                                }
                                div {
                                    class: "rounded-lg border border-[var(--zd-border)] overflow-hidden min-h-[6rem] h-48",
                                    CodePanel {
                                        title: "Payload".to_string(),
                                        value: payload_json.clone(),
                                        read_only: true,
                                        language: crate::shell::code_editor::CodeLanguage::Json,
                                        aria_label: "Decoded JWT payload",
                                    }
                                }
                            }
                            section {
                                div {
                                    class: "flex items-center justify-between mb-2",
                                    h3 { class: "zd-mono-label", "Signature" }
                                    CopyButton { text: parts.signature.clone(), label: "Copy" }
                                }
                                code { class: "font-mono text-xs break-all text-[var(--zd-text-muted)]", "{parts.signature}" }
                            }
                        } else if !input.read().is_empty() {
                            p { class: "text-[var(--zd-error)] text-sm", role: "alert", "Invalid JWT token" }
                        } else {
                            EmptyState {
                                icon: "JWT",
                                title: "Paste a token",
                                hint: "Decoded header, payload, and signature will appear here.",
                            }
                        }
                    }
                },
            }
        }
    }
}
