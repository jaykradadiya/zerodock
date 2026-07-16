use crate::shell::ui::{IconClose, Kbd, Modal, Overlay};
use crate::state::{use_app_state, ToastKind};
use dioxus::prelude::*;

const TOAST_DURATION_MS: i32 = 4000;

#[component]
pub fn ToastContainer() -> Element {
    let state = use_app_state();
    let toasts = state.ui.read().toasts.clone();
    if toasts.is_empty() {
        return VNode::empty();
    }
    rsx! {
        div {
            class: "fixed bottom-5 right-4 z-[var(--zd-z-toast)] flex flex-col-reverse gap-2 max-w-xs w-full",
            style: "left: auto;",
            role: "status",
            aria_live: "polite",
            aria_atomic: "true",
            for toast in toasts {
                {
                    let toast_id = toast.id;
                    let message = toast.message.clone();
                    let kind = toast.kind;
                    rsx! {
                        ToastItem {
                            key: "{toast_id}",
                            id: toast_id,
                            message: message,
                            kind: kind,
                        }
                    }
                }
            }
        }
    }
}

#[component]
fn ToastItem(id: u64, message: String, kind: ToastKind) -> Element {
    let state = use_app_state();

    let (accent_color, icon) = match kind {
        ToastKind::Info    => ("var(--zd-info)",      "i"),
        ToastKind::Success => ("var(--zd-success)",   "✓"),
        ToastKind::Error   => ("var(--zd-error)",     "×"),
    };

    #[cfg(target_arch = "wasm32")]
    {
        let state_for_timeout = state.clone();
        use_effect(move || {
            let mut st = state_for_timeout.clone();
            let toast_id = id;
            spawn(async move {
                gloo_timers::future::TimeoutFuture::new(TOAST_DURATION_MS as u32).await;
                st.dismiss_toast(toast_id);
            });
        });
    }

    let mut state_for_dismiss = state.clone();

    rsx! {
        div {
            class: "zd-animate-slide-up flex items-start gap-3 px-4 py-3 rounded-lg border border-[var(--zd-border)] bg-[var(--zd-surface-raised)] shadow-[var(--zd-shadow-lg)] text-sm text-[var(--zd-text-primary)]",
            style: "border-left: 3px solid {accent_color};",

            span {
                class: "text-xs font-mono font-bold shrink-0 mt-0.5 w-4 text-center",
                style: "color: {accent_color};",
                "{icon}"
            }
            span { class: "flex-1 text-sm leading-relaxed", "{message}" }
            button {
                class: "text-[var(--zd-text-muted)] hover:text-[var(--zd-text-primary)] shrink-0 transition-colors focus-ring rounded",
                aria_label: "Dismiss",
                onclick: move |_| state_for_dismiss.dismiss_toast(id),
                IconClose {}
            }
        }
    }
}

#[component]
pub fn KeyboardShortcutsHelp() -> Element {
    let mut state = use_app_state();
    if !state.ui.read().shortcuts_help_open {
        return VNode::empty();
    }
    rsx! {
        Overlay {
            on_close: move |_| state.ui.write().shortcuts_help_open = false,
            z: "--zd-z-modal",
            Modal {
                max_width: "max-w-sm",
                class: "p-6",
                aria_label: Some("Keyboard shortcuts".to_string()),

                div {
                    class: "flex items-start justify-between mb-4",
                    div {
                        h2 {
                            id: "shortcuts-title",
                            class: "text-base font-semibold text-[var(--zd-text-primary)]",
                            style: "letter-spacing: -0.01em;",
                            "Keyboard Shortcuts"
                        }
                        p { class: "text-xs text-[var(--zd-text-muted)] mt-0.5", "Work faster" }
                    }
                }

                ul { class: "space-y-2.5",
                    for (keys, desc) in [
                        ("⌘ K",         "Open command palette"),
                        ("⌘ ↵",         "Run primary action"),
                        ("⌘ M",         "Create new tab"),
                        ("⌘ .",         "Toggle zen mode"),
                        ("?",            "Show this help"),
                        ("Escape",       "Close dialogs"),
                    ] {
                        li {
                            class: "flex items-center justify-between gap-4",
                            span { class: "text-sm text-[var(--zd-text-secondary)]", "{desc}" }
                            Kbd { "{keys}" }
                        }
                    }
                }
            }
        }
    }
}
