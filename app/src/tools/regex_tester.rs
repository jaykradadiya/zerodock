use crate::shell::empty_state::EmptyState;
use crate::shell::layout::{CodePanel, ResponsiveSplitPanels, StandaloneTool, ToolBody, ToolToolbar};
use crate::shell::tool_actions::ToolStandardActions;
use crate::shell::ui::{Badge, InlineAlert, Input};
use dioxus::prelude::*;
use zerodock_core::{test_regex, validate_regex};

const SAMPLE_TEXT: &str = "Order 123 shipped on 2024-01-15";
const SAMPLE_PATTERN: &str = r"\d+";

#[component]
pub fn RegexTester() -> Element {
    rsx! {
        StandaloneTool {
            title: "Regex Tester",
            description: "Test regular expressions with ReDoS-safe Rust regex engine",
            RegexTesterContent {}
        }
    }
}

#[component]
pub fn RegexTesterContent() -> Element {
    let mut pattern = use_signal(|| SAMPLE_PATTERN.to_string());
    let mut flags = use_signal(|| "g".to_string());
    let mut text = use_signal(|| SAMPLE_TEXT.to_string());

    let result = use_memo(move || {
        if pattern.read().is_empty() {
            return Ok(vec![]);
        }
        if let Err(e) = validate_regex(&pattern.read()) {
            return Err(e.to_string());
        }
        test_regex(&pattern.read(), &text.read(), &flags.read())
            .map_err(|e| e.to_string())
    });

    rsx! {
        ToolBody {
            ToolToolbar {
                Input {
                    value: pattern.read().clone(),
                    oninput: EventHandler::new(move |e: Event<FormData>| pattern.set(e.value())),
                    placeholder: "Pattern".to_string(),
                    class: "flex-1 min-w-[200px]".to_string(),
                }
                Input {
                    value: flags.read().clone(),
                    oninput: EventHandler::new(move |e: Event<FormData>| flags.set(e.value())),
                    placeholder: "Flags (gims)".to_string(),
                    class: "w-28".to_string(),
                }
                if let Ok(matches) = result.read().as_ref() {
                    Badge { "{matches.len()} matches" }
                }
                ToolStandardActions {
                    on_clear: EventHandler::new(move |_| {
                        pattern.set(String::new());
                        text.set(String::new());
                    }),
                    on_sample: EventHandler::new(move |_| {
                        pattern.set(SAMPLE_PATTERN.to_string());
                        text.set(SAMPLE_TEXT.to_string());
                    }),
                }
            }
            if let Err(err) = result.read().as_ref() {
                div { class: "px-3 shrink-0", InlineAlert { message: err.clone(), variant: crate::shell::ui::AlertVariant::Error } }
            }
            ResponsiveSplitPanels {
                input_label: "Test String",
                output_label: "Matches",
                input_panel: rsx! {
                    CodePanel {
                        title: "Test String".to_string(),
                        value: text.read().clone(),
                        oninput: Some(EventHandler::new(move |e: Event<FormData>| text.set(e.value()))),
                        on_edit: Some(EventHandler::new(move |v: String| text.set(v))),
                        placeholder: "Enter test string...",
                        language: crate::shell::code_editor::CodeLanguage::Plain,
                    }
                },
                output_panel: rsx! {
                    div {
                        class: "zd-tool-fill p-4 overflow-y-auto custom-scrollbar min-h-0 border-b md:border-b-0 md:border-r border-[var(--zd-border)]",
                        if result.read().is_err() {
                            EmptyState {
                                icon: "!",
                                title: "Invalid pattern",
                                hint: "Fix the regex pattern to see matches.",
                            }
                        } else if let Ok(matches) = result.read().as_ref() {
                            if matches.is_empty() {
                                EmptyState {
                                    icon: ".*",
                                    title: "No matches",
                                    hint: "Adjust your pattern or test string.",
                                }
                            }
                            for m in matches.iter() {
                                div {
                                    class: "mb-3 p-3 rounded-xl border border-[var(--zd-border)] bg-[var(--zd-surface)]",
                                    code { class: "font-mono text-sm text-[var(--zd-primary)]", "{m.full_match}" }
                                    p { class: "text-xs text-[var(--zd-text-muted)] mt-1 font-mono", "pos {m.start}–{m.end}" }
                                    if !m.groups.is_empty() {
                                        p { class: "text-xs mt-1 font-mono text-[var(--zd-text-secondary)]", "groups: {m.groups:?}" }
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
