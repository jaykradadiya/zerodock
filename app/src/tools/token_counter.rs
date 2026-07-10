use crate::shell::layout::{CodePanel, StandaloneTool, ToolBody};
use crate::shell::ui::Card;
use dioxus::prelude::*;
use zerodock_core::{count_chars, count_tokens};

#[component]
pub fn TokenCounter() -> Element {
    rsx! {
        StandaloneTool {
            title: "LLM Token Counter",
            description: "Count OpenAI-compatible tokens using tiktoken-rs",
            TokenCounterContent {}
        }
    }
}

#[component]
pub fn TokenCounterContent() -> Element {
    let mut input = use_signal(String::new);
    let stats = use_memo(move || {
        let chars = count_chars(&input.read());
        let tokens = count_tokens(&input.read()).unwrap_or(0);
        (tokens, chars)
    });

    rsx! {
        ToolBody {
            div {
                class: "flex flex-wrap gap-4 p-4 border-b border-[var(--zd-border)] bg-[var(--zd-surface-raised)] shrink-0",
                Card {
                    div { class: "text-2xl font-bold text-[var(--zd-primary)]", "{stats.read().0}" }
                    div { class: "text-xs zd-mono-label mt-1", "Tokens" }
                }
                Card {
                    div { class: "text-2xl font-bold text-[var(--zd-accent)]", "{stats.read().1}" }
                    div { class: "text-xs zd-mono-label mt-1", "Characters" }
                }
            }
            CodePanel {
                title: "Prompt".to_string(),
                value: input.read().clone(),
                oninput: Some(EventHandler::new(move |e: Event<FormData>| input.set(e.value()))),
                on_edit: Some(EventHandler::new(move |v: String| input.set(v))),
                placeholder: "Paste your LLM prompt here...",
                language: crate::shell::code_editor::CodeLanguage::Plain,
            }
        }
    }
}
