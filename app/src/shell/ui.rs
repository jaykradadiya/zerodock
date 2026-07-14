use crate::shell::code_editor::{CodeEditor, CodeLanguage};
use crate::shell::empty_state::EmptyState;
use crate::state::{use_app_state, ToastKind};
use dioxus::prelude::*;

#[derive(Props, Clone, PartialEq)]
pub struct ButtonProps {
    #[props(default)]
    pub variant: ButtonVariant,
    #[props(default)]
    pub class: String,
    pub children: Element,
    #[props(default)]
    pub onclick: Option<EventHandler<MouseEvent>>,
    #[props(default)]
    pub disabled: bool,
    #[props(default)]
    pub aria_label: Option<String>,
    #[props(default)]
    pub shortcut: Option<String>,
}

#[derive(Clone, Copy, PartialEq, Default)]
pub enum ButtonVariant {
    #[default]
    Primary,
    Secondary,
    Ghost,
}

#[component]
pub fn Button(props: ButtonProps) -> Element {
    let base = "inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors focus-ring btn-micro";
    let variant = match props.variant {
        ButtonVariant::Primary => "bg-[var(--zd-primary)] text-[var(--zd-primary-fg)] hover:bg-[var(--zd-primary-hover)]",
        ButtonVariant::Secondary => "bg-[var(--zd-surface-raised)] border border-[var(--zd-border)] text-[var(--zd-text-primary)] hover:border-[var(--zd-border-hover)]",
        ButtonVariant::Ghost => "text-[var(--zd-text-secondary)] hover:bg-[var(--zd-primary-soft)] hover:text-[var(--zd-text-primary)]",
    };
    rsx! {
        button {
            class: "{base} {variant} {props.class}",
            disabled: props.disabled,
            aria_label: props.aria_label,
            onclick: move |e| {
                if let Some(handler) = props.onclick {
                    handler.call(e);
                }
            },
            span { class: "inline-flex items-center gap-1.5",
                {props.children}
                if let Some(sc) = &props.shortcut {
                    span {
                        class: "inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-black/20 text-current opacity-90 border border-current/25 leading-none shadow-sm",
                        "{sc}"
                    }
                }
            }
        }
    }
}

#[component]
pub fn IconButton(
    label: String,
    #[props(default)] onclick: Option<EventHandler<MouseEvent>>,
    children: Element,
) -> Element {
    rsx! {
        button {
            class: "inline-flex items-center justify-center w-9 h-9 rounded-md text-sm transition-colors focus-ring btn-micro text-[var(--zd-text-secondary)] hover:bg-[var(--zd-primary-soft)] hover:text-[var(--zd-text-primary)]",
            title: "{label}",
            aria_label: "{label}",
            onclick: move |e| {
                if let Some(handler) = onclick {
                    handler.call(e);
                }
            },
            {children}
        }
    }
}

#[component]
pub fn CopyButton(text: String, #[props(default)] label: &'static str) -> Element {
    let state = use_app_state();
    let display = label;
    rsx! {
        Button {
            variant: ButtonVariant::Ghost,
            class: "px-2 py-1 text-xs",
            aria_label: Some(format!("Copy {label}")),
            onclick: move |_| {
                let text = text.clone();
                let mut state = state.clone();
                spawn(async move {
                    if copy_to_clipboard(&text).await {
                        state.toast("Copied to clipboard", ToastKind::Success);
                    } else {
                        state.toast("Copy failed", ToastKind::Error);
                    }
                });
            },
            "{display}"
        }
    }
}

pub async fn copy_to_clipboard(text: &str) -> bool {
    #[cfg(target_arch = "wasm32")]
    {
        use wasm_bindgen_futures::JsFuture;
        if let Some(clipboard) = web_sys::window().map(|w| w.navigator().clipboard()) {
            let promise = clipboard.write_text(text);
            return JsFuture::from(promise).await.is_ok();
        }
        return false;
    }
    #[cfg(not(target_arch = "wasm32"))]
    {
        arboard::Clipboard::new()
            .and_then(|mut c| c.set_text(text.to_owned()))
            .is_ok()
    }
}

#[component]
pub fn InlineAlert(
    message: String,
    #[props(default)] variant: AlertVariant,
) -> Element {
    let (border, bg, text) = match variant {
        AlertVariant::Error => (
            "border-[var(--zd-error)]/30",
            "bg-[var(--zd-error-soft)]",
            "text-[var(--zd-error)]",
        ),
        AlertVariant::Warning => (
            "border-[var(--zd-accent)]/30",
            "bg-[var(--zd-accent-soft)]",
            "text-[var(--zd-text-secondary)]",
        ),
        AlertVariant::Info => (
            "border-[var(--zd-border)]",
            "bg-[var(--zd-surface)]",
            "text-[var(--zd-text-secondary)]",
        ),
    };
    rsx! {
        div {
            class: "px-4 py-3 rounded-md border text-sm {border} {bg} {text}",
            role: "alert",
            "{message}"
        }
    }
}

#[derive(Clone, Copy, PartialEq, Default)]
pub enum AlertVariant {
    #[default]
    Info,
    Warning,
    Error,
}

#[component]
pub fn Badge(
    children: Element,
    #[props(default)] variant: BadgeVariant,
) -> Element {
    let class = match variant {
        BadgeVariant::Default => "bg-[var(--zd-primary-soft)] text-[var(--zd-primary)]",
        BadgeVariant::Accent => "bg-[var(--zd-accent-soft)] text-[var(--zd-accent)]",
        BadgeVariant::Error => "bg-[var(--zd-error-soft)] text-[var(--zd-error)]",
    };
    rsx! {
        span {
            class: "inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium zd-mono-label {class}",
            {children}
        }
    }
}

#[derive(Clone, Copy, PartialEq, Default)]
pub enum BadgeVariant {
    #[default]
    Default,
    Accent,
    Error,
}

#[component]
pub fn Card(children: Element) -> Element {
    rsx! {
        div {
            class: "rounded-md border border-[var(--zd-border)] bg-[var(--zd-surface-raised)] p-4",
            {children}
        }
    }
}

#[component]
pub fn Panel(
    children: Element,
    #[props(default)] title: Option<String>,
    #[props(default)] actions: Option<Element>,
) -> Element {
    rsx! {
        div {
            class: "rounded-md border border-[var(--zd-border)] bg-[var(--zd-surface)] overflow-hidden flex flex-col min-h-0",
            if title.is_some() || actions.is_some() {
                div {
                    class: "flex items-center justify-between px-3 py-2 border-b border-[var(--zd-border)] bg-[var(--zd-surface-raised)]",
                    if let Some(title) = title {
                        span { class: "zd-mono-label", "{title}" }
                    }
                    if let Some(actions) = actions {
                        div { class: "flex items-center gap-1", {actions} }
                    }
                }
            }
            div { class: "flex-1 min-h-0", {children} }
        }
    }
}

#[derive(Clone, Copy, PartialEq, Default)]
pub enum TabVariant {
    #[default]
    Segmented,
    Toolbar,
    Hub,
}

#[component]
pub fn TabGroup(
    tabs: Vec<(&'static str, &'static str)>,
    active: String,
    on_change: EventHandler<String>,
    #[props(default)] variant: TabVariant,
) -> Element {
    let container_class = match variant {
        TabVariant::Segmented => {
            "inline-flex p-0.5 rounded-md border border-[var(--zd-border)] bg-[var(--zd-surface)]"
        }
        TabVariant::Toolbar => "flex flex-wrap gap-1",
        TabVariant::Hub => "flex gap-1 px-3 py-2 border-b border-[var(--zd-border)] bg-[var(--zd-surface-raised)] shrink-0",
    };

    rsx! {
        div {
            class: "{container_class}",
            role: "tablist",
            for (id, label) in tabs {
                {
                    let is_active = active == id;
                    let id = id.to_string();
                    let btn_class = match variant {
                        TabVariant::Segmented if is_active => "px-3 py-1.5 rounded-sm text-xs font-medium bg-[var(--zd-surface-raised)] text-[var(--zd-text-primary)] shadow-[var(--zd-shadow-sm)]",
                        TabVariant::Segmented => "px-3 py-1.5 rounded-sm text-xs font-medium text-[var(--zd-text-secondary)] hover:text-[var(--zd-text-primary)]",
                        TabVariant::Toolbar if is_active => "toolbar-btn toolbar-btn-active",
                        TabVariant::Toolbar => "toolbar-btn",
                        TabVariant::Hub if is_active => "px-3 py-1.5 rounded-md text-xs font-medium zd-mono-label text-[var(--zd-primary)] bg-[var(--zd-primary-soft)] border-b-2 border-[var(--zd-accent)]",
                        TabVariant::Hub => "px-3 py-1.5 rounded-md text-xs font-medium zd-mono-label text-[var(--zd-text-muted)] hover:text-[var(--zd-text-primary)] hover:bg-[var(--zd-surface)]",
                    };
                    rsx! {
                        button {
                            class: "{btn_class}",
                            role: "tab",
                            aria_selected: is_active,
                            onclick: move |_| on_change.call(id.clone()),
                            "{label}"
                        }
                    }
                }
            }
        }
    }
}

#[component]
pub fn SegmentedControl(
    options: Vec<(&'static str, &'static str)>,
    active: String,
    on_change: EventHandler<String>,
) -> Element {
    rsx! {
        TabGroup {
            tabs: options,
            active: active,
            on_change: on_change,
            variant: TabVariant::Segmented,
        }
    }
}

#[component]
pub fn Textarea(
    value: String,
    oninput: EventHandler<Event<FormData>>,
    #[props(default)] placeholder: String,
    #[props(default)] class: String,
    #[props(default)] rows: u32,
) -> Element {
    rsx! {
        textarea {
            class: "w-full h-full min-h-[200px] p-4 font-mono text-sm bg-transparent text-[var(--zd-text-primary)] border-0 resize-none focus:outline-none custom-scrollbar {class}",
            value: "{value}",
            placeholder: "{placeholder}",
            rows: "{rows}",
            oninput: move |e| oninput.call(e),
        }
    }
}

#[component]
pub fn Input(
    value: String,
    oninput: EventHandler<Event<FormData>>,
    #[props(default)] placeholder: String,
    #[props(default)] class: String,
) -> Element {
    rsx! {
        input {
            class: "w-full px-4 py-2 rounded-md border border-[var(--zd-border)] bg-[var(--zd-surface-raised)] text-[var(--zd-text-primary)] font-mono text-sm focus-ring {class}",
            value: "{value}",
            placeholder: "{placeholder}",
            oninput: move |e| oninput.call(e),
        }
    }
}

#[component]
pub fn Select(
    value: String,
    onchange: EventHandler<Event<FormData>>,
    options: Vec<(&'static str, &'static str)>,
    #[props(default)] class: String,
) -> Element {
    rsx! {
        select {
            class: "px-3 py-1.5 rounded-md border border-[var(--zd-border)] bg-[var(--zd-surface-raised)] text-sm text-[var(--zd-text-primary)] focus-ring {class}",
            value: "{value}",
            onchange: move |e| onchange.call(e),
            for (val, label) in options {
                option {
                    value: "{val}",
                    selected: value == val,
                    "{label}"
                }
            }
        }
    }
}

#[component]
pub fn SectionLabel(children: Element) -> Element {
    rsx! {
        span {
            class: "zd-mono-label",
            {children}
        }
    }
}

/// Search icon for navbar command palette trigger.
#[component]
pub fn IconSearch() -> Element {
    rsx! {
        svg {
            xmlns: "http://www.w3.org/2000/svg",
            width: "16",
            height: "16",
            view_box: "0 0 24 24",
            fill: "none",
            stroke: "currentColor",
            stroke_width: "2",
            circle { cx: "11", cy: "11", r: "8" }
            path { d: "m21 21-4.3-4.3" }
        }
    }
}

#[component]
pub fn IconSun() -> Element {
    rsx! {
        svg {
            xmlns: "http://www.w3.org/2000/svg",
            width: "16",
            height: "16",
            view_box: "0 0 24 24",
            fill: "none",
            stroke: "currentColor",
            stroke_width: "2",
            circle { cx: "12", cy: "12", r: "4" }
            path { d: "M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" }
        }
    }
}

#[component]
pub fn IconMoon() -> Element {
    rsx! {
        svg {
            xmlns: "http://www.w3.org/2000/svg",
            width: "16",
            height: "16",
            view_box: "0 0 24 24",
            fill: "none",
            stroke: "currentColor",
            stroke_width: "2",
            path { d: "M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" }
        }
    }
}

#[component]
pub fn IconLock() -> Element {
    rsx! {
        svg {
            xmlns: "http://www.w3.org/2000/svg",
            width: "12",
            height: "12",
            view_box: "0 0 24 24",
            fill: "none",
            stroke: "currentColor",
            stroke_width: "2",
            rect { x: "3", y: "11", width: "18", height: "11", rx: "2" }
            path { d: "M7 11V7a5 5 0 0 1 10 0v4" }
        }
    }
}

#[component]
pub fn OutputPanel(
    title: String,
    value: String,
    #[props(default)] header_extra: Option<Element>,
    #[props(default)] empty_hint: Option<&'static str>,
    #[props(default)] language: CodeLanguage,
) -> Element {
    let is_empty = value.trim().is_empty();
    let copy_text = value.clone();
    rsx! {
        div {
            class: "zd-code-panel flex flex-col min-h-0 flex-1",
            div {
                class: "flex items-center justify-between px-3 py-2 border-b border-[var(--zd-border)] bg-[var(--zd-surface-raised)] shrink-0 gap-2",
                span { class: "zd-mono-label", "{title}" }
                div {
                    class: "flex items-center gap-2",
                    if let Some(extra) = header_extra {
                        {extra}
                    }
                    if !is_empty {
                        CopyButton { text: copy_text, label: "Copy" }
                    }
                }
            }
            div {
                class: "zd-code-panel-body relative flex-1 min-h-0 flex flex-col",
                if is_empty {
                    EmptyState {
                        icon: "···",
                        title: "No output yet",
                        hint: empty_hint.unwrap_or("Results will appear here."),
                    }
                } else {
                    CodeEditor {
                        value: value.clone(),
                        read_only: true,
                        language: language,
                    }
                }
            }
        }
    }
}
