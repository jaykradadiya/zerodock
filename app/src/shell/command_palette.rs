use crate::registry::{all_tools, find_tool, ToolDef};
use crate::router::route_for_path;
use crate::shell::empty_state::EmptyState;
use crate::state::use_app_state;
use dioxus::prelude::*;
use dioxus_router::Link;
use zerodock_platform::PlatformServices;

#[component]
pub fn CommandPalette() -> Element {
    let mut state = use_app_state();
    let platform = use_context::<PlatformServices>();
    let open = state.ui.read().command_palette_open;
    if !open {
        return VNode::empty();
    }

    let mut query = use_signal(String::new);
    let mut selected = use_signal(|| 0usize);
    let q = query.read().to_lowercase();
    let favorites = state.preferences.read().favorite_tools.clone();
    let recent = state.preferences.read().recent_tools.clone();

    let mut all_items: Vec<&'static ToolDef> = Vec::new();
    if q.is_empty() {
        for id in &favorites {
            if let Some(t) = find_tool(id) {
                all_items.push(t);
            }
        }
        for id in &recent {
            if let Some(t) = find_tool(id) {
                if !favorites.contains(id) {
                    all_items.push(t);
                }
            }
        }
        all_items.extend(all_tools());
    } else {
        all_items.extend(all_tools().filter(|t| {
            t.name.to_lowercase().contains(&q)
                || t.id.contains(&q)
                || t.category.to_lowercase().contains(&q)
        }));
    }

    let total_items = all_items.len();
    if total_items > 0 && *selected.read() >= total_items {
        selected.set(0);
    }

    // Clones for move closures inside the rsx tree (root handlers)
    let mut state_for_close = state.clone();
    let platform_for_close = platform.clone();
    let mut state_for_keys = state.clone();
    let platform_for_keys = platform.clone();

    rsx! {
        div {
            class: "fixed inset-0 z-[var(--zd-z-overlay)] flex items-start justify-center pt-[15vh] px-4",
            onclick: move |_| state_for_close.ui.write().command_palette_open = false,
            div { class: "absolute inset-0 bg-black/60 backdrop-blur-sm" }
            div {
                class: "relative w-full max-w-lg rounded-lg border border-[var(--zd-border)] bg-[var(--zd-surface-raised)] shadow-[var(--zd-shadow-lg)] overflow-hidden",
                role: "dialog",
                aria_modal: "true",
                aria_label: "Command palette",
                onclick: move |e| e.stop_propagation(),
                div {
                    class: "flex items-center gap-2 px-4 py-3 border-b border-[var(--zd-border)]",
                    crate::shell::ui::IconSearch {}
                    input {
                        class: "flex-1 bg-transparent text-[var(--zd-text-primary)] focus:outline-none text-sm",
                        placeholder: "Search tools...",
                        aria_label: "Search tools",
                        autofocus: true,
                        value: "{query}",
                        oninput: move |e: Event<FormData>| {
                            query.set(e.value());
                            selected.set(0);
                        },
                        onkeydown: move |e| {
                            match e.key() {
                                Key::Escape => state_for_keys.ui.write().command_palette_open = false,
                                Key::ArrowDown => {
                                    e.prevent_default();
                                    if total_items > 0 {
                                        let current = *selected.read();
                                        selected.set((current + 1) % total_items);
                                    }
                                }
                                Key::ArrowUp => {
                                    e.prevent_default();
                                    if total_items > 0 {
                                        let current = *selected.read();
                                        selected.set(if current == 0 { total_items - 1 } else { current - 1 });
                                    }
                                }
                                Key::Enter => {
                                    e.prevent_default();
                                    if let Some(tool) = all_items.get(*selected.read()) {
                                        record_visit_and_close(state_for_keys.clone(), platform_for_keys.clone(), tool.id);
                                    }
                                }
                                _ => {}
                            }
                        },
                    }
                    span { class: "zd-mono-label text-[var(--zd-text-muted)]", "esc" }
                }
                div {
                    class: "max-h-80 overflow-y-auto custom-scrollbar",
                    if total_items == 0 {
                        EmptyState {
                            icon: "?",
                            title: "No tools found",
                            hint: "Try a different search term.",
                        }
                    }
                    for (i, tool) in all_items.iter().enumerate() {
                        {
                            let is_selected = i == *selected.read();
                            let route = route_for_path(tool.route);
                            let tool_id = tool.id;
                            let row_state = state.clone();
                            let row_platform = platform.clone();
                            rsx! {
                                Link {
                                    to: route,
                                    class: if is_selected {
                                        "block px-4 py-3 bg-[var(--zd-primary-soft)] border-b border-[var(--zd-border)] last:border-0 transition-colors"
                                    } else {
                                        "block px-4 py-3 hover:bg-[var(--zd-primary-soft)] border-b border-[var(--zd-border)] last:border-0 transition-colors"
                                    },
                                    onclick: move |_| record_visit_and_close(row_state.clone(), row_platform.clone(), tool_id),
                                    div {
                                        class: "flex items-center justify-between gap-2",
                                        div {
                                            class: "font-medium text-[var(--zd-text-primary)]",
                                            "{tool.name}"
                                        }
                                        span {
                                            class: "zd-mono-label text-[var(--zd-text-muted)]",
                                            "{tool.category}"
                                        }
                                    }
                                    div {
                                        class: "text-xs text-[var(--zd-text-muted)] mt-0.5",
                                        "{tool.description}"
                                    }
                                }
                            }
                        }
                    }
                }
                if total_items > 0 {
                    p {
                        class: "px-4 py-2 text-xs text-[var(--zd-text-muted)] border-t border-[var(--zd-border)] zd-mono-label",
                        "{total_items} tools · ↑↓ navigate · Enter open"
                    }
                }
            }
        }
    }
}

fn record_visit_and_close(mut state: crate::state::AppState, platform: PlatformServices, tool_id: &str) {
    state.record_tool_visit(tool_id);
    state.ui.write().command_palette_open = false;
    let prefs = state.preferences.read().clone();
    spawn(async move {
        crate::persistence::save_preferences(&platform, &prefs).await;
    });
}
