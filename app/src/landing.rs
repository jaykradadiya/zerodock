use crate::registry::{hub_children, search_tools, CATEGORIES, ToolTier};
use crate::router::route_for_path;
use dioxus::prelude::*;
use dioxus_router::Link;

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

#[component]
pub fn LandingPage() -> Element {
    let mut search = use_signal(String::new);
    let query = search.read().clone();
    let filtered = search_tools(&query);
    let tool_count = crate::registry::browse_tools().count();
    let has_query = !query.trim().is_empty();

    rsx! {
        div {
            class: "h-full overflow-y-auto flex flex-col relative",

            section {
                class: "relative flex flex-col overflow-hidden zd-dot-grid shrink-0",
                div { class: "zd-hero-stage hidden md:block", aria_hidden: "true" }

                div {
                    class: "relative z-10 max-w-7xl mx-auto w-full px-4 py-12 md:py-16",
                    div {
                        class: "max-w-xl",
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
