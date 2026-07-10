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
            class: "fixed bottom-4 left-1/2 -translate-x-1/2 md:left-auto md:translate-x-0 md:right-4 z-[var(--zd-z-toast)] flex flex-col gap-2 max-w-sm w-[calc(100%-2rem)] md:w-auto pb-[env(safe-area-inset-bottom)]",
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
    let (border, icon) = match kind {
        ToastKind::Info => ("border-[var(--zd-border)]", "i"),
        ToastKind::Success => ("border-[var(--zd-accent)]", "ok"),
        ToastKind::Error => ("border-[var(--zd-error)]/50", "x"),
    };

    // Auto-dismiss only on web
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

    // Separate clone for the manual dismiss button
    let mut state_for_dismiss = state.clone();

    rsx! {
        div {
            class: "flex items-start gap-3 px-4 py-3 rounded-md border bg-[var(--zd-surface-raised)]/95 backdrop-blur-md shadow-[var(--zd-shadow-md)] text-sm text-[var(--zd-text-primary)] {border}",
            span { class: "sr-only", "{kind_label(kind)}" }
            span { class: "text-[var(--zd-text-muted)] shrink-0 zd-mono-label", "{icon}" }
            span { class: "flex-1", "{message}" }
            button {
                class: "text-[var(--zd-text-muted)] hover:text-[var(--zd-text-primary)] shrink-0 focus-ring rounded px-1",
                aria_label: "Dismiss notification",
                onclick: move |_| state_for_dismiss.dismiss_toast(id),
                "×"
            }
        }
    }
}

fn kind_label(kind: ToastKind) -> &'static str {
    match kind {
        ToastKind::Info => "Information",
        ToastKind::Success => "Success",
        ToastKind::Error => "Error",
    }
}

#[component]
pub fn KeyboardShortcutsHelp() -> Element {
    let mut state = use_app_state();
    if !state.ui.read().shortcuts_help_open {
        return VNode::empty();
    }
    rsx! {
        div {
            class: "fixed inset-0 z-[var(--zd-z-modal)] flex items-center justify-center px-4",
            onclick: move |_| state.ui.write().shortcuts_help_open = false,
            div { class: "absolute inset-0 bg-black/60 backdrop-blur-sm" }
            div {
                class: "relative max-w-md w-full rounded-lg border border-[var(--zd-border)] bg-[var(--zd-surface-raised)] p-6 shadow-[var(--zd-shadow-lg)]",
                role: "dialog",
                aria_modal: "true",
                aria_labelledby: "shortcuts-title",
                onclick: move |e| e.stop_propagation(),
                h2 {
                    id: "shortcuts-title",
                    class: "text-lg font-semibold text-[var(--zd-text-primary)] mb-1",
                    "Keyboard Shortcuts"
                }
                p {
                    class: "text-xs text-[var(--zd-text-muted)] mb-4",
                    "Work faster with these shortcuts"
                }
                ul {
                    class: "space-y-3 text-sm",
                    for (keys, desc) in [
                        ("Cmd/Ctrl + K", "Open command palette"),
                        ("Cmd/Ctrl + Enter", "Run primary action"),
                        ("Cmd/Ctrl + .", "Toggle zen mode"),
                        ("?", "Show this help"),
                        ("Escape", "Close dialogs"),
                    ] {
                        li {
                            class: "flex items-center justify-between gap-4",
                            span { class: "text-[var(--zd-text-secondary)]", "{desc}" }
                            kbd {
                                class: "zd-mono-label px-2 py-1 rounded-md border border-[var(--zd-border)] bg-[var(--zd-surface)] text-[var(--zd-text-muted)]",
                                "{keys}"
                            }
                        }
                    }
                }
            }
        }
    }
}
