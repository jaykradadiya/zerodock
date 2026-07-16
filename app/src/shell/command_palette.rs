use crate::registry::{find_tool, ToolDef};
use crate::router::route_for_path;
use crate::shell::ui::{Badge, BadgeVariant, IconSearch, Kbd, Modal, Overlay};
use crate::state::use_app_state;
use crate::landing::category_icon;
use dioxus::prelude::*;
use dioxus_router::Link;
use zerodock_platform::PlatformServices;

#[component]
pub fn CommandPalette() -> Element {
    let state = use_app_state();
    let platform = use_context::<PlatformServices>();
    let open = state.ui.read().command_palette_open;

    let route = use_route::<crate::router::Route>();
    let last_route = use_signal(|| route.clone());

    let state_for_effect = state.clone();
    use_effect(move || {
        let current = route.clone();
        let mut last = last_route;
        let mut state = state_for_effect.clone();
        if *last.read() != current {
            last.set(current);
            if state.ui.peek().command_palette_open {
                state.ui.write().command_palette_open = false;
            }
        }
    });

    let mut query = use_signal(String::new);
    let mut selected = use_signal(|| 0usize);

    // Auto-focus the search input when the palette opens so arrow keys work immediately
    let state_for_focus = state.clone();
    use_effect(move || {
        let is_open = state_for_focus.ui.read().command_palette_open;
        if is_open {
            spawn(async move {
                let _ = dioxus::document::eval(
                    r#"
                    setTimeout(() => {
                        const el = document.getElementById('cmd-k-input');
                        if (el) { el.focus(); el.select(); }
                    }, 30);
                    "#
                );
            });
        }
    });

    // Automatically scroll the active item into view on selection change
    use_effect(move || {
        let _sel = *selected.read();
        if state.ui.peek().command_palette_open {
            spawn(async move {
                let mut _eval = dioxus::document::eval(
                    r#"
                    setTimeout(() => {
                        const el = document.querySelector(".cmd-k-item-selected");
                        if (el) {
                            el.scrollIntoView({ block: "nearest" });
                        }
                    }, 10);
                    "#
                );
            });
        }
    });

    if !open {
        return VNode::empty();
    }

    let q = query.read().to_lowercase();
    let favorites = state.preferences.read().favorite_tools.clone();
    let recent = state.preferences.read().recent_tools.clone();

    let mut all_items: Vec<(&'static ToolDef, Option<&'static str>)> = Vec::new();
    let mut seen: std::collections::HashSet<&'static str> = std::collections::HashSet::new();

    if q.is_empty() {
        // Favourites first
        for id in &favorites {
            if let Some(t) = find_tool(id) {
                if !t.hidden_from_browse && seen.insert(t.id) {
                    let parent_name = t.hub_parent.and_then(|p_id| find_tool(p_id).map(|p| p.name));
                    all_items.push((t, parent_name));
                }
            }
        }
        // Recents (not already in favourites)
        for id in &recent {
            if let Some(t) = find_tool(id) {
                if !t.hidden_from_browse && seen.insert(t.id) {
                    let parent_name = t.hub_parent.and_then(|p_id| find_tool(p_id).map(|p| p.name));
                    all_items.push((t, parent_name));
                }
            }
        }
        // Remaining tools not yet shown
        for t in crate::registry::browse_tools() {
            if seen.insert(t.id) {
                all_items.push((t, None));
            }
        }
    } else {
        all_items.extend(crate::registry::search_tools(&q));
    }

    let total_items = all_items.len();
    if total_items > 0 && *selected.read() >= total_items {
        selected.set(0);
    }

    let mut state_for_close = state.clone();
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
                    class: "flex items-center gap-3 px-4 py-3 bg-[var(--zd-surface)] border-b border-[var(--zd-border)]",
                    // Search icon
                    span { class: "text-[var(--zd-text-muted)] shrink-0",
                        IconSearch {}
                    }
                    input {
                        id: "cmd-k-input",
                        class: "flex-1 bg-transparent text-[var(--zd-text-primary)] text-sm focus:outline-none placeholder:text-[var(--zd-text-muted)] font-medium",
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
                                    if let Some((tool, _)) = all_items.get(*selected.read()) {
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
                    class: "max-h-[min(380px,60vh)] overflow-y-auto custom-scrollbar p-2 flex flex-col gap-1 bg-[var(--zd-surface)]",
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
                    for (i, (tool, parent_name)) in all_items.iter().enumerate() {
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
                                        "flex items-center gap-3 px-3 py-2.5 rounded-lg bg-[var(--zd-surface-raised)] border border-[var(--zd-primary)] text-[var(--zd-text-primary)] transition-all cursor-pointer shadow-sm cmd-k-item-selected"
                                    } else {
                                        "flex items-center gap-3 px-3 py-2.5 rounded-lg border border-transparent hover:bg-[var(--zd-surface-hover)] text-[var(--zd-text-secondary)] transition-all cursor-pointer"
                                    },
                                    onclick: move |_| record_visit_and_close(row_state.clone(), row_platform.clone(), tool_id),

                                    // Category Character Icon
                                    span {
                                        class: "w-7 h-7 rounded bg-[var(--zd-surface-sunken)] border border-[var(--zd-border)] flex items-center justify-center text-[10px] font-mono text-[var(--zd-text-muted)] transition-colors shrink-0",
                                        style: if is_selected { "border-color: var(--zd-primary); color: var(--zd-primary);" } else { "" },
                                        "{category_icon(tool.category)}"
                                    }

                                    // Content
                                    div { class: "flex-1 min-w-0",
                                        div {
                                            class: "flex items-baseline gap-2 flex-wrap",
                                            span {
                                                class: "text-sm font-semibold truncate",
                                                style: if is_selected { "color: var(--zd-primary);" } else { "color: var(--zd-text-primary);" },
                                                "{tool.name}"
                                            }
                                            if let Some(hub) = parent_name {
                                                span { class: "text-[9px] font-mono text-[var(--zd-text-muted)]", "in {hub}" }
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

                                    // Right side details
                                    div {
                                        class: "flex items-center gap-2 shrink-0",
                                        Badge { variant: BadgeVariant::Muted, "{tool.category}" }
                                        if is_selected {
                                            span {
                                                class: "text-[10px] font-mono text-[var(--zd-text-muted)] px-1.5 py-0.5 rounded border border-[var(--zd-border)] bg-[var(--zd-surface-sunken)] select-none",
                                                "↵"
                                            }
                                        }
                                    }
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
