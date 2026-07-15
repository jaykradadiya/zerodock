use crate::shell::ui::{IconButton, IconSearch, Kbd};
use crate::state::use_app_state;
use dioxus::prelude::*;
use dioxus_router::Link;

#[component]
pub fn Navbar() -> Element {
    let mut state = use_app_state();
    if state.ui.read().zen_mode {
        return VNode::empty();
    }
    let is_mac = detect_mac();

    rsx! {
        nav {
            class: "sticky top-0 z-[var(--zd-z-sticky)] border-b border-[var(--zd-border)] backdrop-blur-md saturate-150 shrink-0",
            style: "background: var(--zd-nav-bg);",

            div {
                class: "max-w-6xl mx-auto px-6 lg:px-10 h-12 flex items-center justify-between gap-4",

                // Logo
                Link {
                    to: crate::router::Route::Landing {},
                    class: "flex items-center gap-2 text-[var(--zd-text-primary)] shrink-0 no-underline group",
                    img {
                        src: asset!("/assets/zerodock_logo.svg"),
                        alt: "ZeroDock",
                        class: "w-6 h-6",
                    }
                    span {
                        class: "text-sm font-semibold tracking-tight text-[var(--zd-text-primary)] group-hover:text-[var(--zd-primary)] transition-colors",
                        style: "letter-spacing: -0.02em;",
                        "ZeroDock"
                    }
                }

                // Actions
                div {
                    class: "flex items-center gap-1.5",

                    // Search / command palette trigger
                    button {
                        class: "group inline-flex items-center gap-2 h-8 pl-2.5 pr-1.5 rounded-md border border-[var(--zd-border)] bg-[var(--zd-surface)] text-[var(--zd-text-muted)] text-xs hover:border-[var(--zd-border-hover)] hover:bg-[var(--zd-surface-raised)] transition-colors focus-ring btn-micro hidden sm:inline-flex w-52 justify-between",
                        aria_label: "Open command palette",
                        onclick: move |_| state.ui.write().command_palette_open = true,
                        span { class: "inline-flex items-center gap-2 group-hover:text-[var(--zd-text-secondary)] transition-colors",
                            IconSearch {}
                            span { "Search tools" }
                        }
                        Kbd {
                            if is_mac { "⌘K" } else { "Ctrl K" }
                        }
                    }

                    // Mobile search button
                    IconButton {
                        label: "Open command palette".to_string(),
                        onclick: {
                            let mut state = state.clone();
                            Some(EventHandler::new(move |_| {
                                state.ui.write().command_palette_open = true
                            }))
                        },
                        class: "sm:hidden",
                        IconSearch {}
                    }

                    // Settings (theme toggle lives inside Preferences)
                    IconButton {
                        label: "Preferences".to_string(),
                        onclick: {
                            let mut state = state.clone();
                            Some(EventHandler::new(move |_| state.ui.write().preferences_open = true))
                        },
                        IconGear {}
                    }
                }
            }
        }
    }
}

#[component]
fn IconGear() -> Element {
    rsx! {
        svg {
            width: "15", height: "15",
            fill: "none", stroke: "currentColor",
            stroke_width: "1.75",
            stroke_linecap: "round", stroke_linejoin: "round",
            view_box: "0 0 24 24",
            path { d: "M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" }
            circle { cx: "12", cy: "12", r: "3" }
        }
    }
}

fn detect_mac() -> bool {
    #[cfg(target_arch = "wasm32")]
    {
        web_sys::window()
            .and_then(|w| w.navigator().platform().ok())
            .map(|p| p.contains("Mac") || p.contains("iPhone") || p.contains("iPad"))
            .unwrap_or(false)
    }
    #[cfg(not(target_arch = "wasm32"))]
    { cfg!(target_os = "macos") }
}
