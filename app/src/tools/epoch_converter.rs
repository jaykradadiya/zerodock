use crate::shell::code_editor::CodeLanguage;
use crate::shell::layout::{CodePanel, ResponsiveSplitPanels, StandaloneTool, ToolBody};
use crate::shell::ui::{Card, Input};
use dioxus::prelude::*;
use zerodock_core::{epoch_to_human, now_epoch, parse_to_epoch};

#[component]
pub fn EpochConverter() -> Element {
    rsx! {
        StandaloneTool {
            title: "Epoch Converter",
            description: "Convert Unix timestamps to human-readable dates",
            EpochConverterContent {}
        }
    }
}

#[component]
pub fn EpochConverterContent() -> Element {
    let mut epoch_input = use_signal(|| now_epoch().to_string());
    let mut date_input = use_signal(String::new);
    let mut bulk_epochs = use_signal(String::new);
    let live = use_memo(|| epoch_to_human(now_epoch()));

    let from_epoch = use_memo(move || {
        epoch_input
            .read()
            .parse::<i64>()
            .ok()
            .map(epoch_to_human)
    });

    let epoch_error = use_memo(move || {
        if epoch_input.read().is_empty() {
            return None;
        }
        if epoch_input.read().parse::<i64>().is_err() {
            Some("Enter a valid Unix timestamp (integer seconds)".to_string())
        } else {
            None
        }
    });

    let from_date = use_memo(move || parse_to_epoch(&date_input.read()).ok().map(epoch_to_human));

    let date_error = use_memo(move || {
        if date_input.read().is_empty() {
            return None;
        }
        if parse_to_epoch(&date_input.read()).is_err() {
            Some("Use format: YYYY-MM-DD HH:MM:SS".to_string())
        } else {
            None
        }
    });

    let bulk_output = use_memo(move || {
        let mut lines = Vec::new();
        for (i, line) in bulk_epochs.read().lines().enumerate() {
            let trimmed = line.trim();
            if trimmed.is_empty() {
                continue;
            }
            match trimmed.parse::<i64>() {
                Ok(epoch) => {
                    let human = epoch_to_human(epoch);
                    lines.push(format!(
                        "{epoch}\t{}\t{}",
                        human.utc, human.local
                    ));
                }
                Err(_) => lines.push(format!("Line {}: invalid timestamp", i + 1)),
            }
        }
        lines.join("\n")
    });

    rsx! {
        ToolBody {
            div {
                class: "shrink-0 p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 border-b border-[var(--zd-border)]",
                Card {
                    div { class: "flex items-center gap-2 mb-3", span { class: "zd-status-dot", aria_hidden: "true" } }
                    h3 { class: "zd-mono-label mb-2", "Live Clock" }
                    p { class: "text-2xl font-mono text-[var(--zd-primary)]", "{live.read().epoch_seconds}" }
                    p { class: "text-sm text-[var(--zd-text-secondary)] mt-1", "{live.read().utc}" }
                    p { class: "text-xs text-[var(--zd-text-muted)] mt-1", "{live.read().relative}" }
                }
                Card {
                    h3 { class: "zd-mono-label mb-2", "Epoch → Date" }
                    Input {
                        value: epoch_input.read().clone(),
                        oninput: EventHandler::new(move |e: Event<FormData>| epoch_input.set(e.value())),
                        placeholder: "Unix timestamp".to_string(),
                    }
                    if let Some(err) = epoch_error.read().as_ref() {
                        p { class: "mt-2 text-xs text-[var(--zd-error)]", role: "alert", "{err}" }
                    }
                    if let Some(c) = from_epoch.read().as_ref() {
                        p { class: "mt-3 text-sm text-[var(--zd-text-primary)]", "{c.utc}" }
                        p { class: "text-xs text-[var(--zd-text-muted)]", "{c.local}" }
                    }
                }
                Card {
                    h3 { class: "zd-mono-label mb-2", "Date → Epoch" }
                    Input {
                        value: date_input.read().clone(),
                        oninput: EventHandler::new(move |e: Event<FormData>| date_input.set(e.value())),
                        placeholder: "YYYY-MM-DD HH:MM:SS".to_string(),
                    }
                    if let Some(err) = date_error.read().as_ref() {
                        p { class: "mt-2 text-xs text-[var(--zd-error)]", role: "alert", "{err}" }
                    }
                    if let Some(c) = from_date.read().as_ref() {
                        p { class: "mt-3 text-sm font-mono text-[var(--zd-accent)]", "{c.epoch_seconds}" }
                    }
                }
            }
            ResponsiveSplitPanels {
                input_label: "Bulk epochs",
                output_label: "Converted",
                input_panel: rsx! {
                    CodePanel {
                        title: "Epochs (one per line)".to_string(),
                        value: bulk_epochs.read().clone(),
                        oninput: Some(EventHandler::new(move |e: Event<FormData>| bulk_epochs.set(e.value()))),
                        on_edit: Some(EventHandler::new(move |v: String| bulk_epochs.set(v))),
                        placeholder: "1704067200\n1704153600",
                        language: CodeLanguage::Plain,
                    }
                },
                output_panel: rsx! {
                    CodePanel {
                        title: "UTC / Local".to_string(),
                        value: bulk_output.read().clone(),
                        oninput: None,
                        read_only: true,
                        show_empty: true,
                        placeholder: "Converted dates appear here",
                        language: CodeLanguage::Plain,
                    }
                },
            }
        }
    }
}
