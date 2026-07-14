use crate::shell::export::ExportButton;
use crate::shell::layout::{CodePanel, ResponsiveSplitPanels, StandaloneTool, ToolBody};
use crate::shell::tool_actions::ToolStandardActions;
use crate::shell::ui::CopyButton;
use dioxus::prelude::*;
use zerodock_core::diff_lines;

const SAMPLE_LEFT: &str = "fn hello() {\n  println!(\"Hello\");\n}";
const SAMPLE_RIGHT: &str = "fn hello() {\n  println!(\"Hello, World!\");\n}";

#[derive(Clone, Copy, PartialEq)]
enum DiffMode {
    Unified,
    SideBySide,
}

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
    let mut diff_mode = use_signal(|| DiffMode::Unified);
    let mut scroll_top = use_signal(|| 0.0f64);
    let mut viewport_height = use_signal(|| 500.0f64);
    const ROW_HEIGHT_PX: f64 = 24.0;

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
                    // Diff view mode toggle
                    div { class: "flex items-center border border-[var(--zd-border)] rounded-md overflow-hidden text-[11px] font-mono",
                        button {
                            class: if *diff_mode.read() == DiffMode::Unified {
                                "px-2.5 py-1 bg-[var(--zd-primary)] text-[var(--zd-primary-fg)] font-semibold transition-colors"
                            } else {
                                "px-2.5 py-1 text-[var(--zd-text-secondary)] hover:bg-[var(--zd-surface-hover)] transition-colors"
                            },
                            onclick: move |_| diff_mode.set(DiffMode::Unified),
                            "Unified"
                        }
                        button {
                            class: if *diff_mode.read() == DiffMode::SideBySide {
                                "px-2.5 py-1 bg-[var(--zd-primary)] text-[var(--zd-primary-fg)] font-semibold transition-colors border-l border-[var(--zd-border)]"
                            } else {
                                "px-2.5 py-1 text-[var(--zd-text-secondary)] hover:bg-[var(--zd-surface-hover)] transition-colors border-l border-[var(--zd-border)]"
                            },
                            onclick: move |_| diff_mode.set(DiffMode::SideBySide),
                            "Side-by-side"
                        }
                    }
                    button {
                        class: "toolbar-btn",
                        onclick: move |_| {
                            let current = *show_diff.read();
                            show_diff.set(!current);
                        },
                        if *show_diff.read() { "Hide diff" } else { "Show diff" }
                    }
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
                    // Diff panel header
                    div {
                        class: "px-3 py-2 border-b border-[var(--zd-border)] bg-[var(--zd-surface-raised)] flex items-center justify-between shrink-0",
                        div { class: "flex items-center gap-3",
                            span { class: "zd-mono-label", "{diff.read().len()} lines" }
                            span {
                                class: "text-[10px] font-mono text-[var(--zd-text-muted)] bg-[var(--zd-surface)] px-1.5 py-0.5 rounded border border-[var(--zd-border)]",
                                if *diff_mode.read() == DiffMode::Unified { "Unified view" } else { "Side-by-side view" }
                            }
                        }
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

                    // ── Unified view (virtualized) ────────────────────────
                    if *diff_mode.read() == DiffMode::Unified {
                        div {
                            class: "overflow-y-auto custom-scrollbar font-mono text-sm flex-1 min-h-0 relative select-text",
                            onscroll: move |e| {
                                scroll_top.set(e.data().scroll_top() as f64);
                                let ch = e.data().client_height() as f64;
                                if ch > 0.0 { viewport_height.set(ch); }
                            },
                            onmounted: move |e| {
                                spawn(async move {
                                    if let Ok(rect) = e.get_client_rect().await {
                                        if rect.height() > 0.0 { viewport_height.set(rect.height()); }
                                    }
                                });
                            },
                            {
                                let total_lines = diff.read().len();
                                let total_height_px = total_lines as f64 * ROW_HEIGHT_PX;
                                let first_visible = ((*scroll_top.read() / ROW_HEIGHT_PX).floor().max(0.0) as usize).saturating_sub(5);
                                let visible_rows = ((*viewport_height.read() / ROW_HEIGHT_PX).ceil() as usize) + 12;
                                let last_visible = (first_visible + visible_rows).min(total_lines);
                                rsx! {
                                    div { style: "height: {total_height_px}px; width: 100%; position: relative;" }
                                    div {
                                        style: "position: absolute; top: {first_visible as f64 * ROW_HEIGHT_PX}px; left: 0; right: 0;",
                                        for line in diff.read().iter().skip(first_visible).take(last_visible.saturating_sub(first_visible)) {
                                            {
                                                let (bg, prefix, text_class) = match line.kind {
                                                    zerodock_core::DiffLineKind::Equal   => ("transparent",                   " ", "text-[var(--zd-text-secondary)]"),
                                                    zerodock_core::DiffLineKind::Insert  => ("rgba(0, 223, 184, 0.12)",       "+", "text-[var(--zd-accent)]"),
                                                    zerodock_core::DiffLineKind::Delete  => ("rgba(255, 118, 117, 0.12)",     "-", "text-[var(--zd-error)]"),
                                                };
                                                rsx! {
                                                    div {
                                                        style: "background: {bg}; height: {ROW_HEIGHT_PX}px; line-height: {ROW_HEIGHT_PX}px;",
                                                        class: "px-4 whitespace-pre flex overflow-hidden items-center",
                                                        span { class: "text-[var(--zd-text-muted)] mr-3 w-4 shrink-0 select-none", "{prefix}" }
                                                        span { class: "{text_class} truncate", "{line.content}" }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // ── Side-by-side view ─────────────────────────────────
                    if *diff_mode.read() == DiffMode::SideBySide {
                        div {
                            class: "flex flex-1 min-h-0 divide-x divide-[var(--zd-border)]",
                            // Left pane — Original (equal + deletions)
                            div {
                                class: "flex-1 flex flex-col min-w-0",
                                div { class: "px-3 py-1 border-b border-[var(--zd-border)] bg-[var(--zd-surface)] text-[10px] font-mono font-semibold uppercase tracking-wide text-[var(--zd-error)] shrink-0",
                                    "─ Original"
                                }
                                div {
                                    class: "overflow-y-auto custom-scrollbar font-mono text-sm flex-1 min-h-0 select-text",
                                    onscroll: move |e| { scroll_top.set(e.data().scroll_top() as f64); },
                                    for line in diff.read().iter() {
                                        if line.kind != zerodock_core::DiffLineKind::Insert {
                                            {
                                                let bg = if line.kind == zerodock_core::DiffLineKind::Delete {
                                                    "rgba(255, 118, 117, 0.15)"
                                                } else { "transparent" };
                                                let text_class = if line.kind == zerodock_core::DiffLineKind::Delete {
                                                    "text-[var(--zd-error)]"
                                                } else { "text-[var(--zd-text-secondary)]" };
                                                rsx! {
                                                    div {
                                                        style: "background: {bg}; height: {ROW_HEIGHT_PX}px; line-height: {ROW_HEIGHT_PX}px;",
                                                        class: "px-3 whitespace-pre flex items-center overflow-hidden",
                                                        if line.kind == zerodock_core::DiffLineKind::Delete {
                                                            span { class: "text-[var(--zd-error)] mr-2 shrink-0 select-none text-xs", "−" }
                                                        } else {
                                                            span { class: "text-transparent mr-2 shrink-0 select-none text-xs", "·" }
                                                        }
                                                        span { class: "{text_class} truncate text-xs", "{line.content}" }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                            // Right pane — Modified (equal + insertions)
                            div {
                                class: "flex-1 flex flex-col min-w-0",
                                div { class: "px-3 py-1 border-b border-[var(--zd-border)] bg-[var(--zd-surface)] text-[10px] font-mono font-semibold uppercase tracking-wide text-[var(--zd-accent)] shrink-0",
                                    "+ Modified"
                                }
                                div {
                                    class: "overflow-y-auto custom-scrollbar font-mono text-sm flex-1 min-h-0 select-text",
                                    for line in diff.read().iter() {
                                        if line.kind != zerodock_core::DiffLineKind::Delete {
                                            {
                                                let bg = if line.kind == zerodock_core::DiffLineKind::Insert {
                                                    "rgba(0, 223, 184, 0.12)"
                                                } else { "transparent" };
                                                let text_class = if line.kind == zerodock_core::DiffLineKind::Insert {
                                                    "text-[var(--zd-accent)]"
                                                } else { "text-[var(--zd-text-secondary)]" };
                                                rsx! {
                                                    div {
                                                        style: "background: {bg}; height: {ROW_HEIGHT_PX}px; line-height: {ROW_HEIGHT_PX}px;",
                                                        class: "px-3 whitespace-pre flex items-center overflow-hidden",
                                                        if line.kind == zerodock_core::DiffLineKind::Insert {
                                                            span { class: "text-[var(--zd-accent)] mr-2 shrink-0 select-none text-xs", "+" }
                                                        } else {
                                                            span { class: "text-transparent mr-2 shrink-0 select-none text-xs", "·" }
                                                        }
                                                        span { class: "{text_class} truncate text-xs", "{line.content}" }
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
            }
        }
    }
}
