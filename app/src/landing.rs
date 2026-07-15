use crate::registry::{hub_children, CATEGORIES, ToolTier};
use crate::router::{route_for_path, Route};
use crate::shell::ui::{Badge, BadgeVariant, IconSearch};
use crate::state::use_app_state;
use dioxus::prelude::*;
use dioxus_router::Link;

fn category_icon(category: &str) -> &'static str {
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
    let lower = t.to_lowercase();
    if lower.starts_with("curl ") || lower.starts_with("curl\t") {
        return Some(DetectedPayload {
            label: "cURL Command",
            target_name: "HTTP Client Studio",
            route: Route::Http {},
            explanation: "HTTP request invocation detected.",
            confidence: "99%",
            color: "var(--zd-info)",
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
    let mut state = use_app_state();
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
                class: "relative shrink-0 border-b border-[var(--zd-border)] overflow-hidden",

                div {
                    class: "relative max-w-3xl mx-auto w-full px-6 pt-20 pb-16 md:pt-28 md:pb-20 flex flex-col items-center text-center",

                    h1 {
                        class: "zd-rise font-display text-[var(--zd-text-primary)] leading-[1.05] mb-6",
                        style: "font-size: clamp(2.25rem, 5vw, 3.5rem); letter-spacing: -0.03em;",
                        "Developer tools that never leave "
                        span { style: "color: var(--zd-primary);", "your machine." }
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
                            IconCheck {}
                            "No login"
                        }
                        span {
                            class: "inline-flex items-center gap-1.5 text-sm text-[var(--zd-text-secondary)]",
                            IconCheck {}
                            "100% private"
                        }
                        span {
                            class: "inline-flex items-center gap-1.5 text-sm text-[var(--zd-text-secondary)]",
                            IconCheck {}
                            "Free forever"
                        }
                    }

                    // ── Smart paste — centered drop zone (the fast path) ────
                    div {
                        class: "zd-rise-delay-1 w-full",
                        div {
                            class: "rounded-lg border bg-[var(--zd-surface)] overflow-hidden transition-[border-color,box-shadow] duration-200 text-left",
                            style: if !smart_paste_input.read().is_empty() {
                                "border-color: color-mix(in srgb, var(--zd-primary) 45%, var(--zd-border)); box-shadow: var(--zd-shadow-glow);"
                            } else {
                                "border-color: var(--zd-border);"
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
                                span {
                                    class: "text-[10px] font-mono text-[var(--zd-text-muted)] hidden sm:inline",
                                    "Not sure which tool? Paste anything — we'll open the right one"
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
                            if let Some(d) = detected {
                                div {
                                    class: "flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 border-t border-[var(--zd-border)]",
                                    style: "background: color-mix(in srgb, {d.color} 6%, var(--zd-surface));",
                                    div { class: "flex flex-col gap-0.5 min-w-0",
                                        div { class: "flex items-center gap-2.5",
                                            span {
                                                class: "w-1.5 h-1.5 rounded-full shrink-0",
                                                style: "background: {d.color};"
                                            }
                                            span {
                                                class: "text-xs font-mono font-semibold text-[var(--zd-text-primary)]",
                                                "{d.label} detected"
                                            }
                                            span {
                                                class: "text-[10px] font-mono font-bold px-1.5 py-0.5 rounded",
                                                style: "background: color-mix(in srgb, {d.color} 15%, transparent); color: {d.color};",
                                                "{d.confidence}"
                                            }
                                        }
                                        p {
                                            class: "text-xs font-semibold ml-4",
                                            style: "color: {d.color};",
                                            "→  {d.target_name}"
                                        }
                                    }
                                    button {
                                        class: "flex items-center justify-center gap-1.5 px-4 py-2 rounded-md text-xs font-semibold text-white shrink-0 transition-all btn-micro focus-ring",
                                        style: "background: {d.color};",
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
                                        "Launch"
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
                    class: "flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6",
                    div {
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
                    label {
                        class: "relative flex items-center w-full sm:max-w-xs",
                        span { class: "sr-only", "Search tools" }
                        span {
                            class: "absolute left-3 text-[var(--zd-text-muted)] pointer-events-none",
                            IconSearch {}
                        }
                        input {
                            class: "w-full pl-9 pr-4 py-2.5 rounded-md border border-[var(--zd-border)] bg-[var(--zd-surface)] text-sm text-[var(--zd-text-primary)] focus-ring placeholder:text-[var(--zd-text-muted)] transition-colors focus:border-[var(--zd-primary)]",
                            placeholder: "Search tools…",
                            value: "{search}",
                            oninput: move |e: Event<FormData>| search.set(e.value()),
                        }
                    }
                }

                // Category filter chips
                div {
                    class: "flex flex-wrap items-center gap-1.5 mb-8 pb-6 border-b border-[var(--zd-border)]",
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
                                        if let Some(pos) = filters.iter().position(|x| x.as_str() == cat) {
                                            filters.remove(pos);
                                        } else {
                                            filters.push(cat.to_string());
                                        }
                                        tracing::info!("ZeroDock: New active categories: {:?}", *filters);
                                    }),
                                }
                            }
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
                        for tool in visible_tools {
                            ToolCard { tool: tool, hub_name: None }
                        }
                    }
                }
            }

            // ── VALUE PROPS — Built different, on purpose ──────────────────
            section {
                class: "border-t border-[var(--zd-border)] bg-[var(--zd-surface)] shrink-0",
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
                            class: "text-base text-[var(--zd-text-secondary)] leading-relaxed",
                            "Not another SaaS. Just tools that respect your data and your time."
                        }
                    }
                    // Asymmetric: lead privacy prop, then two supporting props
                    div {
                        class: "flex flex-col gap-10 md:gap-12",

                        // Lead prop — Privacy by architecture
                        div {
                            class: "flex flex-col md:flex-row md:items-start gap-5 md:gap-8 md:max-w-3xl",
                            span {
                                class: "zd-icon-ring inline-flex items-center justify-center w-12 h-12 shrink-0",
                                style: "color: var(--zd-primary);",
                                IconShield {}
                            }
                            div {
                                h3 {
                                    class: "font-display text-xl text-[var(--zd-text-primary)] mb-2",
                                    style: "letter-spacing: -0.02em;",
                                    "Privacy by architecture"
                                }
                                p {
                                    class: "text-base text-[var(--zd-text-secondary)] leading-relaxed max-w-xl",
                                    "Every tool runs locally — in your browser via WebAssembly, or natively on desktop. No data is transmitted, stored, or logged. Your files never touch a server."
                                }
                            }
                        }

                        // Two supporting props
                        div {
                            class: "grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 md:max-w-3xl",
                            ValueProp {
                                icon: rsx! { IconBolt {} },
                                title: "Instant performance",
                                body: "No round-trips, no loading spinners. Tools process data in-memory at native speed, with streaming and chunking for large files.",
                            }
                            ValueProp {
                                icon: rsx! { IconUserOff {} },
                                title: "No accounts, ever",
                                body: "No sign-up, no email, no tracking. Open the page, use the tool, close the tab. Open-source and auditable.",
                            }
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
        Route::Http {}           => "api-tester",
        Route::JsonToolkit {}    => "json-toolkit",
        Route::EpochConverter {} => "epoch-converter",
        Route::UrlEncoder {}     => "url-encoder",
        Route::Base64Codec {}    => "base64-codec",
        _                        => "",
    }
}

#[component]
fn ToolCard(tool: &'static crate::registry::ToolDef, hub_name: Option<&'static str>) -> Element {
    let route = route_for_path(tool.route);
    let featured = tool.tier == ToolTier::Featured;
    let icon = category_icon(tool.category);
    let children: Vec<_> = hub_children(tool.id);

    rsx! {
        Link {
            to: route,
            class: "zd-tool-card group",

            // Top row: icon + featured badge
            div {
                class: "flex items-start justify-between gap-2",
                span {
                    class: "zd-icon-ring inline-flex items-center justify-center w-9 h-9 text-sm font-mono shrink-0",
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

            // Footer — reassurance + explicit primary action (itspdftools-style)
            div {
                class: "flex items-center justify-between gap-2 mt-auto pt-3",
                span {
                    class: "inline-flex items-center gap-1 text-[10px] font-mono text-[var(--zd-text-muted)]",
                    IconLockSmall {}
                    "Runs locally"
                }
                span {
                    class: "inline-flex items-center gap-1 text-xs font-medium text-[var(--zd-text-muted)] group-hover:text-[var(--zd-primary)] transition-colors",
                    "Open"
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
        "inline-flex items-center h-8 px-3 rounded-md text-xs font-medium border transition-colors focus-ring btn-micro border-transparent bg-[var(--zd-primary)] text-[var(--zd-primary-fg)]"
    } else {
        "inline-flex items-center h-8 px-3 rounded-md text-xs font-medium border transition-colors focus-ring btn-micro border-[var(--zd-border)] bg-[var(--zd-surface)] text-[var(--zd-text-secondary)] hover:text-[var(--zd-text-primary)] hover:border-[var(--zd-border-hover)]"
    };
    rsx! {
        button {
            class: "{class}",
            aria_pressed: active,
            onclick: move |e| onclick.call(e),
            "{label}"
        }
    }
}

// ── ValueProp ───────────────────────────────────────────────────────────────

#[component]
fn ValueProp(icon: Element, title: &'static str, body: &'static str) -> Element {
    rsx! {
        div {
            class: "flex flex-col gap-3",
            span {
                class: "zd-icon-ring inline-flex items-center justify-center w-10 h-10 shrink-0",
                style: "color: var(--zd-primary);",
                {icon}
            }
            h3 {
                class: "text-base font-semibold text-[var(--zd-text-primary)]",
                style: "letter-spacing: -0.01em;",
                "{title}"
            }
            p {
                class: "text-sm text-[var(--zd-text-secondary)] leading-relaxed",
                "{body}"
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
