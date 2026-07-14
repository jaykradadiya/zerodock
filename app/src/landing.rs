use crate::registry::{hub_children, search_tools, CATEGORIES, ToolTier};
use crate::router::{route_for_path, Route};
use crate::state::use_app_state;
use dioxus::prelude::*;

fn category_mark(category: &str) -> &'static str {
    match category {
        "Data" => "{}",
        "Network" => "⇄",
        "Encoding" => "#",
        "Security" => "⌀",
        "Text" => "Aa",
        "Converters" => "↔",
        "Generators" => "∗",
        _ => "·",
    }
}

#[derive(Clone, PartialEq)]
struct DetectedPayload {
    label: &'static str,
    target_name: &'static str,
    route: Route,
    explanation: &'static str,
    confidence: &'static str,
    accent_class: &'static str,
}

fn analyze_smart_paste(text: &str) -> Option<DetectedPayload> {
    let t = text.trim();
    if t.is_empty() {
        return None;
    }
    // Check JWT
    if t.starts_with("eyJ") && t.split('.').count() == 3 {
        return Some(DetectedPayload {
            label: "JWT Token",
            target_name: "Inspect & Codec Studio (JWT Inspector)",
            route: Route::JwtDecoder {},
            explanation: "3-part base64url encoded JSON Web Token structure detected.",
            confidence: "99%",
            accent_class: "border-purple-500/60 bg-purple-950/40 text-purple-200",
        });
    }
    // Check cURL
    let lower = t.to_lowercase();
    if lower.starts_with("curl ") || lower.starts_with("curl\t") || lower.starts_with("curl\n") {
        return Some(DetectedPayload {
            label: "cURL Command",
            target_name: "HTTP Client Studio",
            route: Route::Http {},
            explanation: "Command-line HTTP request invocation detected.",
            confidence: "99%",
            accent_class: "border-blue-500/60 bg-blue-950/40 text-blue-200",
        });
    }
    // Check JSON / Object / Array
    if (t.starts_with('{') && t.ends_with('}')) || (t.starts_with('[') && t.ends_with(']')) {
        if serde_json::from_str::<serde_json::Value>(t).is_ok() || zerodock_indexer::JsonIndex::from_bytes(t.as_bytes()).is_ok() {
            return Some(DetectedPayload {
                label: "JSON Document / Array",
                target_name: "JSON & Data Studio",
                route: Route::JsonToolkit {},
                explanation: "Valid JSON object/array structure detected.",
                confidence: "98%",
                accent_class: "border-emerald-500/60 bg-emerald-950/40 text-emerald-200",
            });
        }
    }
    // Check Unix Epoch Timestamp (10 or 13 digits numeric)
    if t.len() >= 10 && t.len() <= 13 && t.chars().all(|c| c.is_ascii_digit()) {
        return Some(DetectedPayload {
            label: "Unix Timestamp",
            target_name: "Epoch Converter",
            route: Route::EpochConverter {},
            explanation: "Numeric Unix epoch timestamp detected in seconds/milliseconds.",
            confidence: "95%",
            accent_class: "border-amber-500/60 bg-amber-950/40 text-amber-200",
        });
    }
    // Check URL Encoded string (%20, %3A, etc.)
    if t.contains("%20") || t.contains("%3A") || t.contains("%2F") || t.contains("%3D") {
        return Some(DetectedPayload {
            label: "URL Encoded String",
            target_name: "Inspect & Codec Studio (URL Encoder)",
            route: Route::UrlEncoder {},
            explanation: "URL percent-encoding entities (%XX) detected.",
            confidence: "90%",
            accent_class: "border-cyan-500/60 bg-cyan-950/40 text-cyan-200",
        });
    }
    // Check Base64 (alphanumeric + / + = padding and len > 20 without whitespace or typical text)
    if t.len() >= 20 && t.chars().all(|c| c.is_ascii_alphanumeric() || c == '+' || c == '/' || c == '=' || c == '-' || c == '_') && !t.contains(' ') {
        return Some(DetectedPayload {
            label: "Base64 Encoded Payload",
            target_name: "Inspect & Codec Studio (Base64 Codec)",
            route: Route::Base64Codec {},
            explanation: "Continuous base64/base64url character set detected.",
            confidence: "85%",
            accent_class: "border-indigo-500/60 bg-indigo-950/40 text-indigo-200",
        });
    }
    None
}

#[component]
pub fn LandingPage() -> Element {
    let mut state = use_app_state();
    let mut search = use_signal(String::new);
    let mut smart_paste_input = use_signal(String::new);
    let nav = use_navigator();
    let query = search.read().clone();
    let filtered = search_tools(&query);
    let tool_count = crate::registry::browse_tools().count();
    let has_query = !query.trim().is_empty();
    let detected = analyze_smart_paste(&smart_paste_input.read());

    rsx! {
        div {
            class: "h-full overflow-y-auto flex flex-col relative",

            section {
                class: "relative flex flex-col overflow-hidden zd-dot-grid shrink-0",
                div { class: "zd-hero-stage hidden md:block", aria_hidden: "true" }

                div {
                    class: "relative z-10 max-w-7xl mx-auto w-full px-4 py-12 md:py-16",
                    div {
                        class: "grid grid-cols-1 lg:grid-cols-12 gap-8 items-start",
                        div {
                            class: "lg:col-span-6 max-w-xl",
                            div {
                                class: "zd-rise flex items-center gap-3 mb-6",
                                img {
                                    src: asset!("/assets/zerodock_logo.svg"),
                                    alt: "",
                                    class: "w-11 h-11",
                                    aria_hidden: "true",
                                }
                                span { class: "zd-brand-mark", aria_hidden: "true" }
                            }
                            h1 {
                                class: "zd-rise-delay-1 font-display text-[clamp(2.75rem,7vw,4.5rem)] leading-[0.95] font-bold text-[var(--zd-hero-ink)] mb-4",
                                "ZeroDock"
                                span { class: "zd-cursor", aria_hidden: "true" }
                            }
                            p {
                                class: "zd-rise-delay-2 text-lg text-[var(--zd-text-secondary)] max-w-md leading-relaxed mb-6",
                                "Local developer tools. Format, encode, hash, and test — nothing leaves your machine."
                            }
                            div {
                                class: "zd-rise-delay-3 flex flex-wrap items-center gap-3",
                                a {
                                    href: "#tools",
                                    class: "inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-[var(--zd-primary)] text-[var(--zd-primary-fg)] text-sm font-semibold hover:bg-[var(--zd-primary-hover)] transition-colors focus-ring btn-micro",
                                    "Browse tools"
                                }
                                span {
                                    class: "text-xs font-mono text-[var(--zd-text-muted)]",
                                    "{tool_count} hubs · Rust · offline"
                                }
                            }
                        }

                        div {
                            class: "lg:col-span-6 w-full zd-rise-delay-3",
                            div {
                                class: "rounded-xl border border-[var(--zd-border)] bg-[var(--zd-surface-raised)]/90 backdrop-blur shadow-[var(--zd-shadow-lg)] p-4 transition-all duration-200 focus-within:border-[var(--zd-primary)]",
                                div {
                                    class: "flex items-center justify-between gap-2 mb-2",
                                    div { class: "flex items-center gap-2",
                                        span { class: "text-xs font-mono font-bold text-[var(--zd-primary)] uppercase tracking-wider", "⚡ Smart Paste Auto-Route" }
                                        span { class: "text-xs text-[var(--zd-text-muted)] hidden sm:inline", "(⌘V / Ctrl+V anything)" }
                                    }
                                    if !smart_paste_input.read().is_empty() {
                                        button {
                                            class: "text-xs text-[var(--zd-text-muted)] hover:text-[var(--zd-text-primary)] px-1",
                                            onclick: move |_| smart_paste_input.set(String::new()),
                                            "Clear"
                                        }
                                    }
                                }
                                textarea {
                                    class: "w-full h-28 px-3 py-2 text-xs font-mono rounded-lg border border-[var(--zd-border)] bg-[var(--zd-surface)] text-[var(--zd-text-primary)] placeholder-[var(--zd-text-muted)] focus:outline-none resize-none custom-scrollbar",
                                    placeholder: "Paste a JWT (eyJ...), cURL command (curl -X...), JSON document ({{...}}), Unix timestamp (172000...), or Base64 string here to detect & launch instantly...",
                                    value: "{smart_paste_input}",
                                    oninput: move |e: Event<FormData>| smart_paste_input.set(e.value()),
                                    onkeydown: {
                                        let mut state = state.clone();
                                        let smart_paste_input = smart_paste_input.clone();
                                        let nav = nav.clone();
                                        move |e: Event<KeyboardData>| {
                                            if e.key() == Key::Enter && !e.modifiers().contains(Modifiers::SHIFT) {
                                                if let Some(d) = analyze_smart_paste(&smart_paste_input.read()) {
                                                    e.prevent_default();
                                                    let key = match d.route {
                                                        Route::JwtDecoder {} => "jwt-decoder",
                                                        Route::Http {} => "api-tester",
                                                        Route::JsonToolkit {} => "json-toolkit",
                                                        Route::EpochConverter {} => "epoch-converter",
                                                        Route::UrlEncoder {} => "url-encoder",
                                                        Route::Base64Codec {} => "base64-codec",
                                                        _ => "",
                                                    };
                                                    if !key.is_empty() {
                                                        state.tool_states.write().insert(key.to_string(), smart_paste_input.read().clone());
                                                    }
                                                    nav.push(d.route);
                                                }
                                            }
                                        }
                                    }
                                }
                                if let Some(d) = detected {
                                    div {
                                        class: "mt-3 rounded-lg border p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 {d.accent_class}",
                                        div { class: "flex flex-col gap-0.5 min-w-0",
                                            div { class: "flex items-center gap-2",
                                                span { class: "font-bold text-xs font-mono uppercase tracking-wide", "✓ Detected: {d.label}" }
                                                span { class: "text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/30 font-semibold", "{d.confidence}" }
                                            }
                                            span { class: "text-xs opacity-90 font-mono truncate", "{d.explanation}" }
                                            span { class: "text-xs font-semibold mt-0.5", "Target: {d.target_name}" }
                                        }
                                        button {
                                            class: "px-4 py-2 rounded-lg bg-[var(--zd-primary)] text-[var(--zd-primary-fg)] font-semibold text-xs shrink-0 hover:bg-[var(--zd-primary-hover)] transition-all shadow-md flex items-center justify-center gap-1.5",
                                            onclick: {
                                                let d = d.clone();
                                                let smart_paste_input = smart_paste_input.clone();
                                                let mut state = state.clone();
                                                let nav = nav.clone();
                                                move |_| {
                                                    let key = match d.route {
                                                        Route::JwtDecoder {} => "jwt-decoder",
                                                        Route::Http {} => "api-tester",
                                                        Route::JsonToolkit {} => "json-toolkit",
                                                        Route::EpochConverter {} => "epoch-converter",
                                                        Route::UrlEncoder {} => "url-encoder",
                                                        Route::Base64Codec {} => "base64-codec",
                                                        _ => "",
                                                    };
                                                    if !key.is_empty() {
                                                        state.tool_states.write().insert(key.to_string(), smart_paste_input.read().clone());
                                                    }
                                                    nav.push(d.route.clone());
                                                }
                                            },
                                            "Launch Studio →"
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }

            section {
                id: "tools",
                class: "max-w-7xl mx-auto px-4 py-10 w-full flex-1",
                div {
                    class: "flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8",
                    div {
                        h2 {
                            class: "font-display text-2xl font-bold text-[var(--zd-text-primary)] tracking-tight",
                            "Tool bay"
                        }
                        p {
                            class: "mt-1 text-sm text-[var(--zd-text-secondary)]",
                            "Grouped by category. Hubs include nested tools."
                        }
                    }
                    label {
                        class: "relative w-full sm:max-w-xs",
                        span { class: "sr-only", "Filter tools" }
                        input {
                            class: "w-full px-4 py-2.5 rounded-md border border-[var(--zd-border)] bg-[var(--zd-surface-raised)] text-sm text-[var(--zd-text-primary)] font-mono focus-ring",
                            placeholder: "Filter…",
                            value: "{search}",
                            oninput: move |e: Event<FormData>| search.set(e.value()),
                        }
                    }
                }

                if has_query {
                    if filtered.is_empty() {
                        p {
                            class: "text-sm text-[var(--zd-text-muted)] py-10 font-mono",
                            "No tools match."
                        }
                    } else {
                        div {
                            class: "rounded-lg border border-[var(--zd-border)] bg-[var(--zd-surface)] overflow-hidden",
                            for (tool, hub_name) in filtered {
                                ToolRow { tool: tool, hub_name: hub_name }
                            }
                        }
                    }
                } else {
                    div {
                        class: "space-y-10",
                        for category in CATEGORIES {
                            {
                                let tools: Vec<_> = crate::registry::tools_in_category(category);
                                if tools.is_empty() {
                                    rsx! { span {} }
                                } else {
                                    rsx! {
                                        div {
                                            h3 {
                                                class: "zd-mono-label mb-3",
                                                "{category}"
                                            }
                                            div {
                                                class: "rounded-lg border border-[var(--zd-border)] bg-[var(--zd-surface)] overflow-hidden",
                                                for tool in tools {
                                                    ToolRow { tool: tool, hub_name: None }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }

            footer {
                class: "border-t border-[var(--zd-border)] py-6 mt-auto shrink-0",
                div {
                    class: "max-w-7xl mx-auto px-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3",
                    p {
                        class: "text-xs font-mono text-[var(--zd-text-muted)]",
                        "ZeroDock · client-side only"
                    }
                    p {
                        class: "text-xs text-[var(--zd-text-muted)]",
                        "Built with Rust + Dioxus"
                    }
                }
            }
        }
    }
}

#[component]
fn ToolRow(tool: &'static crate::registry::ToolDef, hub_name: Option<&'static str>) -> Element {
    let route = route_for_path(if let Some(h) = hub_name {
        tool.route
    } else {
        tool.route
    });
    let featured = tool.tier == ToolTier::Featured;
    let mark = category_mark(tool.category);
    let children: Vec<_> = hub_children(tool.id);
    let display_route = if hub_name.is_some() {
        route_for_path(tool.route)
    } else {
        route
    };

    rsx! {
        Link {
            to: display_route,
            class: "zd-tool-row group no-underline",
            span {
                class: "zd-icon-ring w-9 h-9 flex items-center justify-center text-xs font-mono shrink-0",
                "{mark}"
            }
            div {
                class: "min-w-0",
                div {
                    class: "flex items-center gap-2 flex-wrap",
                    h3 {
                        class: "text-base font-semibold text-[var(--zd-text-primary)] group-hover:text-[var(--zd-primary)] transition-colors",
                        "{tool.name}"
                    }
                    if let Some(hub) = hub_name {
                        span {
                            class: "text-[10px] font-mono text-[var(--zd-text-muted)]",
                            "in {hub}"
                        }
                    }
                    if featured {
                        span {
                            class: "text-[10px] font-mono uppercase tracking-wider text-[var(--zd-accent)]",
                            "Featured"
                        }
                    }
                }
                p {
                    class: "mt-0.5 text-sm text-[var(--zd-text-secondary)] line-clamp-2",
                    "{tool.description}"
                }
                if !children.is_empty() {
                    p {
                        class: "mt-1.5 text-[11px] font-mono text-[var(--zd-text-muted)]",
                        {children.iter().map(|c| c.name).collect::<Vec<_>>().join(" · ")}
                    }
                }
            }
            span {
                class: "text-[10px] font-mono uppercase tracking-wider text-[var(--zd-text-muted)] shrink-0",
                "{tool.category}"
            }
        }
    }
}
