use crate::router::route_for_path;
use crate::state::{use_app_state, ToastKind};
use dioxus::prelude::*;
use dioxus_router::Link;

#[derive(Clone, Copy, PartialEq)]
pub struct PipelineTarget {
    pub tool_id: &'static str,
    pub route: &'static str,
    pub label: &'static str,
    /// Whether this tool meaningfully accepts JSON as its input (as opposed
    /// to treating incoming content as an opaque string/token/text blob).
    /// Used to narrow the "Send to" menu when the source content is JSON.
    pub accepts_json: bool,
}

pub const PIPELINE_TARGETS: &[PipelineTarget] = &[
    PipelineTarget { tool_id: "json-toolkit", route: "/json-toolkit", label: "JSON Toolkit", accepts_json: true },
    PipelineTarget { tool_id: "api-tester", route: "/api-tester", label: "API Tester", accepts_json: true },
    PipelineTarget { tool_id: "base64-codec", route: "/base64-codec", label: "Base64 Codec", accepts_json: false },
    PipelineTarget { tool_id: "hash-generator", route: "/hash-generator", label: "Hash Generator", accepts_json: false },
    PipelineTarget { tool_id: "jwt-decoder", route: "/jwt-decoder", label: "JWT Decoder", accepts_json: false },
    PipelineTarget { tool_id: "diff-checker", route: "/diff-checker", label: "Diff Checker", accepts_json: false },
    PipelineTarget { tool_id: "url-encoder", route: "/url-encoder", label: "URL Encoder", accepts_json: false },
];

pub fn targets_for(source_tool_id: &'static str) -> impl Iterator<Item = &'static PipelineTarget> {
    PIPELINE_TARGETS
        .iter()
        .filter(move |t| t.tool_id != source_tool_id)
}

/// Like `targets_for`, but narrowed to tools that meaningfully accept JSON
/// input — for `SendToButton` call sites whose content is specifically JSON
/// (currently just the JSON Toolkit's own menu).
pub fn targets_for_json_only(source_tool_id: &'static str) -> impl Iterator<Item = &'static PipelineTarget> {
    PIPELINE_TARGETS
        .iter()
        .filter(move |t| t.tool_id != source_tool_id && t.accepts_json)
}

#[component]
pub fn SendToButton(
    source_tool_id: &'static str,
    content: String,
    #[props(default)] disabled: bool,
    /// When true, the menu only lists tools that meaningfully accept JSON
    /// input (see `PipelineTarget::accepts_json`). Defaults to false so
    /// existing call sites keep their current (unfiltered) behavior.
    #[props(default)]
    json_only: bool,
) -> Element {
    let mut state = use_app_state();
    let mut open = use_signal(|| false);
    let has_content = !content.trim().is_empty();

    if !has_content {
        return VNode::empty();
    }

    rsx! {
        div {
            class: "relative",
            button {
                class: "toolbar-btn",
                disabled: disabled,
                aria_haspopup: "menu",
                aria_expanded: "{*open.read()}",
                aria_label: "Send content to another tool",
                onclick: move |e| {
                    e.stop_propagation();
                    let current = *open.read();
                    open.set(!current);
                },
                "Send to"
            }
            if *open.read() {
                // Invisible full-screen layer: clicking anywhere outside the menu
                // (or pressing it) dismisses it. Previously the menu could only be
                // closed by picking an item.
                button {
                    class: "fixed inset-0 z-[calc(var(--zd-z-dropdown)-1)] cursor-default bg-transparent",
                    aria_hidden: "true",
                    tabindex: "-1",
                    onclick: move |_| open.set(false),
                }
                div {
                    class: "absolute right-0 top-full mt-1 min-w-[180px] rounded-md border border-[var(--zd-border)] bg-[var(--zd-surface-raised)] shadow-[var(--zd-shadow-lg)] z-[var(--zd-z-dropdown)] py-1",
                    role: "menu",
                    aria_label: "Send to",
                    for target in {
                        let list: Vec<&'static PipelineTarget> = if json_only {
                            targets_for_json_only(source_tool_id).collect()
                        } else {
                            targets_for(source_tool_id).collect()
                        };
                        list
                    } {
                        {
                            let route = route_for_path(target.route);
                            let label = target.label;
                            let content = content.clone();
                            let mut link_state = state.clone();
                            rsx! {
                                Link {
                                    to: route,
                                    class: "block px-3 py-2 text-sm text-[var(--zd-text-primary)] hover:bg-[var(--zd-primary-soft)]",
                                    role: "menuitem",
                                    onclick: move |_| {
                                        link_state.set_pipeline_payload(source_tool_id, content.clone(), label);
                                        open.set(false);
                                    },
                                    "{label}"
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

pub fn use_pipeline_input(tool_id: &'static str, mut input: Signal<String>) {
    let mut state = use_app_state();
    use_effect(move || {
        if let Some(payload) = state.take_pipeline_payload() {
            if payload.source_tool != tool_id {
                input.set(payload.content);
                state.toast(
                    format!("Received from {}", payload.label),
                    ToastKind::Info,
                );
            }
        }
    });
}
