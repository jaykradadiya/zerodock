use crate::registry::{all_tools, find_tool, ToolDef};
use crate::router::route_for_path;
use crate::shell::empty_state::EmptyState;
use crate::shell::ui::{Badge, BadgeVariant, IconSearch, Kbd, Modal, Overlay};
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
            if let Some(t) = find_tool(id) { all_items.push(t); }
        }
        for id in &recent {
            if let Some(t) = find_tool(id) {
                if !favorites.contains(id) { all_items.push(t); }
            }
        }
        all_items.extend(all_tools());
    } else {
        all_items.extend(all_tools().filter(|t| {
            t.name.to_lowercase().contains(&q)
                || t.id.contains(&q)
                || t.category.to_lowercase().contains(&q)
                || t.description.to_lowercase().contains(&q)
        }));
    }

    // Deduplicate (favorites+recent may re-appear in all_tools)
    all_items.dedup_by_key(|t| t.id);

    let total_items = all_items.len();
    if total_items > 0 && *selected.read() >= total_items {
        selected.set(0);
    }

    let mut state_for_close = state.clone();
    let platform_for_close = platform.clone();
    let mut state_for_keys = state.clone();
    let platform_for_keys = platform.clone();

    rsx! {
        Overlay {
            on_close: move |_| state_for_close.ui.write().command_palette_open = false,
            align: crate::shell::ui::OverlayAlign::Top,
            z: "--zd-z-overlay",
            Modal {
                max_width: "max-w-xl",
                aria_label: Some("Command palette".to_string()),

                // Search input row
                div {
                    class: "flex items-center gap-3 px-4 py-3 border-b border-[var(--zd-border)]",
                    // Search icon
                    span { class: "text-[var(--zd-text-muted)] shrink-0",
                        IconSearch {}
                    }
                    input {
                        class: "flex-1 bg-transparent text-[var(--zd-text-primary)] text-sm focus:outline-none placeholder:text-[var(--zd-text-muted)]",
                        placeholder: "Search tools…",
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
                                Key::Tab => {
                                    e.prevent_default();
                                    if total_items > 0 {
                                        let current = *selected.read();
                                        if e.modifiers().shift() {
                                            selected.set(if current == 0 { total_items - 1 } else { current - 1 });
                                        } else {
                                            selected.set((current + 1) % total_items);
                                        }
                                    }
                                }
                                _ => {}
                            }
                        },
                    }
                    Kbd { "esc" }
                }

                // Results list
                div {
                    class: "max-h-[min(340px,60vh)] overflow-y-auto custom-scrollbar",
                    if total_items == 0 {
                        div {
                            class: "py-12 flex flex-col items-center gap-2.5",
                            span {
                                class: "zd-icon-ring w-9 h-9 flex items-center justify-center text-sm font-mono",
                                "?"
                            }
                            p { class: "text-sm text-[var(--zd-text-secondary)]", "No tools match your search" }
                        }
                    }
                    for (i, tool) in all_items.iter().enumerate() {
                        {
                            let is_selected = i == *selected.read();
                            let route = route_for_path(tool.route);
                            let tool_id = tool.id;
                            let row_state = state.clone();
                            let row_platform = platform.clone();
                            let is_fav = favorites.contains(&tool_id.to_string());
                            let is_recent = !is_fav && recent.contains(&tool_id.to_string());
                            rsx! {
                                Link {
                                    to: route,
                                    class: if is_selected {
                                        "flex items-center gap-3 px-4 py-3 bg-[var(--zd-primary-soft)] border-b border-[var(--zd-border)] last:border-0 transition-colors"
                                    } else {
                                        "flex items-center gap-3 px-4 py-3 hover:bg-[var(--zd-surface-raised)] border-b border-[var(--zd-border)] last:border-0 transition-colors"
                                    },
                                    onclick: move |_| record_visit_and_close(row_state.clone(), row_platform.clone(), tool_id),

                                    // Left accent indicator
                                    div {
                                        class: "w-1 h-6 rounded-full shrink-0",
                                        style: if is_selected { "background: var(--zd-primary);" } else { "background: var(--zd-border);" }
                                    }

                                    // Content
                                    div { class: "flex-1 min-w-0",
                                        div {
                                            class: "flex items-center gap-2",
                                            span {
                                                class: "text-sm font-medium text-[var(--zd-text-primary)] truncate",
                                                style: if is_selected { "color: var(--zd-primary);" } else { "" },
                                                "{tool.name}"
                                            }
                                            if is_fav {
                                                Badge { variant: BadgeVariant::Accent, "fav" }
                                            }
                                            if is_recent {
                                                Badge { variant: BadgeVariant::Muted, "recent" }
                                            }
                                        }
                                        p {
                                            class: "text-xs text-[var(--zd-text-muted)] truncate mt-0.5",
                                            "{tool.description}"
                                        }
                                    }

                                    // Category badge
                                    Badge { variant: BadgeVariant::Muted, "{tool.category}" }
                                }
                            }
                        }
                    }
                }

                // Footer
                if total_items > 0 {
                    div {
                        class: "flex items-center justify-between px-4 py-2 border-t border-[var(--zd-border)] bg-[var(--zd-surface-raised)]",
                        p {
                            class: "text-[10px] font-mono text-[var(--zd-text-muted)]",
                            "{total_items} tools"
                        }
                        div {
                            class: "flex items-center gap-3 text-[10px] font-mono text-[var(--zd-text-muted)]",
                            span { "↑↓ navigate" }
                            span { "↵ open" }
                        }
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
