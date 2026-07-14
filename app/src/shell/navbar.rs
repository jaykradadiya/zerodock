use crate::shell::ui::{Button, ButtonVariant, IconButton, IconMoon, IconSearch, IconSun};
use crate::state::use_app_state;
use dioxus::prelude::*;
use dioxus_router::Link;

#[component]
pub fn Navbar() -> Element {
    let mut state = use_app_state();
    let platform = use_context::<zerodock_platform::PlatformServices>();
    if state.ui.read().zen_mode {
        return VNode::empty();
    }
    let is_dark = state.preferences.read().is_dark();
    let is_mac = detect_mac();

    rsx! {
        nav {
            class: "sticky top-0 z-[var(--zd-z-sticky)] border-b border-[var(--zd-border)] backdrop-blur-md saturate-150 shrink-0",
            style: "background: var(--zd-nav-bg);",
            div {
                class: "max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4",
                Link {
                    to: crate::router::Route::Landing {},
                    class: "flex items-center gap-2.5 text-[var(--zd-text-primary)] shrink-0 no-underline",
                    img {
                        src: asset!("/assets/zerodock_logo.svg"),
                        alt: "ZeroDock",
                        class: "w-7 h-7",
                    }
                    span {
                        class: "hidden sm:inline font-display font-bold text-lg tracking-tight",
                        "ZeroDock"
                    }
                }
                div {
                    class: "flex items-center gap-1.5 ml-auto",
                    Button {
                        variant: ButtonVariant::Ghost,
                        class: "font-mono text-xs gap-1.5",
                        aria_label: Some("Open command palette".to_string()),
                        onclick: move |_| state.ui.write().command_palette_open = true,
                        IconSearch {}
                        span { class: "hidden sm:inline", "Search" }
                        span { class: "hidden md:inline text-[var(--zd-text-muted)]", if is_mac { "⌘K" } else { "Ctrl K" } }
                    }
                    a {
                        href: "https://github.com/jayradadiya/ZeroDock",
                        target: "_blank",
                        rel: "noopener noreferrer",
                        class: "hidden md:flex items-center justify-center h-9 px-3 rounded-md border border-[var(--zd-border)] hover:border-[var(--zd-border-hover)] bg-[var(--zd-surface-raised)] text-[var(--zd-text-primary)] text-xs font-semibold overflow-hidden transition-colors gap-1.5 hover:text-[var(--zd-primary)]",
                        IconGithub {}
                        span { "GitHub" }
                    }
                    IconButton {
                        label: if is_dark { "Switch to light mode".to_string() } else { "Switch to dark mode".to_string() },
                        onclick: {
                            let mut state = state.clone();
                            let platform = platform.clone();
                            move |_| {
                                state.toggle_theme();
                                let prefs = state.preferences.read().clone();
                                let platform = platform.clone();
                                spawn(async move {
                                    crate::persistence::save_preferences(&platform, &prefs).await;
                                });
                            }
                        },
                        if is_dark {
                            IconSun {}
                        } else {
                            IconMoon {}
                        }
                    }
                    IconButton {
                        label: "Preferences & Profile".to_string(),
                        onclick: {
                            let mut state = state.clone();
                            move |_| state.ui.write().preferences_open = true
                        },
                        IconGear {}
                    }
                }
            }
        }
    }
}

#[component]
fn IconGithub() -> Element {
    rsx! {
        svg {
            width: "14",
            height: "14",
            fill: "currentColor",
            view_box: "0 0 24 24",
            path { d: "M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" }
        }
    }
}

#[component]
fn IconGear() -> Element {
    rsx! {
        svg {
            width: "16",
            height: "16",
            fill: "none",
            stroke: "currentColor",
            stroke_width: "1.75",
            stroke_linecap: "round",
            stroke_linejoin: "round",
            view_box: "0 0 24 24",
            path { d: "M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" }
            circle { cx: "12", cy: "12", r: "3" }
        }
    }
}

/// Detect macOS so the navbar shows ⌘K vs Ctrl K.
fn detect_mac() -> bool {
    #[cfg(target_arch = "wasm32")]
    {
        web_sys::window()
            .and_then(|w| w.navigator().platform().ok())
            .map(|p| p.contains("Mac") || p.contains("iPhone") || p.contains("iPad"))
            .unwrap_or(false)
    }
    #[cfg(not(target_arch = "wasm32"))]
    {
        cfg!(target_os = "macos")
    }
}
