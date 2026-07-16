use crate::shell::code_editor::{CodeEditor, CodeLanguage};
use crate::shell::empty_state::EmptyState;
use crate::state::{use_app_state, ToastKind};
use dioxus::prelude::*;

// ── Button ────────────────────────────────────────────────────────────────

#[derive(Props, Clone, PartialEq)]
pub struct ButtonProps {
    #[props(default)]
    pub variant: ButtonVariant,
    #[props(default)]
    pub size: ButtonSize,
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

#[allow(dead_code)]
#[derive(Clone, Copy, PartialEq, Default)]
pub enum ButtonSize {
    Small,
    #[default]
    Medium,
    Large,
}

#[component]
pub fn Button(props: ButtonProps) -> Element {
    let base = "inline-flex items-center justify-center gap-2 rounded-md font-medium tracking-[-0.01em] transition-[background-color,border-color,color,box-shadow] duration-[var(--zd-duration-fast)] disabled:opacity-45 disabled:pointer-events-none focus-ring btn-micro";
    let size = match props.size {
        ButtonSize::Small  => "px-2.5 py-1 text-xs",
        ButtonSize::Medium => "px-3.5 py-2 text-sm",
        ButtonSize::Large  => "px-4 py-2.5 text-sm",
    };
    let variant = match props.variant {
        ButtonVariant::Primary => {
            "bg-[var(--zd-primary)] text-[var(--zd-primary-fg)] shadow-[var(--zd-shadow-sm)] hover:bg-[var(--zd-primary-hover)]"
        }
        ButtonVariant::Secondary => {
            "border border-[var(--zd-border)] bg-[var(--zd-surface)] text-[var(--zd-text-primary)] hover:border-[var(--zd-border-hover)] hover:bg-[var(--zd-surface-raised)]"
        }
        ButtonVariant::Ghost => {
            "text-[var(--zd-text-secondary)] hover:bg-[var(--zd-surface-hover)] hover:text-[var(--zd-text-primary)]"
        }
    };
    rsx! {
        button {
            class: "{base} {size} {variant} {props.class}",
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
                    Kbd { "{sc}" }
                }
            }
        }
    }
}

// ── IconButton ────────────────────────────────────────────────────────────

#[derive(Props, Clone, PartialEq)]
pub struct IconButtonProps {
    pub label: String,
    #[props(default)]
    pub onclick: Option<EventHandler<MouseEvent>>,
    pub children: Element,
    #[props(default)]
    pub class: String,
}

#[component]
pub fn IconButton(props: IconButtonProps) -> Element {
    rsx! {
        button {
            class: "inline-flex items-center justify-center w-8 h-8 rounded-md text-[var(--zd-text-muted)] hover:bg-[var(--zd-primary-soft)] hover:text-[var(--zd-text-primary)] transition-colors focus-ring btn-micro {props.class}",
            title: "{props.label}",
            aria_label: "{props.label}",
            onclick: move |e| {
                if let Some(handler) = props.onclick {
                    handler.call(e);
                }
            },
            {props.children}
        }
    }
}

// ── CopyButton ────────────────────────────────────────────────────────────

#[component]
pub fn CopyButton(text: String, #[props(default)] label: &'static str) -> Element {
    let state = use_app_state();
    let display = label;
    rsx! {
        Button {
            variant: ButtonVariant::Ghost,
            class: "px-2 py-1 text-xs gap-1",
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
            IconCopy {}
            if !display.is_empty() { "{display}" }
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

pub async fn read_from_clipboard() -> Option<String> {
    #[cfg(target_arch = "wasm32")]
    {
        let mut eval = dioxus::document::eval(
            r#"
            (async () => {
                try {
                    let text = await navigator.clipboard.readText();
                    dioxus.send(text);
                } catch (e) {
                    dioxus.send(null);
                }
            })()
            "#
        );
        if let Ok(val) = eval.recv::<serde_json::Value>().await {
            if let serde_json::Value::String(s) = val {
                return Some(s);
            }
        }
        None
    }
    #[cfg(not(target_arch = "wasm32"))]
    {
        arboard::Clipboard::new()
            .and_then(|mut c| c.get_text())
            .ok()
    }
}

// ── InlineAlert ───────────────────────────────────────────────────────────

#[component]
pub fn InlineAlert(
    message: String,
    #[props(default)] variant: AlertVariant,
) -> Element {
    let (left_bar, bg, text_color) = match variant {
        AlertVariant::Error => (
            "var(--zd-error)",
            "var(--zd-error-soft)",
            "var(--zd-text-primary)",
        ),
        AlertVariant::Warning => (
            "var(--zd-warning)",
            "var(--zd-warning-soft)",
            "var(--zd-text-secondary)",
        ),
        AlertVariant::Info => (
            "var(--zd-info)",
            "var(--zd-info-soft)",
            "var(--zd-text-secondary)",
        ),
    };
    rsx! {
        div {
            class: "flex items-start gap-3 px-3.5 py-2.5 rounded-md text-sm border border-[var(--zd-border)]",
            style: "background: {bg}; border-left: 3px solid {left_bar};",
            role: "alert",
            span { class: "shrink-0 mt-0.5", style: "color: {left_bar};", IconAlert {} }
            span { style: "color: {text_color};", "{message}" }
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

// ── Badge ─────────────────────────────────────────────────────────────────

#[component]
pub fn Badge(
    children: Element,
    #[props(default)] variant: BadgeVariant,
) -> Element {
    let (bg, color) = match variant {
        BadgeVariant::Default => ("var(--zd-primary-soft)", "var(--zd-primary)"),
        BadgeVariant::Accent  => ("var(--zd-accent-soft)", "var(--zd-accent)"),
        BadgeVariant::Error   => ("var(--zd-error-soft)", "var(--zd-error)"),
        BadgeVariant::Muted   => ("var(--zd-surface-raised)", "var(--zd-text-muted)"),
    };
    rsx! {
        span {
            class: "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-semibold tracking-wide uppercase",
            style: "background: {bg}; color: {color};",
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
    Muted,
}

// ── Kbd — keyboard shortcut chip (single source of truth) ──────────────────

#[component]
pub fn Kbd(children: Element) -> Element {
    rsx! {
        kbd {
            class: "inline-flex items-center px-1.5 py-0.5 rounded border border-[var(--zd-border)] bg-[var(--zd-surface-raised)] text-[10px] font-mono font-medium leading-none text-[var(--zd-text-muted)]",
            {children}
        }
    }
}

// ── Toggle — switch for boolean preferences ────────────────────────────────

#[derive(Props, Clone, PartialEq)]
pub struct ToggleProps {
    pub checked: bool,
    pub on_change: EventHandler<bool>,
    #[props(default)]
    pub aria_label: Option<String>,
    #[props(default)]
    pub disabled: bool,
}

#[component]
pub fn Toggle(props: ToggleProps) -> Element {
    let knob = if props.checked { "translate-x-5" } else { "translate-x-0.5" };
    let track = if props.checked {
        "background: var(--zd-primary); border-color: var(--zd-primary);"
    } else {
        "background: var(--zd-surface-hover); border-color: var(--zd-border-hover);"
    };
    rsx! {
        button {
            type: "button",
            role: "switch",
            aria_checked: props.checked,
            aria_label: props.aria_label,
            disabled: props.disabled,
            class: "relative inline-flex items-center w-11 h-6 rounded-full border transition-colors duration-[var(--zd-duration-fast)] focus-ring btn-micro",
            style: "{track}",
            onclick: move |_| props.on_change.call(!props.checked),
            span {
                class: "inline-block w-4 h-4 bg-white rounded-full shadow-[var(--zd-shadow-sm)] transition-transform duration-[var(--zd-duration-normal)] {knob}",
            }
        }
    }
}

// ── Overlay — modal backdrop + positioning shell ───────────────────────────

#[derive(Clone, Copy, PartialEq, Default)]
pub enum OverlayAlign {
    #[default]
    Center,
    Top,
}

#[derive(Props, Clone, PartialEq)]
pub struct OverlayProps {
    pub on_close: EventHandler<()>,
    pub children: Element,
    #[props(default)]
    pub align: OverlayAlign,
    #[props(default)]
    pub z: &'static str,
    #[props(default)]
    pub padding: &'static str,
    #[props(default)]
    pub on_keydown: Option<EventHandler<Event<KeyboardData>>>,
}

#[component]
pub fn Overlay(props: OverlayProps) -> Element {
    let z = if props.z.is_empty() { "--zd-z-overlay" } else { props.z };
    let align_class = match props.align {
        OverlayAlign::Center => "items-center justify-center",
        OverlayAlign::Top    => "items-start justify-center pt-[14vh]",
    };
    let pad = if props.padding.is_empty() { "p-4" } else { props.padding };
    rsx! {
        div {
            class: "fixed inset-0 flex {align_class} {pad}",
            style: "z-index: var({z});",
            onkeydown: move |e| {
                if let Some(handler) = &props.on_keydown {
                    handler.call(e);
                }
            },
            div {
                class: "absolute inset-0 bg-black/50 backdrop-blur-sm zd-animate-fade",
                onclick: move |_| props.on_close.call(()),
            }
            {props.children}
        }
    }
}

// ── Modal — the panel inside an Overlay ────────────────────────────────────

#[derive(Props, Clone, PartialEq)]
pub struct ModalProps {
    pub children: Element,
    #[props(default)]
    pub max_width: &'static str,
    #[props(default)]
    pub max_height: &'static str,
    #[props(default)]
    pub class: String,
    #[props(default)]
    pub aria_label: Option<String>,
}

#[component]
pub fn Modal(props: ModalProps) -> Element {
    let mw = if props.max_width.is_empty() { "max-w-md" } else { props.max_width };
    let mh = if props.max_height.is_empty() { "" } else { props.max_height };
    rsx! {
        div {
            class: "relative w-full {mw} {mh} rounded-lg border border-[var(--zd-border)] bg-[var(--zd-surface)] shadow-[var(--zd-shadow-lg)] flex flex-col overflow-hidden zd-animate-slide-up {props.class}",
            role: "dialog",
            aria_modal: "true",
            aria_label: props.aria_label,
            onclick: move |e| e.stop_propagation(),
            {props.children}
        }
    }
}

// ── Card ──────────────────────────────────────────────────────────────────

#[component]
pub fn Card(children: Element) -> Element {
    rsx! {
        div {
            class: "rounded-lg border border-[var(--zd-border)] bg-[var(--zd-surface)] p-4 shadow-[var(--zd-shadow-sm)]",
            {children}
        }
    }
}

// ── Panel ─────────────────────────────────────────────────────────────────

#[component]
pub fn Panel(
    children: Element,
    #[props(default)] title: Option<String>,
    #[props(default)] actions: Option<Element>,
) -> Element {
    rsx! {
        div {
            class: "rounded-lg border border-[var(--zd-border)] bg-[var(--zd-surface)] overflow-hidden flex flex-col min-h-0",
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

// ── TabGroup ──────────────────────────────────────────────────────────────

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
            "inline-flex p-0.5 rounded-md border border-[var(--zd-border)] bg-[var(--zd-surface-raised)]"
        }
        TabVariant::Toolbar => "flex flex-wrap gap-1",
        TabVariant::Hub     => "flex gap-0.5 px-3 py-2 border-b border-[var(--zd-border)] bg-[var(--zd-surface-raised)] shrink-0 overflow-x-auto scrollbar-none",
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
                        TabVariant::Segmented if is_active => {
                            "px-3 py-1.5 rounded text-xs font-medium bg-[var(--zd-surface)] text-[var(--zd-text-primary)] shadow-[var(--zd-shadow-sm)]"
                        }
                        TabVariant::Segmented => {
                            "px-3 py-1.5 rounded text-xs font-medium text-[var(--zd-text-muted)] hover:text-[var(--zd-text-primary)] transition-colors"
                        }
                        TabVariant::Toolbar if is_active => "toolbar-btn toolbar-btn-active",
                        TabVariant::Toolbar               => "toolbar-btn",
                        TabVariant::Hub if is_active => {
                            "px-3 py-1.5 rounded text-xs font-medium font-mono text-[var(--zd-primary)] bg-[var(--zd-primary-soft)] shrink-0"
                        }
                        TabVariant::Hub => {
                            "px-3 py-1.5 rounded text-xs font-medium font-mono text-[var(--zd-text-muted)] hover:text-[var(--zd-text-primary)] hover:bg-[var(--zd-surface-hover)] transition-colors shrink-0"
                        }
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

// ── Textarea ──────────────────────────────────────────────────────────────

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
            class: "w-full h-full min-h-[6rem] p-4 font-mono text-sm bg-transparent text-[var(--zd-text-primary)] border-0 resize-none focus:outline-none custom-scrollbar {class}",
            value: "{value}",
            placeholder: "{placeholder}",
            rows: "{rows}",
            oninput: move |e| oninput.call(e),
        }
    }
}

// ── Input ─────────────────────────────────────────────────────────────────

#[component]
pub fn Input(
    value: String,
    oninput: EventHandler<Event<FormData>>,
    #[props(default)] placeholder: String,
    #[props(default)] class: String,
) -> Element {
    rsx! {
        input {
            class: "w-full px-3 py-2 rounded-md border border-[var(--zd-border)] bg-[var(--zd-surface-raised)] text-[var(--zd-text-primary)] font-mono text-sm focus-ring transition-colors focus:border-[var(--zd-primary)] {class}",
            value: "{value}",
            placeholder: "{placeholder}",
            oninput: move |e| oninput.call(e),
        }
    }
}

// ── Select ────────────────────────────────────────────────────────────────

#[component]
pub fn Select(
    value: String,
    onchange: EventHandler<Event<FormData>>,
    options: Vec<(&'static str, &'static str)>,
    #[props(default)] class: String,
) -> Element {
    rsx! {
        select {
            class: "px-3 py-1.5 rounded-md border border-[var(--zd-border)] bg-[var(--zd-surface-raised)] text-sm text-[var(--zd-text-primary)] focus-ring transition-colors {class}",
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

// ── SectionLabel ──────────────────────────────────────────────────────────

#[component]
pub fn SectionLabel(children: Element) -> Element {
    rsx! {
        span { class: "zd-mono-label", {children} }
    }
}

// ── OutputPanel ───────────────────────────────────────────────────────────

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
                    class: "flex items-center gap-1.5",
                    if let Some(extra) = header_extra { {extra} }
                    if !is_empty {
                        CopyButton { text: copy_text, label: "" }
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

// ── Shared Icons ──────────────────────────────────────────────────────────

#[component]
pub fn IconSearch() -> Element {
    rsx! {
        svg {
            xmlns: "http://www.w3.org/2000/svg",
            width: "14", height: "14",
            view_box: "0 0 24 24",
            fill: "none", stroke: "currentColor", stroke_width: "2",
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
            width: "15", height: "15",
            view_box: "0 0 24 24",
            fill: "none", stroke: "currentColor", stroke_width: "2",
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
            width: "15", height: "15",
            view_box: "0 0 24 24",
            fill: "none", stroke: "currentColor", stroke_width: "2",
            path { d: "M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" }
        }
    }
}

#[component]
pub fn IconLock() -> Element {
    rsx! {
        svg {
            xmlns: "http://www.w3.org/2000/svg",
            width: "12", height: "12",
            view_box: "0 0 24 24",
            fill: "none", stroke: "currentColor", stroke_width: "2",
            rect { x: "3", y: "11", width: "18", height: "11", rx: "2" }
            path { d: "M7 11V7a5 5 0 0 1 10 0v4" }
        }
    }
}

#[component]
fn IconCopy() -> Element {
    rsx! {
        svg {
            width: "12", height: "12",
            fill: "none", stroke: "currentColor",
            stroke_width: "2", stroke_linecap: "round", stroke_linejoin: "round",
            view_box: "0 0 24 24",
            rect { x: "9", y: "9", width: "13", height: "13", rx: "2" }
            path { d: "M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" }
        }
    }
}

#[component]
fn IconAlert() -> Element {
    rsx! {
        svg {
            width: "14", height: "14",
            fill: "none", stroke: "currentColor",
            stroke_width: "2", stroke_linecap: "round", stroke_linejoin: "round",
            view_box: "0 0 24 24",
            circle { cx: "12", cy: "12", r: "10" }
            line { x1: "12", y1: "8", x2: "12", y2: "12" }
            line { x1: "12", y1: "16", x2: "12.01", y2: "16" }
        }
    }
}

#[component]
pub fn IconClose() -> Element {
    rsx! {
        svg {
            width: "14", height: "14",
            fill: "none", stroke: "currentColor",
            stroke_width: "2", stroke_linecap: "round", stroke_linejoin: "round",
            view_box: "0 0 24 24",
            line { x1: "18", y1: "6", x2: "6", y2: "18" }
            line { x1: "6", y1: "6", x2: "18", y2: "18" }
        }
    }
}
