use crate::shell::ui::Button;
use crate::state::use_app_state;
use dioxus::prelude::*;

#[component]
pub fn ZenExitAffordance() -> Element {
    let mut state = use_app_state();
    if !state.ui.read().zen_mode {
        return VNode::empty();
    }
    rsx! {
        div {
            class: "fixed bottom-4 left-1/2 -translate-x-1/2 z-[var(--zd-z-modal)]",
            Button {
                class: "shadow-[var(--zd-shadow-lg)] backdrop-blur-md bg-[var(--zd-surface-raised)]/95 border border-[var(--zd-border)]",
                onclick: move |_| state.ui.write().zen_mode = false,
                "Exit zen mode · Esc"
            }
        }
    }
}
