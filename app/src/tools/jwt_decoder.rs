use crate::shell::empty_state::EmptyState;
use crate::shell::layout::{CodePanel, ResponsiveSplitPanels, StandaloneTool, ToolBody};
use crate::shell::ui::{Badge, BadgeVariant, CopyButton, InlineAlert};
use crate::state::use_app_state;
use dioxus::prelude::*;
use zerodock_core::{decode_jwt, verify_jwt_signature};

#[component]
pub fn JwtDecoder() -> Element {
    rsx! {
        StandaloneTool {
            title: "JWT Decoder & Verifier",
            description: "Decode and verify JWT tokens offline (`HS256`, `RS256`)",
            JwtDecoderContent {}
        }
    }
}

#[component]
pub fn JwtDecoderContent() -> Element {
    let mut state = use_app_state();
    let mut input = use_signal(|| {
        let pasted = state.tool_states.read().get("jwt-decoder").cloned();
        if pasted.is_some() {
            state.tool_states.write().remove("jwt-decoder");
        }
        pasted.unwrap_or_default()
    });
    let mut secret_input = use_signal(String::new);
    let mut show_secret = use_signal(|| false);

    let decoded = use_memo(move || {
        if input.read().trim().is_empty() {
            return None;
        }
        decode_jwt(&input.read()).ok()
    });

    let verify_result = use_memo(move || {
        if input.read().trim().is_empty() || secret_input.read().trim().is_empty() {
            return None;
        }
        match verify_jwt_signature(&input.read(), &secret_input.read()) {
            Ok(valid) => Some(Ok(valid)),
            Err(e) => Some(Err(e.to_string())),
        }
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
                    message: "All decoding and signature verification (`HS256`, `RS256`) is computed locally offline — secrets never leave your device.".to_string(),
                    variant: crate::shell::ui::AlertVariant::Info,
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
                                    Badge { variant: BadgeVariant::Accent, "Not Expired" }
                                }
                                if let Some(res) = verify_result.read().as_ref() {
                                    match res {
                                        Ok(true) => rsx! { Badge { variant: BadgeVariant::Accent, "Verified ✓" } },
                                        Ok(false) => rsx! { Badge { variant: BadgeVariant::Error, "Invalid Signature ✗" } },
                                        _ => rsx! {},
                                    }
                                }
                            }
                            section {
                                div {
                                    class: "flex items-center justify-between mb-2",
                                    h3 { class: "zd-mono-label", "Verify Signature" }
                                    span { class: "text-xs text-[var(--zd-text-muted)] font-mono",
                                        "{parts.header_json.get(\"alg\").and_then(|v| v.as_str()).unwrap_or(\"none\")}"
                                    }
                                }
                                div {
                                    class: "space-y-2",
                                    div {
                                        class: "relative flex items-center",
                                        input {
                                            class: "w-full px-3 py-2 text-sm font-mono bg-[var(--zd-surface)] border border-[var(--zd-border)] rounded-lg focus:outline-none focus:border-[var(--zd-primary)] transition-colors pr-24 placeholder:text-[var(--zd-text-muted)]/60",
                                            type: if *show_secret.read() { "text" } else { "password" },
                                            value: "{secret_input}",
                                            placeholder: "Enter secret string or RS256 public key PEM...",
                                            oninput: move |e: Event<FormData>| secret_input.set(e.value()),
                                        }
                                        button {
                                            class: "absolute right-2 px-2 py-1 text-xs font-mono text-[var(--zd-text-secondary)] hover:text-[var(--zd-text-primary)] rounded bg-[var(--zd-surface-raised)] border border-[var(--zd-border)]",
                                            onclick: move |_| {
                                                let s = *show_secret.read();
                                                show_secret.set(!s);
                                            },
                                            if *show_secret.read() { "Hide" } else { "Show" }
                                        }
                                    }
                                    if let Some(res) = verify_result.read().as_ref() {
                                        match res {
                                            Ok(true) => rsx! {
                                                div { class: "flex items-center gap-2 px-3 py-2 rounded-lg bg-[rgba(0,223,184,0.12)] border border-[var(--zd-accent)]/30 text-sm font-mono text-[var(--zd-accent)]",
                                                    "✓ Signature Verified"
                                                }
                                            },
                                            Ok(false) => rsx! {
                                                div { class: "flex items-center gap-2 px-3 py-2 rounded-lg bg-[rgba(255,118,117,0.12)] border border-[var(--zd-error)]/30 text-sm font-mono text-[var(--zd-error)]",
                                                    "✗ Invalid Signature"
                                                }
                                            },
                                            Err(err) => rsx! {
                                                div { class: "flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--zd-surface-raised)] border border-[var(--zd-border)] text-xs font-mono text-[var(--zd-text-secondary)]",
                                                    "⚠ {err}"
                                                }
                                            },
                                        }
                                    } else {
                                        p { class: "text-xs text-[var(--zd-text-muted)]",
                                            "Enter your HMAC secret (for HS256/384/512) or public key PEM (for RS256) to verify authenticity."
                                        }
                                    }
                                }
                            }
                            section {
                                div {
                                    class: "flex items-center justify-between mb-2",
                                    h3 { class: "zd-mono-label", "Header" }
                                    CopyButton { text: header_json.clone(), label: "Copy" }
                                }
                                div {
                                    class: "rounded-lg border border-[var(--zd-border)] overflow-hidden min-h-[6rem] h-48 flex flex-col",
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
                                    class: "rounded-lg border border-[var(--zd-border)] overflow-hidden min-h-[6rem] h-48 flex flex-col",
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
