use crate::shell::export::ExportButton;
use crate::shell::layout::{CodePanel, ResponsiveSplitPanels, StandaloneTool, ToolBody};
use crate::shell::pipeline::SendToButton;
use crate::shell::tool_actions::ToolStandardActions;
use crate::shell::ui::CopyButton;
use dioxus::prelude::*;
use zerodock_core::diff_lines;

const SAMPLE_LEFT: &str = "fn hello() {\n  println!(\"Hello\");\n}";
const SAMPLE_RIGHT: &str = "fn hello() {\n  println!(\"Hello, World!\");\n}";

#[component]
pub fn DiffChecker() -> Element {
    rsx! {
        StandaloneTool {
            title: "Text Diff Checker",
            description: "Compare two text snippets with native Rust diff",
            DiffCheckerContent {}
        }
    }
}

#[component]
pub fn DiffCheckerContent() -> Element {
    let mut left = use_signal(|| SAMPLE_LEFT.to_string());
    let mut right = use_signal(|| SAMPLE_RIGHT.to_string());
    let mut show_diff = use_signal(|| true);

    let diff = use_memo(move || diff_lines(&left.read(), &right.read()));

    let diff_text = use_memo(move || {
        diff.read()
            .iter()
            .map(|line| {
                let prefix = match line.kind {
                    zerodock_core::DiffLineKind::Equal => " ",
                    zerodock_core::DiffLineKind::Insert => "+",
                    zerodock_core::DiffLineKind::Delete => "-",
                };
                format!("{prefix}{}", line.content)
            })
            .collect::<Vec<_>>()
            .join("\n")
    });

    rsx! {
        ToolBody {
            ToolStandardActions {
                on_clear: EventHandler::new(move |_| {
                    left.set(String::new());
                    right.set(String::new());
                }),
                on_sample: EventHandler::new(move |_| {
                    left.set(SAMPLE_LEFT.to_string());
                    right.set(SAMPLE_RIGHT.to_string());
                }),
                extra: rsx! {
                    button {
                        class: "toolbar-btn",
                        onclick: move |_| {
                            let current = *show_diff.read();
                            show_diff.set(!current);
                        },
                        if *show_diff.read() { "Hide diff" } else { "Show diff" }
                    }
                    SendToButton { source_tool_id: "diff-checker", content: left.read().clone() }
                },
            }
            ResponsiveSplitPanels {
                input_label: "Original",
                output_label: "Modified",
                input_panel: rsx! {
                    CodePanel {
                        title: "Original".to_string(),
                        value: left.read().clone(),
                        oninput: Some(EventHandler::new(move |e: Event<FormData>| left.set(e.value()))),
                        on_edit: Some(EventHandler::new(move |v: String| left.set(v))),
                        placeholder: "Original text...",
                        language: crate::shell::code_editor::CodeLanguage::Plain,
                    }
                },
                output_panel: rsx! {
                    CodePanel {
                        title: "Modified".to_string(),
                        value: right.read().clone(),
                        oninput: Some(EventHandler::new(move |e: Event<FormData>| right.set(e.value()))),
                        on_edit: Some(EventHandler::new(move |v: String| right.set(v))),
                        placeholder: "Modified text...",
                        language: crate::shell::code_editor::CodeLanguage::Plain,
                    }
                },
            }
            if *show_diff.read() {
                div {
                    class: "border-t border-[var(--zd-border)] flex flex-col flex-1 min-h-0 shrink-0",
                    div {
                        class: "px-3 py-2 border-b border-[var(--zd-border)] bg-[var(--zd-surface-raised)] flex items-center justify-between shrink-0",
                        span { class: "zd-mono-label", "{diff.read().len()} lines" }
                        div {
                            class: "flex items-center gap-1",
                            CopyButton { text: diff_text.read().clone(), label: "Copy" }
                            ExportButton {
                                filename: "diff.txt",
                                content: diff_text.read().clone(),
                                label: "Download",
                            }
                        }
                    }
                    div {
                        class: "overflow-y-auto custom-scrollbar font-mono text-sm flex-1 min-h-0",
                        for line in diff.read().iter() {
                            {
                                let (bg, prefix, text_class) = match line.kind {
                                    zerodock_core::DiffLineKind::Equal => ("transparent", " ", "text-[var(--zd-text-secondary)]"),
                                    zerodock_core::DiffLineKind::Insert => ("rgba(0, 223, 184, 0.12)", "+", "text-[var(--zd-accent)]"),
                                    zerodock_core::DiffLineKind::Delete => ("rgba(255, 118, 117, 0.12)", "-", "text-[var(--zd-error)]"),
                                };
                                rsx! {
                                    div {
                                        style: "background: {bg};",
                                        class: "px-4 py-0.5 whitespace-pre flex",
                                        span { class: "text-[var(--zd-text-muted)] mr-3 w-4 shrink-0 select-none", "{prefix}" }
                                        span { class: "{text_class}", "{line.content}" }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
