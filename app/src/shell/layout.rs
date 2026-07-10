use crate::shell::code_editor::CodeEditor;
use crate::shell::code_editor::CodeLanguage;
use crate::shell::empty_state::EmptyState;
use crate::shell::mobile_swap::{MobilePanel, MobileSwapBar};
use crate::shell::ui::{CopyButton, TabGroup, TabVariant};
use crate::state::use_app_state;
use dioxus::prelude::*;

#[component]
pub fn ToolPage(children: Element) -> Element {
    let state = use_app_state();
    let zen = state.ui.read().zen_mode;
    rsx! {
        main {
            id: "main-content",
            class: if zen {
                "zd-tool-fill flex flex-col min-h-0 p-2 overflow-hidden"
            } else {
                "zd-tool-fill flex flex-col min-h-0 w-full p-4 md:p-6 overflow-hidden"
            },
            {children}
        }
    }
}

#[component]
pub fn ToolHeader(
    title: String,
    description: String,
    #[props(default)] breadcrumb: Option<String>,
    #[props(default)] actions: Option<Element>,
) -> Element {
    let state = use_app_state();
    if state.ui.read().zen_mode {
        return VNode::empty();
    }
    rsx! {
        header {
            class: "mb-6 shrink-0",
            div {
                class: "flex items-start justify-between gap-4",
                div {
                    if let Some(crumb) = breadcrumb {
                        p {
                            class: "text-xs text-[var(--zd-text-muted)] zd-mono-label mb-1",
                            "{crumb}"
                        }
                    }
                    h1 {
                        class: "font-display text-2xl font-bold tracking-tight text-[var(--zd-text-primary)]",
                        "{title}"
                    }
                    p {
                        class: "mt-1 text-sm text-[var(--zd-text-secondary)]",
                        "{description}"
                    }
                }
                if let Some(actions) = actions {
                    div { class: "shrink-0", {actions} }
                }
            }
        }
    }
}

#[component]
pub fn HubToolHeader(
    hub_id: &'static str,
    hub_title: &'static str,
    hub_description: String,
    active_tab: String,
    #[props(default)] actions: Option<Element>,
) -> Element {
    let (title, description, breadcrumb) =
        if let Some((name, desc)) = crate::registry::hub_tab_label(hub_id, &active_tab) {
            (
                name.to_string(),
                desc.to_string(),
                Some(format!("{hub_title} · Hub")),
            )
        } else {
            (
                hub_title.to_string(),
                hub_description,
                None,
            )
        };

    rsx! {
        ToolHeader {
            title: title,
            description: description,
            breadcrumb: breadcrumb,
            actions: actions,
        }
    }
}

#[component]
pub fn ToolWorkspace(
    children: Element,
    #[props(default)] toolbar: Option<Element>,
) -> Element {
    rsx! {
        div {
            class: "zd-workspace zd-tool-fill flex flex-col min-h-0 flex-1",
            if let Some(toolbar) = toolbar {
                div { class: "shrink-0", {toolbar} }
            }
            {children}
        }
    }
}

#[component]
pub fn ToolBody(children: Element) -> Element {
    rsx! {
        div {
            class: "zd-tool-fill flex flex-col min-h-0 flex-1 overflow-hidden",
            {children}
        }
    }
}

#[component]
pub fn ToolToolbar(children: Element) -> Element {
    rsx! {
        div {
            class: "flex flex-wrap items-center gap-1.5 px-3 py-2 border-b border-[var(--zd-border)] bg-[var(--zd-surface-raised)]",
            {children}
        }
    }
}

#[component]
pub fn SplitPanels(children: Element) -> Element {
    rsx! {
        div {
            class: "zd-tool-fill grid grid-cols-1 md:grid-cols-2 min-h-0 flex-1",
            {children}
        }
    }
}

#[component]
pub fn ResponsiveSplitPanels(
    input_label: &'static str,
    output_label: &'static str,
    input_panel: Element,
    output_panel: Element,
) -> Element {
    let mut mobile = use_signal(MobilePanel::default);

    rsx! {
        div {
            class: "zd-tool-fill flex flex-col min-h-0 flex-1",
            MobileSwapBar {
                active: *mobile.read(),
                on_change: EventHandler::new(move |p| mobile.set(p)),
                input_label: input_label,
                output_label: output_label,
            }
            div {
                class: "zd-tool-fill grid grid-cols-1 md:grid-cols-2 min-h-0 flex-1",
                div {
                    class: if *mobile.read() == MobilePanel::Input { "block md:contents" } else { "hidden md:contents" },
                    {input_panel}
                }
                div {
                    class: if *mobile.read() == MobilePanel::Output { "block md:contents" } else { "hidden md:contents" },
                    {output_panel}
                }
            }
        }
    }
}

#[component]
pub fn CodePanel(
    title: String,
    value: String,
    oninput: Option<EventHandler<Event<FormData>>>,
    #[props(default)] on_edit: Option<EventHandler<String>>,
    #[props(default)] read_only: bool,
    #[props(default)] placeholder: &'static str,
    #[props(default)] error: Option<String>,
    #[props(default)] show_empty: bool,
    #[props(default)] header_actions: Option<Element>,
    #[props(default)] language: CodeLanguage,
    #[props(default)] tab_size: usize,
    #[props(default)] aria_label: &'static str,
) -> Element {
    let is_empty = value.trim().is_empty();
    let copy_text = value.clone();
    rsx! {
        div {
            class: "zd-code-panel border-b md:border-b-0 md:border-r border-[var(--zd-border)] flex flex-col min-h-0 flex-1",
            div {
                class: "flex items-center justify-between px-3 py-2 border-b border-[var(--zd-border)] bg-[var(--zd-surface-raised)] shrink-0 gap-2",
                span { class: "zd-mono-label", "{title}" }
                div {
                    class: "flex items-center gap-1",
                    if let Some(actions) = header_actions {
                        {actions}
                    }
                    if !is_empty {
                        CopyButton { text: copy_text, label: "Copy" }
                    }
                }
            }
            div {
                class: "zd-code-panel-body relative flex-1 min-h-0 flex flex-col",
                if show_empty && is_empty && read_only {
                    EmptyState {
                        icon: "⌘",
                        title: "No output yet",
                        hint: "Enter input in the panel to see results here.",
                    }
                } else if show_empty && is_empty {
                    EmptyState {
                        icon: "···",
                        title: "Start typing",
                        hint: placeholder,
                    }
                } else {
                    CodeEditor {
                        value: value.clone(),
                        oninput: oninput,
                        on_edit: on_edit,
                        read_only: read_only,
                        placeholder: placeholder,
                        language: language,
                        tab_size: tab_size,
                        aria_label: aria_label,
                    }
                }
                if let Some(err) = error {
                    p {
                        class: "px-4 py-2 text-sm text-[var(--zd-error)] border-t border-[var(--zd-border)] shrink-0",
                        role: "alert",
                        "{err}"
                    }
                }
            }
        }
    }
}

#[component]
pub fn ModeToggle(active: bool, onclick: EventHandler<MouseEvent>, children: Element) -> Element {
    let class = if active {
        "toolbar-btn toolbar-btn-active"
    } else {
        "toolbar-btn"
    };
    rsx! {
        button {
            class: "{class}",
            role: "tab",
            aria_selected: active,
            onclick: move |e| onclick.call(e),
            {children}
        }
    }
}

#[component]
pub fn HubTabs(
    tabs: Vec<(&'static str, &'static str)>,
    active: String,
    on_tab: EventHandler<String>,
) -> Element {
    rsx! {
        TabGroup {
            tabs: tabs,
            active: active,
            on_change: on_tab,
            variant: TabVariant::Hub,
        }
    }
}

#[component]
pub fn StandaloneTool(
    title: &'static str,
    description: String,
    children: Element,
) -> Element {
    rsx! {
        ToolPage {
            div {
                class: "zd-tool-fill flex flex-col min-h-0",
                ToolHeader {
                    title: title.to_string(),
                    description: description,
                }
                ToolWorkspace {
                    {children}
                }
            }
        }
    }
}
