use crate::registry::{hub_children, CATEGORIES, ToolTier};
use crate::router::{route_for_path, Route};
use crate::shell::ui::{Badge, BadgeVariant, IconSearch};
use crate::state::use_app_state;
use dioxus::prelude::*;
use dioxus_router::Link;

pub(crate) fn category_icon(category: &str) -> &'static str {
    match category {
        "Data"       => "{}",
        "Network"    => "⇄",
        "Encoding"   => "#",
        "Security"   => "⌀",
        "Text"       => "Aa",
        "Converters" => "↔",
        "Generators" => "∗",
        _            => "·",
    }
}

#[allow(dead_code)]
fn category_color(category: &str) -> &'static str {
    match category {
        "Data"       => "var(--zd-accent)",
        "Network"    => "var(--zd-info)",
        "Encoding"   => "var(--zd-primary)",
        "Security"   => "var(--zd-error)",
        "Text"       => "var(--zd-primary)",
        "Converters" => "var(--zd-info)",
        "Generators" => "var(--zd-warning)",
        _            => "var(--zd-primary)",
    }
}

#[derive(Clone, PartialEq)]
struct DetectedPayload {
    label: &'static str,
    target_name: &'static str,
    route: Route,
    explanation: &'static str,
    confidence: &'static str,
    color: &'static str,
}

fn analyze_smart_paste(text: &str) -> Option<DetectedPayload> {
    let t = text.trim();
    if t.is_empty() { return None; }

    if t.starts_with("eyJ") && t.split('.').count() == 3 {
        return Some(DetectedPayload {
            label: "JWT Token",
            target_name: "Inspect & Codec Studio",
            route: Route::JwtDecoder {},
            explanation: "3-part base64url JSON Web Token detected.",
            confidence: "99%",
            color: "var(--zd-primary)",
        });
    }
    if (t.starts_with('{') && t.ends_with('}')) || (t.starts_with('[') && t.ends_with(']')) {
        if serde_json::from_str::<serde_json::Value>(t).is_ok()
            || zerodock_indexer::JsonIndex::from_bytes(t.as_bytes()).is_ok()
        {
            return Some(DetectedPayload {
                label: "JSON Document",
                target_name: "JSON & Data Studio",
                route: Route::JsonToolkit {},
                explanation: "Valid JSON object/array detected.",
                confidence: "98%",
                color: "var(--zd-accent)",
            });
        }
    }
    if t.len() >= 10 && t.len() <= 13 && t.chars().all(|c| c.is_ascii_digit()) {
        return Some(DetectedPayload {
            label: "Unix Timestamp",
            target_name: "Epoch Converter",
            route: Route::EpochConverter {},
            explanation: "Numeric epoch in seconds/milliseconds.",
            confidence: "95%",
            color: "var(--zd-warning)",
        });
    }
    if t.contains("%20") || t.contains("%3A") || t.contains("%2F") || t.contains("%3D") {
        return Some(DetectedPayload {
            label: "URL Encoded String",
            target_name: "Inspect & Codec Studio",
            route: Route::UrlEncoder {},
            explanation: "URL percent-encoding entities detected.",
            confidence: "90%",
            color: "var(--zd-info)",
        });
    }
    if t.len() >= 20
        && t.chars().all(|c| c.is_ascii_alphanumeric() || c == '+' || c == '/' || c == '=' || c == '-' || c == '_')
        && !t.contains(' ')
    {
        return Some(DetectedPayload {
            label: "Base64 Payload",
            target_name: "Inspect & Codec Studio",
            route: Route::Base64Codec {},
            explanation: "Base64/base64url character set detected.",
            confidence: "85%",
            color: "var(--zd-primary)",
        });
    }
    None
}

#[component]
pub fn LandingPage() -> Element {
    let state = use_app_state();
    let mut search = use_signal(String::new);
    let mut category_filters = use_signal(Vec::<String>::new); // Empty = All
    let mut smart_paste_input = use_signal(String::new);
    let nav = use_navigator();
    let query = search.read().clone();
    let active_categories = category_filters.read().clone();
    let tool_count = crate::registry::browse_tools().count();
    let detected = analyze_smart_paste(&smart_paste_input.read());

    // Combined, filtered tool list (search text + category chips)
    let q = query.trim().to_lowercase();
    let visible_tools: Vec<&'static crate::registry::ToolDef> = crate::registry::browse_tools()
        .filter(|t| active_categories.is_empty() || active_categories.iter().any(|cat| cat.as_str() == t.category))
        .filter(|t| {
            if q.is_empty() {
                return true;
            }
            let child_hit = hub_children(t.id)
                .iter()
                .any(|c| c.name.to_lowercase().contains(&q) || c.id.contains(&q));
            t.name.to_lowercase().contains(&q)
                || t.id.contains(&q)
                || t.category.to_lowercase().contains(&q)
                || t.description.to_lowercase().contains(&q)
                || child_hit
        })
        .collect();

    rsx! {
        div {
            class: "h-full overflow-y-auto flex flex-col relative custom-scrollbar",

            // ── HERO (centered, flat — itspdftools-style) ──────────────────
            section {
                class: "relative shrink-0 border-b border-[var(--zd-border)] overflow-hidden flex flex-col items-center justify-center min-h-[calc(100vh-3rem)]",
                div {
                    class: "absolute inset-0 opacity-[0.05] pointer-events-none",
                    style: "background-image: linear-gradient(var(--zd-primary) 1px, transparent 1px), linear-gradient(90deg, var(--zd-primary) 1px, transparent 1px); background-size: 40px 40px; mask-image: radial-gradient(ellipse at center, black 40%, transparent 80%); -webkit-mask-image: radial-gradient(ellipse at center, black 40%, transparent 80%);"
                }

                div {
                    class: "relative max-w-3xl mx-auto w-full px-6 py-12 md:py-16 flex flex-col items-center text-center",

                    h1 {
                        class: "zd-rise font-display text-[var(--zd-text-primary)] leading-[1.05] mb-6",
                        style: "font-size: clamp(2.25rem, 5vw, 3.5rem); letter-spacing: -0.03em;",
                        "Developer tools that never leave "
                        span {
                            style: "background: linear-gradient(135deg, var(--zd-primary) 0%, var(--zd-accent) 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent;",
                            "your machine."
                        }
                    }
                    p {
                        class: "zd-rise text-lg text-[var(--zd-text-secondary)] max-w-xl leading-relaxed mb-6",
                        span { class: "text-[var(--zd-text-primary)]", "{tool_count} tools" }
                        " to format, encode, hash, diff, and test — 100% local, no telemetry, no accounts."
                    }

                    // Privacy checkmarks (itspdftools-style trust badges)
                    div {
                        class: "zd-rise flex flex-wrap items-center justify-center gap-x-5 gap-y-2 mb-10",
                        span {
                            class: "inline-flex items-center gap-1.5 text-sm text-[var(--zd-text-secondary)]",
                            span { style: "color: var(--zd-accent);", IconCheck {} }
                            "No login"
                        }
                        span {
                            class: "inline-flex items-center gap-1.5 text-sm text-[var(--zd-text-secondary)]",
                            span { class: "w-2 h-2 rounded-full bg-[var(--zd-success)] animate-pulse inline-block" }
                            "100% private"
                        }
                        span {
                            class: "inline-flex items-center gap-1.5 text-sm text-[var(--zd-text-secondary)]",
                            span { style: "color: var(--zd-accent);", IconCheck {} }
                            "Free forever"
                        }
                    }

                    // ── Smart paste — centered drop zone (the fast path) ────
                    div {
                        class: "zd-rise-delay-1 w-full",
                        div {
                            class: "rounded-lg border bg-[var(--zd-surface)] overflow-hidden transition-all duration-300 text-left",
                            style: if let Some(d) = &detected {
                                format!("border-color: {}; box-shadow: 0 0 20px color-mix(in srgb, {} 12%, transparent);", d.color, d.color)
                            } else if !smart_paste_input.read().is_empty() {
                                "border-color: var(--zd-border-hover); box-shadow: var(--zd-shadow-md);".to_string()
                            } else {
                                "border-color: var(--zd-border);".to_string()
                            },

                            // Toolbar row
                            div {
                                class: "flex items-center gap-2 px-4 py-2.5 border-b border-[var(--zd-border)] bg-[var(--zd-surface-raised)]",
                                span {
                                    class: "zd-icon-ring inline-flex items-center justify-center w-6 h-6 shrink-0",
                                    IconPaste {}
                                }
                                span { class: "zd-mono-label", style: "color: var(--zd-text-secondary);", "Smart paste" }
                                span { class: "flex-1" }
                                button {
                                    class: "inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-[var(--zd-border)] bg-[var(--zd-surface)] text-[10px] font-mono text-[var(--zd-text-secondary)] hover:text-[var(--zd-text-primary)] hover:border-[var(--zd-border-hover)] transition-colors focus-ring cursor-pointer",
                                    onclick: move |_| {
                                        let mut smart_paste_input = smart_paste_input.clone();
                                        spawn(async move {
                                            if let Some(text) = crate::shell::ui::read_from_clipboard().await {
                                                smart_paste_input.set(text);
                                            }
                                        });
                                    },
                                    IconPaste {}
                                    "Paste Clipboard"
                                }
                                span {
                                    class: "text-[10px] font-mono text-[var(--zd-text-muted)] hidden sm:inline ml-2",
                                    "Paste anything — we'll open the right tool"
                                }
                            }

                            textarea {
                                class: "w-full px-4 py-4 text-sm font-mono bg-transparent text-[var(--zd-text-primary)] placeholder-[var(--zd-text-muted)] focus:outline-none resize-none custom-scrollbar",
                                style: "min-height: 8rem; max-height: 14rem;",
                                placeholder: "Paste a JWT, cURL command, JSON, Unix timestamp, URL-encoded or Base64 string…",
                                value: "{smart_paste_input}",
                                aria_label: "Smart paste input",
                                oninput: move |e: Event<FormData>| smart_paste_input.set(e.value()),
                                onkeydown: {
                                    let mut state = state.clone();
                                    let smart_paste_input = smart_paste_input.clone();
                                    let nav = nav.clone();
                                    move |e: Event<KeyboardData>| {
                                        if e.key() == Key::Enter && !e.modifiers().contains(Modifiers::SHIFT) {
                                            if let Some(d) = analyze_smart_paste(&smart_paste_input.read()) {
                                                e.prevent_default();
                                                let key = route_key_for_route(&d.route);
                                                if !key.is_empty() {
                                                    state.tool_states.write().insert(key.to_string(), smart_paste_input.read().clone());
                                                }
                                                nav.push(d.route);
                                            }
                                        }
                                    }
                                }
                            }

                            // Detection result / hint footer
                            if let Some(d) = &detected {
                                div {
                                    class: "flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 border-t border-[var(--zd-border)]",
                                    style: "background: color-mix(in srgb, {d.color} 4%, var(--zd-surface)); border-top-color: color-mix(in srgb, {d.color} 15%, var(--zd-border));",
                                    div { class: "flex flex-col gap-0.5 min-w-0",
                                        div { class: "flex items-center gap-2",
                                            span {
                                                class: "w-1.5 h-1.5 rounded-full shrink-0 animate-ping",
                                                style: "background: {d.color};"
                                            }
                                            span {
                                                class: "text-xs font-mono font-semibold text-[var(--zd-text-primary)]",
                                                "{d.label} detected"
                                            }
                                            span {
                                                class: "text-[10px] font-mono font-bold px-1.5 py-0.5 rounded",
                                                style: "background: color-mix(in srgb, {d.color} 12%, transparent); color: {d.color}; border: 1px solid color-mix(in srgb, {d.color} 20%, transparent);",
                                                "{d.confidence} match"
                                            }
                                        }
                                        p {
                                            class: "text-xs font-semibold ml-3.5 mt-0.5",
                                            style: "color: {d.color};",
                                            "Open {d.target_name}"
                                        }
                                    }
                                    button {
                                        class: "flex items-center justify-center gap-1.5 px-4 py-2 rounded text-xs font-semibold text-[var(--zd-surface-sunken)] shrink-0 transition-all cursor-pointer focus-ring shadow-sm hover:brightness-110 active:scale-[0.98]",
                                        style: "background: {d.color}; color: var(--zd-bg);",
                                        onclick: {
                                            let d = d.clone();
                                            let smart_paste_input = smart_paste_input.clone();
                                            let mut state = state.clone();
                                            let nav = nav.clone();
                                            move |_| {
                                                let key = route_key_for_route(&d.route);
                                                if !key.is_empty() {
                                                    state.tool_states.write().insert(key.to_string(), smart_paste_input.read().clone());
                                                }
                                                nav.push(d.route.clone());
                                            }
                                        },
                                        "Launch Studio"
                                        IconArrowRight {}
                                    }
                                }
                            } else if !smart_paste_input.read().trim().is_empty() {
                                div {
                                    class: "flex items-center gap-2 px-4 py-3 border-t border-[var(--zd-border)]",
                                    span { class: "w-1.5 h-1.5 rounded-full shrink-0", style: "background: var(--zd-text-muted);" }
                                    span { class: "text-xs font-mono text-[var(--zd-text-muted)]", "Unrecognized format — try search or browse studios below." }
                                }
                            } else {
                                div {
                                    class: "px-4 py-3 border-t border-[var(--zd-border)]",
                                    p {
                                        class: "text-xs text-[var(--zd-text-muted)]",
                                        "Detects JWT · cURL · JSON · timestamp · URL-encoded · Base64 — and opens the right tool."
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // ── TOOLS — combined list, filter + search ─────────────────────
            section {
                id: "tools",
                class: "max-w-6xl mx-auto px-6 lg:px-10 pt-16 pb-20 w-full flex-1",

                // Header
                div {
                    class: "mb-6",
                    h2 {
                        class: "font-display text-2xl text-[var(--zd-text-primary)]",
                        style: "letter-spacing: -0.02em;",
                        "All tools"
                    }
                    p {
                        class: "mt-1.5 text-sm text-[var(--zd-text-muted)]",
                        "{visible_tools.len()} of {tool_count} · filter by category or search by name"
                    }
                }

                // Toolbar: Redesigned segmented control on the left, aligned search input on the right
                div {
                    class: "flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-6 border-b border-[var(--zd-border)]",
                    div {
                        class: "inline-flex flex-wrap sm:flex-nowrap items-center p-0.5 rounded-lg bg-[var(--zd-surface-sunken)] border border-[var(--zd-border)] gap-0.5 max-w-full overflow-x-auto custom-scrollbar",
                        CategoryChip {
                            label: "All",
                            active: active_categories.is_empty(),
                            onclick: EventHandler::new(move |_| {
                                tracing::info!("ZeroDock: Clearing category filters");
                                category_filters.write().clear();
                            }),
                        }
                        for category in CATEGORIES {
                            {
                                let cat = *category;
                                let is_active = active_categories.iter().any(|x| x.as_str() == cat);
                                rsx! {
                                    CategoryChip {
                                        label: cat,
                                        active: is_active,
                                        onclick: EventHandler::new(move |_| {
                                            tracing::info!("ZeroDock: Category clicked: {}", cat);
                                            let mut filters = category_filters.write();
                                            if filters.len() != 1 || filters[0] != cat {
                                                filters.clear();
                                                filters.push(cat.to_string());
                                            }
                                            tracing::info!("ZeroDock: New active categories: {:?}", *filters);
                                        }),
                                    }
                                }
                            }
                        }
                    }
                    label {
                        class: "relative flex items-center w-full md:max-w-xs shrink-0",
                        span { class: "sr-only", "Search tools" }
                        span {
                            class: "absolute left-2.5 text-[var(--zd-text-muted)] pointer-events-none",
                            IconSearch {}
                        }
                        input {
                            id: "catalog-search-input",
                            class: "w-full pl-8 pr-8 h-8 rounded-md border border-[var(--zd-border)] bg-[var(--zd-surface)] text-xs text-[var(--zd-text-primary)] focus-ring placeholder:text-[var(--zd-text-muted)] transition-colors focus:border-[var(--zd-primary)]",
                            placeholder: "Search tools…",
                            value: "{search}",
                            oninput: move |e: Event<FormData>| search.set(e.value()),
                        }
                        span {
                            class: "absolute right-2.5 px-1.5 py-0.5 rounded text-[9px] font-mono border border-[var(--zd-border)] bg-[var(--zd-surface-raised)] text-[var(--zd-text-muted)] pointer-events-none hidden sm:inline-block",
                            "/"
                        }
                    }
                }

                // Combined results — banded by category (itspdftools-style)
                if visible_tools.is_empty() {
                    div {
                        class: "py-20 flex flex-col items-center gap-3 text-center",
                        span {
                            class: "zd-icon-ring w-10 h-10 flex items-center justify-center text-base font-mono",
                            "∅"
                        }
                        p { class: "text-sm text-[var(--zd-text-secondary)]", "No tools match your filters" }
                        button {
                            class: "text-xs font-medium text-[var(--zd-primary)] hover:underline focus-ring rounded",
                            onclick: move |_| {
                                search.set(String::new());
                                category_filters.write().clear();
                            },
                            "Clear filters"
                        }
                    }
                } else {
                    div {
                        class: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4",
                        for (idx, tool) in visible_tools.iter().enumerate() {
                            {
                                let parent_name = tool.hub_parent.and_then(|p_id| crate::registry::find_tool(p_id).map(|p| p.name));
                                rsx! {
                                    ToolCard { tool: *tool, hub_name: parent_name, index: idx }
                                }
                            }
                        }
                    }
                }
            }

            // ── VALUE PROPS — Redesigned premium cards grid ────────────────
            section {
                class: "border-t border-[var(--zd-border)] bg-[var(--zd-surface-soft)] shrink-0",
                div {
                    class: "max-w-6xl mx-auto px-6 lg:px-10 py-16 md:py-20",
                    div {
                        class: "max-w-2xl mb-12",
                        h2 {
                            class: "font-display text-[var(--zd-text-primary)] mb-3",
                            style: "font-size: clamp(1.75rem, 3vw, 2.25rem); letter-spacing: -0.025em;",
                            "Why people switch to ZeroDock"
                        }
                        p {
                            class: "text-sm text-[var(--zd-text-secondary)] leading-relaxed",
                            "Not another SaaS. Just tools that respect your data and your time."
                        }
                    }
                    div {
                        class: "grid grid-cols-1 md:grid-cols-3 gap-6",
                        ValuePropCard {
                            icon: rsx! { IconShield {} },
                            title: "Privacy by architecture",
                            body: "Every tool runs locally — in your browser via WebAssembly, or natively on desktop. No data is transmitted, stored, or logged. Your files never touch a server.",
                        }
                        ValuePropCard {
                            icon: rsx! { IconBolt {} },
                            title: "Instant performance",
                            body: "No round-trips, no loading spinners. Tools process data in-memory at native speed, with streaming and chunking for large files.",
                        }
                        ValuePropCard {
                            icon: rsx! { IconUserOff {} },
                            title: "No accounts, ever",
                            body: "No sign-up, no email, no tracking. Open the page, use the tool, close the tab. Open-source and auditable.",
                        }
                    }
                }
            }

            // ── FOOTER ─────────────────────────────────────────────────────
            footer {
                class: "border-t border-[var(--zd-border)] shrink-0",
                div {
                    class: "max-w-6xl mx-auto px-6 lg:px-10 py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3",
                    div {
                        class: "flex items-center gap-3",
                        img {
                            src: asset!("/assets/zerodock_logo.svg"),
                            alt: "",
                            class: "w-5 h-5 opacity-50",
                            aria_hidden: "true",
                        }
                        p {
                            class: "text-xs text-[var(--zd-text-muted)]",
                            "ZeroDock — client-side only. All processing happens locally."
                        }
                    }
                    p {
                        class: "text-xs font-mono text-[var(--zd-text-muted)]",
                        "Rust + Dioxus"
                    }
                }
            }
        }
    }
}

fn route_key_for_route(route: &Route) -> &'static str {
    match route {
        Route::JwtDecoder {}     => "jwt-decoder",
        Route::JsonToolkit {}    => "json-toolkit",
        Route::EpochConverter {} => "epoch-converter",
        Route::UrlEncoder {}     => "url-encoder",
        Route::Base64Codec {}    => "base64-codec",
        Route::YamlJsonConverter {} => "yaml-json-converter",
        Route::JsonTypeConverter {} => "json-type-converter",
        Route::JsonPath {}       => "json-path",
        Route::HashGenerator {}  => "hash-generator",
        Route::Security {}       => "hash-generator",
        Route::EncodeDecode {}   => "base64-codec",
        Route::DiffChecker {}    => "diff-checker",
        Route::RegexTester {}    => "regex-tester",
        _                        => "",
    }
}

#[component]
fn ToolCard(tool: &'static crate::registry::ToolDef, hub_name: Option<&'static str>, index: usize) -> Element {
    let route = route_for_path(tool.route);
    let featured = tool.tier == ToolTier::Featured;
    let icon = category_icon(tool.category);
    let children: Vec<_> = hub_children(tool.id);

    rsx! {
        Link {
            to: route,
            class: "zd-tool-card group animate-tile-fast hover:border-[var(--zd-border-hover)] hover:bg-[var(--zd-surface-hover)] transition-all duration-200 hover:-translate-y-0.5 shadow-sm hover:shadow-md",
            style: "animation-delay: {index * 25}ms; opacity: 0; animation-fill-mode: forwards;",

            // Top row: icon + featured badge
            div {
                class: "flex items-start justify-between gap-2",
                span {
                    class: "w-8 h-8 rounded-lg border border-[var(--zd-border)] bg-[var(--zd-surface-sunken)] text-xs font-mono text-[var(--zd-text-secondary)] flex items-center justify-center group-hover:text-[var(--zd-primary)] group-hover:border-[var(--zd-primary)] transition-colors shrink-0",
                    "{icon}"
                }
                if featured {
                    Badge { variant: BadgeVariant::Default, "Featured" }
                }
            }

            // Name + hub tag
            div { class: "flex items-baseline gap-2 flex-wrap mt-1",
                h3 {
                    class: "text-sm font-semibold text-[var(--zd-text-primary)] group-hover:text-[var(--zd-primary)] transition-colors leading-snug",
                    "{tool.name}"
                }
                if let Some(hub) = hub_name {
                    span { class: "text-[10px] font-mono text-[var(--zd-text-muted)]", "in {hub}" }
                }
            }

            // Description
            p {
                class: "text-xs text-[var(--zd-text-muted)] leading-relaxed line-clamp-2",
                "{tool.description}"
            }

            // Sub-tools (hub children)
            if !children.is_empty() {
                div { class: "flex flex-wrap gap-1 pt-1",
                    for child in &children {
                        Badge { variant: BadgeVariant::Muted, "{child.name}" }
                    }
                }
            }

            // Footer — explicit primary action reveal on hover
            div {
                class: "flex items-center justify-end gap-2 mt-auto pt-3 border-t border-[var(--zd-border)] opacity-0 group-hover:opacity-100 transition-opacity duration-200",
                span {
                    class: "inline-flex items-center gap-1 text-[10px] font-mono text-[var(--zd-text-muted)] group-hover:text-[var(--zd-primary)] transition-colors",
                    "Launch now"
                    IconArrowRight {}
                }
            }
        }
    }
}

// ── CategoryChip ────────────────────────────────────────────────────────────

#[component]
fn CategoryChip(label: &'static str, active: bool, onclick: EventHandler<MouseEvent>) -> Element {
    let class = if active {
        "inline-flex items-center h-7 px-3 rounded-md text-xs font-semibold border border-[var(--zd-primary)] bg-[var(--zd-surface-raised)] text-[var(--zd-primary)] shadow-sm transition-all scale-[1.01]"
    } else {
        "inline-flex items-center h-7 px-3 rounded-md text-xs font-medium border border-transparent text-[var(--zd-text-muted)] hover:text-[var(--zd-text-primary)] transition-all cursor-pointer"
    };
    rsx! {
        button {
            r#type: "button",
            class: "{class}",
            aria_pressed: active,
            onclick: move |e: Event<MouseData>| {
                e.stop_propagation();
                onclick.call(e);
            },
            "{label}"
        }
    }
}

// ── ValuePropCard ───────────────────────────────────────────────────────────

#[component]
fn ValuePropCard(icon: Element, title: &'static str, body: &'static str) -> Element {
    rsx! {
        div {
            class: "flex flex-col gap-4 p-6 rounded-xl border border-[var(--zd-border)] bg-[var(--zd-surface)] hover:bg-[var(--zd-surface-hover)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[var(--zd-border-hover)] hover:shadow-md",
            span {
                class: "inline-flex items-center justify-center w-10 h-10 rounded-lg border border-[var(--zd-border)] bg-[var(--zd-surface-sunken)] text-[var(--zd-text-secondary)] shrink-0",
                {icon}
            }
            div {
                class: "flex flex-col gap-1.5",
                h3 {
                    class: "text-base font-semibold text-[var(--zd-text-primary)]",
                    style: "letter-spacing: -0.010em;",
                    "{title}"
                }
                p {
                    class: "text-xs text-[var(--zd-text-secondary)] leading-relaxed",
                    "{body}"
                }
            }
        }
    }
}

// ── Inline SVG icons ───────────────────────────────────────────────────────

#[component]
fn IconCheck() -> Element {
    rsx! {
        svg {
            width: "14", height: "14",
            fill: "none", stroke: "currentColor",
            stroke_width: "2.5", stroke_linecap: "round", stroke_linejoin: "round",
            view_box: "0 0 24 24",
            path { d: "M20 6 9 17l-5-5" }
        }
    }
}

#[component]
fn IconLockSmall() -> Element {
    rsx! {
        svg {
            width: "11", height: "11",
            fill: "none", stroke: "currentColor",
            stroke_width: "2", stroke_linecap: "round", stroke_linejoin: "round",
            view_box: "0 0 24 24",
            rect { x: "3", y: "11", width: "18", height: "11", rx: "2" }
            path { d: "M7 11V7a5 5 0 0 1 10 0v4" }
        }
    }
}

#[component]
fn IconShield() -> Element {
    rsx! {
        svg {
            width: "18", height: "18",
            fill: "none", stroke: "currentColor",
            stroke_width: "1.75", stroke_linecap: "round", stroke_linejoin: "round",
            view_box: "0 0 24 24",
            path { d: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" }
            path { d: "m9 12 2 2 4-4" }
        }
    }
}

#[component]
fn IconBolt() -> Element {
    rsx! {
        svg {
            width: "18", height: "18",
            fill: "none", stroke: "currentColor",
            stroke_width: "1.75", stroke_linecap: "round", stroke_linejoin: "round",
            view_box: "0 0 24 24",
            path { d: "M13 2 3 14h9l-1 8 10-12h-9l1-8z" }
        }
    }
}

#[component]
fn IconUserOff() -> Element {
    rsx! {
        svg {
            width: "18", height: "18",
            fill: "none", stroke: "currentColor",
            stroke_width: "1.75", stroke_linecap: "round", stroke_linejoin: "round",
            view_box: "0 0 24 24",
            path { d: "M18 21a8 8 0 0 0-11.3-7.3" }
            circle { cx: "10", cy: "8", r: "4" }
            path { d: "m2 2 20 20" }
        }
    }
}

#[component]
fn IconArrowRight() -> Element {
    rsx! {
        svg {
            width: "12", height: "12",
            fill: "none", stroke: "currentColor",
            stroke_width: "2.5",
            stroke_linecap: "round", stroke_linejoin: "round",
            view_box: "0 0 24 24",
            path { d: "M5 12h14M12 5l7 7-7 7" }
        }
    }
}

#[component]
fn IconPaste() -> Element {
    rsx! {
        svg {
            width: "13", height: "13",
            fill: "none", stroke: "currentColor",
            stroke_width: "2", stroke_linecap: "round", stroke_linejoin: "round",
            view_box: "0 0 24 24",
            rect { x: "8", y: "2", width: "8", height: "4", rx: "1" }
            path { d: "M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" }
        }
    }
}
