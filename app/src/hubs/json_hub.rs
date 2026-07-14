use crate::shell::drag_drop::DragDropZone;
use crate::shell::export::ExportButton;
use crate::shell::layout::{CodePanel, HubToolHeader, ModeToggle, ToolBody, ToolPage, ToolToolbar, ToolWorkspace};
use crate::shell::code_editor::CodeLanguage;
use crate::shell::pipeline::SendToButton;
use crate::shell::ui::{Button, ButtonVariant, SegmentedControl, TabGroup};
use crate::shell::virtual_code_editor::VirtualCodeEditor;
use crate::state::{use_app_state, use_primary_action, ToastKind};
use dioxus::prelude::*;
use ropey::Rope;
use std::collections::HashSet;
use zerodock_core::{convert_json_to_types, format_json_opts, jmespath_query, json_to_yaml, repair_json, yaml_to_json, TargetLang};
use zerodock_indexer::JsonIndex;
use zerodock_platform::{HttpRequest, PlatformServices};

const VISIBLE_ROWS: usize = 40;
const ROW_HEIGHT: usize = 28;

/// Files at or above this size switch the live editor panel from the
/// String-backed `CodePanel`/`CodeEditor` to the Rope-backed, viewport-
/// virtualized `VirtualCodeEditor`. Below this threshold the existing
/// code path is used completely unchanged.
const LARGE_FILE_THRESHOLD_BYTES: usize = 2 * 1024 * 1024;

#[derive(Clone, PartialEq)]
pub struct FileTab {
    pub id: String,
    pub name: String,
    pub content: String,
    pub is_modified: bool,
}

#[component]
pub fn WorkspaceTabBar(
    tabs: Signal<Vec<FileTab>>,
    active_id: Signal<String>,
    on_select: EventHandler<String>,
    on_close: EventHandler<String>,
    on_add: EventHandler<()>,
    on_rename: EventHandler<(String, String)>,
    on_reorder: EventHandler<(usize, usize)>,
) -> Element {
    let mut renaming_id = use_signal(|| None::<String>);
    let mut rename_value = use_signal(String::new);
    let mut find_open = use_signal(|| false);
    let mut find_query = use_signal(String::new);
    let mut drag_from = use_signal(|| None::<usize>);

    let filtered_tabs: Vec<FileTab> = {
        let q = find_query.read().to_lowercase();
        tabs.read()
            .iter()
            .filter(|t| q.is_empty() || t.name.to_lowercase().contains(&q))
            .cloned()
            .collect()
    };

    rsx! {
        div { class: "flex items-center bg-[var(--zd-surface-raised)] border-b border-[var(--zd-border)] shrink-0 pr-3",
            div { class: "flex items-center gap-1 px-3 py-1.5 overflow-x-auto custom-scrollbar select-none flex-1 min-w-0",
            for (idx, tab) in tabs.read().iter().enumerate() {
                {
                    let id = tab.id.clone();
                    let name = tab.name.clone();
                    let is_active = *active_id.read() == id;
                    let is_renaming = renaming_id.read().as_ref() == Some(&id);
                    let active_class = if is_active {
                        "bg-[var(--zd-surface)] text-[var(--zd-text-primary)] border-b-2 border-[var(--zd-primary)] shadow-sm"
                    } else {
                        "text-[var(--zd-text-muted)] hover:text-[var(--zd-text-secondary)] hover:bg-[var(--zd-surface)]/50"
                    };
                    let close_id = id.clone();
                    let rename_tab_id = id.clone();
                    rsx! {
                        div {
                            key: "{id}",
                            class: "group flex items-center gap-2 px-3 py-1 rounded-t-lg text-xs font-mono cursor-pointer transition-all duration-150 {active_class}",
                            draggable: true,
                            onclick: {
                                let id = id.clone();
                                move |_| on_select.call(id.clone())
                            },
                            ondoubleclick: {
                                let id = id.clone();
                                let name = name.clone();
                                move |_| {
                                    renaming_id.set(Some(id.clone()));
                                    rename_value.set(name.clone());
                                }
                            },
                            ondragstart: move |_| drag_from.set(Some(idx)),
                            ondragover: move |e| e.prevent_default(),
                            ondrop: move |_| {
                                if let Some(from) = *drag_from.read() {
                                    if from != idx {
                                        on_reorder.call((from, idx));
                                    }
                                }
                                drag_from.set(None);
                            },
                            if is_renaming {
                                input {
                                    class: "w-24 px-1 py-0.5 text-xs font-mono bg-[var(--zd-surface-raised)] border border-[var(--zd-border)] rounded",
                                    value: "{rename_value}",
                                    oninput: move |e: Event<FormData>| rename_value.set(e.value()),
                                    onkeydown: move |e: Event<KeyboardData>| {
                                        if e.key() == Key::Enter {
                                            let new_name = rename_value.read().clone();
                                            if !new_name.trim().is_empty() {
                                                on_rename.call((rename_tab_id.clone(), new_name));
                                            }
                                            renaming_id.set(None);
                                        }
                                        if e.key() == Key::Escape {
                                            renaming_id.set(None);
                                        }
                                    },
                                    onblur: move |_| renaming_id.set(None),
                                }
                            } else {
                                span { "{name}" }
                            }
                            if tab.is_modified {
                                span { class: "zd-status-dot inline-block", aria_hidden: "true" }
                            }
                            if tabs.read().len() > 1 {
                                button {
                                    class: "opacity-0 group-hover:opacity-100 hover:text-[var(--zd-accent)] transition-opacity px-1 rounded hover:bg-[var(--zd-surface-raised)]",
                                    aria_label: "Close tab",
                                    onclick: {
                                        move |e: Event<MouseData>| {
                                            e.stop_propagation();
                                            on_close.call(close_id.clone());
                                        }
                                    },
                                    "×"
                                }
                            }
                        }
                    }
                }
            }
                button {
                    class: "w-6 h-6 ml-1 flex items-center justify-center shrink-0 rounded-lg text-xs text-[var(--zd-text-muted)] hover:text-[var(--zd-text-primary)] hover:bg-[var(--zd-surface)] transition-colors",
                    title: "New Tab",
                    onclick: move |_| on_add.call(()),
                    "+"
                }
            }
            div { class: "relative ml-2 shrink-0",
                button {
                    class: "toolbar-btn",
                    title: "Find tab",
                    onclick: move |_| {
                        let next = !*find_open.read();
                        find_open.set(next);
                    },
                    "Tabs"
                }
                if *find_open.read() {
                    div {
                        class: "absolute right-0 top-full mt-1 z-[var(--zd-z-dropdown)] w-56 rounded-md border border-[var(--zd-border)] bg-[var(--zd-surface-raised)] shadow-[var(--zd-shadow-lg)] p-2",
                        input {
                            class: "w-full px-2 py-1.5 text-xs font-mono rounded border border-[var(--zd-border)] bg-[var(--zd-surface)] focus-ring mb-2",
                            placeholder: "Search tabs…",
                            value: "{find_query}",
                            oninput: move |e: Event<FormData>| find_query.set(e.value()),
                        }
                        div { class: "max-h-40 overflow-y-auto custom-scrollbar space-y-0.5",
                            for tab in filtered_tabs {
                                button {
                                    class: "w-full text-left px-2 py-1.5 text-xs font-mono rounded hover:bg-[var(--zd-primary-soft)] truncate",
                                    onclick: {
                                        let id = tab.id.clone();
                                        move |_| {
                                            on_select.call(id.clone());
                                            find_open.set(false);
                                        }
                                    },
                                    "{tab.name}"
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

#[component]
pub fn JsonHub(initial_panel: Option<String>) -> Element {
    let platform = use_context::<PlatformServices>();
    let mut state = use_app_state();
    
    let mut tabs = use_signal(|| vec![
        FileTab {
            id: "tab_1".to_string(),
            name: "data.json".to_string(),
            content: r#"{"name":"ZeroDock","version":1,"features":["rust","dioxus"]}"#.to_string(),
            is_modified: false,
        }
    ]);
    let mut active_tab_id = use_signal(|| "tab_1".to_string());

    // Rope mirror of the active tab's content, used only by the large-file
    // (virtualized) editor path. Kept separate from `FileTab.content: String`
    // so every other panel (tree/table/yaml/types/path/diff) is unaffected —
    // they keep reading `get_active_content()` snapshots exactly as before.
    let mut active_rope = use_signal(|| Rope::from_str(
        r#"{"name":"ZeroDock","version":1,"features":["rust","dioxus"]}"#,
    ));
    // Tracks which tab `active_rope` currently mirrors, so switching tabs
    // reloads the Rope from that tab's String content instead of leaking
    // the previous tab's buffer into the newly active one.
    let mut active_rope_tab_id = use_signal(|| "tab_1".to_string());

    let get_active_content = move || {
        tabs.read()
            .iter()
            .find(|t| t.id == *active_tab_id.read())
            .map(|t| t.content.clone())
            .unwrap_or_default()
    };

    let is_large_file = move || get_active_content().len() >= LARGE_FILE_THRESHOLD_BYTES;

    // Keep `active_rope` in sync with whichever tab is active: reload it
    // whenever the active tab id changes (tab switch, new tab, import).
    use_effect(move || {
        let id = active_tab_id.read().clone();
        if *active_rope_tab_id.peek() != id {
            let text = tabs
                .read()
                .iter()
                .find(|t| t.id == id)
                .map(|t| t.content.clone())
                .unwrap_or_default();
            active_rope.set(Rope::from_str(&text));
            active_rope_tab_id.set(id);
        }
    });

    // `tabs[].content` is the single source of truth every panel (Tree,
    // Table, YAML, Types, Path, Diff, Format, Repair) reads via
    // `get_active_content()`. `active_rope` is a kept-in-sync mirror used only
    // by `VirtualCodeEditor` for large-file windowed rendering. Every site
    // that replaces the active tab's content wholesale (as opposed to the
    // targeted per-edit Rope mutation `VirtualCodeEditor` already does
    // in-place) must update BOTH signals in the same call, or the two can
    // diverge and the large-file editor / Tree view show stale content.
    let mut set_active_content = move |val: String| {
        let active_id = active_tab_id.peek().clone();
        tabs.write().iter_mut().for_each(|t| {
            if t.id == active_id {
                t.content = val.clone();
                t.is_modified = true;
            }
        });
        active_rope.set(Rope::from_str(&val));
        active_rope_tab_id.set(active_id);
    };

    // Applies a targeted (char_start, char_end, replacement) edit coming from
    // `VirtualCodeEditor` — the Rope itself was already mutated in place by
    // the editor (O(log n)), so this only needs to mirror the resulting text
    // back into `FileTab.content` for the other (non-virtualized) panels.
    // This still materializes a full String, but only once per edit and only
    // for large files that already opted into the virtualized path — the
    // per-keystroke Rope mutation itself never touches the full-file String.
    // Deliberately does NOT call `active_rope.set(...)` (unlike
    // `set_active_content`/`import_into_tab`) since the Rope here is already
    // current — re-setting it would be redundant and would reset
    // `active_rope_tab_id` unnecessarily.
    let mut sync_active_content_from_rope = move || {
        let active_id = active_tab_id.peek().clone();
        let text = active_rope.peek().to_string();
        tabs.write().iter_mut().for_each(|t| {
            if t.id == active_id {
                t.content = text.clone();
                t.is_modified = true;
            }
        });
    };

    let mut import_into_tab = move |name: String, val: String| {
        let active_id = active_tab_id.peek().clone();
        tabs.write().iter_mut().for_each(|t| {
            if t.id == active_id {
                t.name = name.clone();
                t.content = val.clone();
                t.is_modified = true;
            }
        });
        active_rope.set(Rope::from_str(&val));
        active_rope_tab_id.set(active_id);
    };

    let mut panel = use_signal(move || initial_panel.clone().unwrap_or_else(|| "editor".to_string()));
    let mut view_mode = use_signal(|| "editor".to_string());
    let mut format_error = use_signal(|| None::<String>);
    let mut index = use_signal(|| None::<JsonIndex>);
    let mut indexing = use_signal(|| false);
    
    let mut show_settings = use_signal(|| false);
    let mut indent_size = use_signal(|| 2usize);
    let mut sort_keys = use_signal(|| false);
    let mut show_import_url = use_signal(|| false);
    let mut import_url = use_signal(String::new);
    let mut import_loading = use_signal(|| false);

    // "Send to JSON Toolkit" must land in the active editor tab. The editor reads
    // from `tabs` (via get_active_content), not a side signal, so consume the
    // pipeline payload here and write it into the active tab directly. Previously
    // the payload was written to a standalone signal the editor never read.
    let mut pipeline_state = state.clone();
    use_effect(move || {
        if let Some(payload) = pipeline_state.take_pipeline_payload() {
            if payload.source_tool != "json-toolkit" {
                set_active_content(payload.content.clone());
                pipeline_state.toast(
                    format!("Received from {}", payload.label),
                    ToastKind::Info,
                );
            }
        }
    });

    let mut visit_state = state.clone();
    use_effect(move || {
        visit_state.record_tool_visit("json-toolkit");
    });

    let mut rebuild_index = move |text: String| {
        indexing.set(true);
        if let Ok(idx) = JsonIndex::from_bytes(text.as_bytes()) {
            index.set(Some(idx));
            format_error.set(None);
        } else {
            index.set(None);
        }
        indexing.set(false);
    };

    let current_text = get_active_content();
    use_effect(move || {
        rebuild_index(current_text.clone());
    });

    use_primary_action(move || {
        let text = get_active_content();
        match format_json_opts(&text, *indent_size.read(), *sort_keys.read()) {
            Ok(f) => {
                set_active_content(f.clone());
                format_error.set(None);
            }
            Err(e) => format_error.set(Some(e.to_string())),
        }
    });

    let header_tab = if *view_mode.read() != "editor" {
        view_mode.read().clone()
    } else {
        panel.read().clone()
    };

    let hub_description = if platform.is_desktop {
        "Format, explore, and query JSON — supports large files via mmap on desktop".to_string()
    } else {
        "Format, explore, and query JSON — up to ~500MB on web".to_string()
    };

    rsx! {
        ToolPage {
            div {
                class: "zd-tool-fill flex flex-col min-h-0",
            HubToolHeader {
                hub_id: "json-toolkit",
                hub_title: "JSON Toolkit",
                hub_description: hub_description,
                active_tab: header_tab,
            }
            WorkspaceTabBar {
                tabs: tabs,
                active_id: active_tab_id,
                on_select: EventHandler::new(move |id: String| active_tab_id.set(id)),
                on_close: EventHandler::new(move |id: String| {
                    let mut list = tabs.write();
                    if list.len() > 1 {
                        list.retain(|t| t.id != id);
                        if *active_tab_id.read() == id {
                            if let Some(first) = list.first() {
                                active_tab_id.set(first.id.clone());
                            }
                        }
                    }
                }),
                on_add: EventHandler::new(move |_| {
                    let new_id = format!("tab_{}", tabs.read().len() + 1);
                    let new_name = format!("Untitled {}", tabs.read().len() + 1);
                    tabs.write().push(FileTab {
                        id: new_id.clone(),
                        name: new_name,
                        content: "{\n  \n}".to_string(),
                        is_modified: false,
                    });
                    active_tab_id.set(new_id);
                }),
                on_rename: EventHandler::new(move |(id, new_name): (String, String)| {
                    tabs.write().iter_mut().for_each(|t| {
                        if t.id == id {
                            t.name = new_name.clone();
                        }
                    });
                }),
                on_reorder: EventHandler::new(move |(from, to): (usize, usize)| {
                    let mut list = tabs.write();
                    if from < list.len() && to < list.len() && from != to {
                        let item = list.remove(from);
                        list.insert(to, item);
                    }
                }),
            }
            ToolWorkspace {
                toolbar: rsx! {
                    div { class: "flex flex-col w-full",
                        ToolToolbar {
                            div { class: "zd-toolbar-group",
                                span { class: "zd-toolbar-group-label", "View" }
                                ModeToggle { active: *view_mode.read() == "editor" && *panel.read() == "editor", onclick: move |_| { view_mode.set("editor".into()); panel.set("editor".into()); }, "Editor" }
                                ModeToggle { active: *view_mode.read() == "tree", onclick: move |_| view_mode.set("tree".into()), "Tree" }
                                ModeToggle { active: *view_mode.read() == "table", onclick: move |_| view_mode.set("table".into()), "Table" }
                                ModeToggle { active: *view_mode.read() == "diff", onclick: move |_| view_mode.set("diff".into()), "Diff" }
                            }
                            div { class: "zd-toolbar-group",
                                span { class: "zd-toolbar-group-label", "Panels" }
                                ModeToggle { active: *panel.read() == "yaml", onclick: move |_| { panel.set("yaml".into()); view_mode.set("editor".into()); }, "YAML" }
                                ModeToggle { active: *panel.read() == "types", onclick: move |_| { panel.set("types".into()); view_mode.set("editor".into()); }, "Types" }
                                ModeToggle { active: *panel.read() == "path", onclick: move |_| { panel.set("path".into()); view_mode.set("editor".into()); }, "Path" }
                            }
                            div { class: "zd-toolbar-group",
                                span { class: "zd-toolbar-group-label", "Format" }
                                Button {
                                    onclick: move |_| {
                                        let text = get_active_content();
                                        match format_json_opts(&text, *indent_size.read(), *sort_keys.read()) {
                                            Ok(f) => {
                                                set_active_content(f.clone());
                                                format_error.set(None);
                                            }
                                            Err(e) => format_error.set(Some(e.to_string())),
                                        }
                                    },
                                    "Format"
                                }
                                Button {
                                    onclick: move |_| {
                                        let text = get_active_content();
                                        match repair_json(&text) {
                                            Ok(f) => {
                                                set_active_content(f.clone());
                                                format_error.set(None);
                                            }
                                            Err(e) => format_error.set(Some(e.to_string())),
                                        }
                                    },
                                    "Repair"
                                }
                                Button {
                                    variant: ButtonVariant::Ghost,
                                    class: "px-2 py-1 text-xs",
                                    onclick: move |_| {
                                        let next = !*show_settings.read();
                                        show_settings.set(next);
                                    },
                                    "Options"
                                }
                            }
                            div { class: "zd-toolbar-group",
                                span { class: "zd-toolbar-group-label", "Import" }
                                label {
                                    class: "toolbar-btn cursor-pointer inline-flex items-center gap-1",
                                    title: "Open JSON file from device",
                                    "Open File"
                                    input {
                                        r#type: "file",
                                        accept: ".json,application/json,.txt",
                                        class: "hidden",
                                        onchange: move |evt: Event<FormData>| {
                                            if let Some(file) = evt.files().first() {
                                                let mut import_into = import_into_tab.clone();
                                                let file_name = file.name();
                                                let file_data = file.clone();
                                                spawn(async move {
                                                    if let Ok(contents) = file_data.read_string().await {
                                                        import_into(file_name, contents);
                                                    }
                                                });
                                            }
                                        }
                                    }
                                }
                                Button {
                                    variant: ButtonVariant::Ghost,
                                    class: "px-2 py-1 text-xs",
                                    onclick: move |_| {
                                        let next = !*show_import_url.read();
                                        show_import_url.set(next);
                                    },
                                    "From URL"
                                }
                            }
                            div { class: "zd-toolbar-group",
                                span { class: "zd-toolbar-group-label", "Send" }
                                SendToButton { source_tool_id: "json-toolkit", content: get_active_content(), json_only: true }
                            }
                            if *indexing.read() {
                                span { class: "text-xs text-[var(--zd-text-muted)] zd-mono-label ml-2", "Indexing…" }
                            }
                        }
                        if *show_import_url.read() {
                            div { class: "px-4 py-2 bg-[var(--zd-surface-raised)] border-b border-[var(--zd-border)] flex items-center gap-2",
                                span { class: "text-xs font-mono text-[var(--zd-text-secondary)] shrink-0", "Fetch JSON URL:" }
                                input {
                                    class: "flex-1 max-w-md px-2.5 py-1 text-xs font-mono rounded border border-[var(--zd-border)] bg-[var(--zd-surface)] text-[var(--zd-text-primary)] focus-ring",
                                    placeholder: "https://api.example.com/data.json",
                                    value: "{import_url}",
                                    oninput: move |e: Event<FormData>| import_url.set(e.value()),
                                }
                                Button {
                                    disabled: *import_loading.read() || import_url.read().trim().is_empty(),
                                    onclick: move |_| {
                                        let url_val = import_url.read().trim().to_string();
                                        if url_val.is_empty() {
                                            return;
                                        }
                                        import_loading.set(true);
                                        let platform = platform.clone();
                                        let mut state = state.clone();
                                        let mut set_content = set_active_content.clone();
                                        spawn(async move {
                                            let req = HttpRequest {
                                                method: "GET".to_string(),
                                                url: url_val,
                                                headers: vec![],
                                                body: None,
                                            };
                                            match platform.http.send(req).await {
                                                Ok(resp) => {
                                                    set_content(resp.body);
                                                    show_import_url.set(false);
                                                    import_url.set(String::new());
                                                    state.toast("Imported JSON from URL", ToastKind::Success);
                                                }
                                                Err(e) => state.toast(e.to_string(), ToastKind::Error),
                                            }
                                            import_loading.set(false);
                                        });
                                    },
                                    if *import_loading.read() { "Fetching…" } else { "Import" }
                                }
                                button {
                                    class: "text-xs text-[var(--zd-text-muted)] hover:text-[var(--zd-text-primary)] ml-1 px-1",
                                    onclick: move |_| show_import_url.set(false),
                                    "Cancel"
                                }
                            }
                        }
                        if *show_settings.read() {
                            div { class: "px-4 py-2 bg-[var(--zd-surface-raised)] border-b border-[var(--zd-border)] flex flex-wrap items-center gap-4 text-xs font-mono text-[var(--zd-text-secondary)]",
                                div { class: "flex items-center gap-2",
                                    span { "Indent:" }
                                    for (label, val) in [("2 spaces", 2usize), ("4 spaces", 4usize), ("Tab", 0usize)] {
                                        {
                                            let is_sel = *indent_size.read() == val;
                                            rsx! {
                                                button {
                                                    class: if is_sel { "px-2 py-0.5 rounded bg-[var(--zd-primary)] text-[var(--zd-primary-fg)] font-semibold" } else { "px-2 py-0.5 rounded bg-[var(--zd-surface)] hover:text-[var(--zd-text-primary)]" },
                                                    onclick: move |_| indent_size.set(val),
                                                    "{label}"
                                                }
                                            }
                                        }
                                    }
                                }
                                div { class: "flex items-center gap-2",
                                    label { class: "flex items-center gap-1.5 cursor-pointer select-none",
                                        input {
                                            type: "checkbox",
                                            checked: *sort_keys.read(),
                                            onchange: move |e| sort_keys.set(e.checked()),
                                            class: "rounded border-[var(--zd-border)] bg-[var(--zd-surface)] text-[var(--zd-primary)]"
                                        }
                                        "Sort Object Keys"
                                    }
                                }
                            }
                        }
                    }
                },
                ToolBody {
                    DragDropZone {
                        on_drop_text: EventHandler::new(move |t| set_active_content(t)),
                        if *view_mode.read() == "tree" {
                            VirtualTreeView {
                                content: get_active_content(),
                                index: index.read().clone(),
                            }
                        } else if *view_mode.read() == "table" {
                            VirtualTableView {
                                content: get_active_content(),
                            }
                        } else if *view_mode.read() == "diff" {
                            DiffViewPanel {
                                original_content: get_active_content(),
                            }
                        } else if *panel.read() == "yaml" {
                            YamlPanel {
                                content: get_active_content(),
                                on_apply: EventHandler::new(move |v| {
                                    set_active_content(v);
                                    format_error.set(None);
                                }),
                            }
                        } else if *panel.read() == "types" {
                            TypesPanel { content: get_active_content() }
                        } else if *panel.read() == "path" {
                            PathPanel { content: get_active_content() }
                        } else if is_large_file() {
                            // Large-file path: Rope-backed, viewport-virtualized
                            // editor. Scroll/typing cost is O(visible lines),
                            // not O(file size) — see VirtualCodeEditor.
                            div {
                                class: "zd-code-panel border-b md:border-b-0 md:border-r border-[var(--zd-border)] flex flex-col min-h-0 flex-1",
                                div {
                                    class: "flex items-center justify-between px-3 py-2 border-b border-[var(--zd-border)] bg-[var(--zd-surface-raised)] shrink-0 gap-2",
                                    span { class: "zd-mono-label", "JSON Editor" }
                                    span {
                                        class: "text-xs text-[var(--zd-text-muted)] zd-mono-label",
                                        title: "Large file: using windowed rendering for smooth scroll/typing",
                                        "LARGE FILE MODE"
                                    }
                                }
                                div {
                                    class: "zd-code-panel-body relative flex-1 min-h-0 flex flex-col",
                                    VirtualCodeEditor {
                                        buffer: active_rope,
                                        on_edit_range: Some(EventHandler::new(move |_range: (usize, usize, String)| {
                                            sync_active_content_from_rope();
                                        })),
                                        placeholder: "Enter or paste JSON...",
                                        language: CodeLanguage::Json,
                                    }
                                    if let Some(err) = format_error.read().clone() {
                                        p {
                                            class: "px-4 py-2 text-sm text-[var(--zd-error)] border-t border-[var(--zd-border)] shrink-0",
                                            role: "alert",
                                            "{err}"
                                        }
                                    }
                                }
                            }
                        } else {
                            CodePanel {
                                title: "JSON Editor".to_string(),
                                value: get_active_content(),
                                oninput: Some(EventHandler::new(move |e: Event<FormData>| set_active_content(e.value()))),
                                on_edit: Some(EventHandler::new(move |v: String| set_active_content(v))),
                                placeholder: "Enter or paste JSON...",
                                error: format_error.read().clone(),
                                language: CodeLanguage::Json,
                                header_actions: rsx! {
                                    ExportButton {
                                        filename: "data.json",
                                        content: get_active_content(),
                                        label: "Download",
                                    }
                                },
                            }
                        }
                    }
                }
            }
            }
        }
    }
}

#[derive(Clone, PartialEq)]
struct TreeRow {
    id: u32,
    depth: usize,
    node_type: zerodock_indexer::NodeType,
    key: Option<String>,
    val_preview: String,
    child_count: u32,
    has_children: bool,
}

#[component]
fn VirtualTreeView(content: String, index: Option<JsonIndex>) -> Element {
    let mut scroll_top = use_signal(|| 0usize);
    let mut expanded_nodes = use_signal(|| {
        let mut set = HashSet::new();
        set.insert(0);
        set
    });

    // Compute rows directly from the `content` and `index` props so the tree
    // reflects the current JSON. A `use_memo` over owned prop clones would keep
    // showing the first snapshot after edits or Format.
    let rows: Vec<TreeRow> = if let Some(idx) = index.as_ref() {
        flatten_tree_interactive(&content, idx, 0, 0, &expanded_nodes.read())
    } else {
        Vec::new()
    };

    let total = rows.len();
    let start = (*scroll_top.read() / ROW_HEIGHT).min(total);
    let end = (start + VISIBLE_ROWS).min(total);
    let visible = if total > 0 { rows[start..end].to_vec() } else { Vec::new() };
    let offset_y = start * ROW_HEIGHT;

    rsx! {
        div {
            class: "zd-tool-fill overflow-auto custom-scrollbar font-mono text-sm select-none",
            onscroll: move |e| scroll_top.set(e.scroll_top() as usize),
            if index.is_none() {
                div { class: "p-4 text-[var(--zd-error)] font-mono", "Invalid JSON structure" }
            } else if total == 0 {
                div { class: "p-4 text-[var(--zd-text-muted)] italic", "Empty JSON object" }
            } else {
                div {
                    style: "height: {total * ROW_HEIGHT}px; position: relative;",
                    div {
                        style: "position: absolute; top: {offset_y}px; left: 0; right: 0;",
                        for row in visible {
                            {
                                let node_id = row.id;
                                let has_children = row.has_children;
                                let is_open = expanded_nodes.read().contains(&node_id);
                                let depth_px = row.depth * 16 + 12;
                                let key_str = row.key.clone();
                                let val_str = row.val_preview.clone();
                                let type_str = format!("{:?}", row.node_type);
                                let child_cnt = row.child_count;
                                
                                let val_color = match row.node_type {
                                    zerodock_indexer::NodeType::String => "text-[var(--zd-text-primary)]",
                                    zerodock_indexer::NodeType::Number => "text-[var(--zd-primary)] font-semibold",
                                    zerodock_indexer::NodeType::Boolean => "text-[var(--zd-accent)] font-semibold",
                                    zerodock_indexer::NodeType::Null => "text-[var(--zd-text-muted)] italic",
                                    _ => "text-[var(--zd-text-secondary)]",
                                };

                                rsx! {
                                    div {
                                        key: "{node_id}",
                                        style: "height: {ROW_HEIGHT}px; padding-left: {depth_px}px;",
                                        class: "flex items-center gap-1.5 border-b border-[var(--zd-border)] hover:bg-[var(--zd-surface-raised)]/60 transition-colors duration-150 cursor-pointer pr-4",
                                        onclick: move |_| {
                                            if has_children {
                                                let mut set = expanded_nodes.write();
                                                if is_open {
                                                    set.remove(&node_id);
                                                } else {
                                                    set.insert(node_id);
                                                }
                                            }
                                        },
                                        if has_children {
                                            span { class: "w-4 h-4 flex items-center justify-center text-xs text-[var(--zd-text-muted)] hover:text-[var(--zd-primary)] transition-transform duration-150",
                                                if is_open { "▾" } else { "▸" }
                                            }
                                        } else {
                                            span { class: "w-4 h-4 flex items-center justify-center text-[10px] text-[var(--zd-text-muted)] opacity-40", "•" }
                                        }
                                        if let Some(k) = key_str {
                                            span { class: "text-[var(--zd-primary)] font-medium", "\"{k}\":" }
                                        }
                                        if has_children {
                                            span { class: "text-xs bg-[var(--zd-surface-raised)] border border-[var(--zd-border)] px-1.5 py-0.5 rounded text-[var(--zd-text-muted)] font-mono",
                                                "{type_str}{{{child_cnt}}}"
                                            }
                                        } else {
                                            span { class: "{val_color} truncate max-w-xl", "{val_str}" }
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
}

fn flatten_tree_interactive(
    content: &str,
    index: &JsonIndex,
    parent_id: u32,
    depth: usize,
    expanded: &HashSet<u32>,
) -> Vec<TreeRow> {
    let mut rows = Vec::new();
    if depth > 50 {
        return rows;
    }
    for node in index.children(parent_id) {
        let slice = std::str::from_utf8(index.slice(content.as_bytes(), node)).unwrap_or("?");
        let (key_opt, val_preview) = if let Some(colon_idx) = slice.find(':') {
            let k = slice[..colon_idx].trim().trim_matches('"').to_string();
            let v = slice[colon_idx + 1..].trim();
            let preview = if v.len() > 80 { format!("{}...", &v[..80]) } else { v.to_string() };
            (Some(k), preview)
        } else {
            let preview = if slice.len() > 80 { format!("{}...", &slice[..80]) } else { slice.to_string() };
            (None, preview)
        };

        let has_children = node.child_count > 0;
        rows.push(TreeRow {
            id: node.id,
            depth,
            node_type: node.node_type,
            key: key_opt,
            val_preview,
            child_count: node.child_count,
            has_children,
        });

        if has_children && expanded.contains(&node.id) {
            rows.extend(flatten_tree_interactive(content, index, node.id, depth + 1, expanded));
        }
    }
    rows
}

#[component]
fn VirtualTableView(content: String) -> Element {
    let mut sort_col = use_signal(|| None::<String>);
    let mut sort_desc = use_signal(|| false);

    // Parse directly from the `content` prop so the table refreshes on edits.
    let parsed_table: Option<(Vec<String>, Vec<Vec<String>>)> = (|| {
        let val: serde_json::Value = serde_json::from_str(&content).ok()?;
        let arr = val.as_array()?;
        let mut headers = Vec::new();
        let mut rows = Vec::new();

        for item in arr.iter().take(200) {
            if let Some(obj) = item.as_object() {
                for k in obj.keys() {
                    if !headers.contains(k) {
                        headers.push(k.clone());
                    }
                }
            }
        }

        for item in arr.iter().take(200) {
            if let Some(obj) = item.as_object() {
                let mut row = Vec::new();
                for h in &headers {
                    let cell_str = match obj.get(h) {
                        Some(serde_json::Value::String(s)) => s.clone(),
                        Some(serde_json::Value::Null) => "null".to_string(),
                        Some(v) => v.to_string(),
                        None => "".to_string(),
                    };
                    row.push(cell_str);
                }
                rows.push(row);
            }
        }
        Some((headers, rows))
    })();

    rsx! {
        div {
            class: "zd-tool-fill overflow-auto custom-scrollbar",
            if let Some((headers, mut rows)) = parsed_table.clone() {
                {
                    if let Some(col_name) = sort_col.read().as_ref() {
                        if let Some(col_idx) = headers.iter().position(|h| h == col_name) {
                            rows.sort_by(|a, b| {
                                let res = a.get(col_idx).cmp(&b.get(col_idx));
                                if *sort_desc.read() { res.reverse() } else { res }
                            });
                        }
                    }
                }
                table { class: "w-full text-left border-collapse font-mono text-xs",
                    thead { class: "bg-[var(--zd-surface-raised)] sticky top-0 z-10 border-b-2 border-[var(--zd-border)] select-none",
                        tr {
                            for header in headers.iter() {
                                {
                                    let h = header.clone();
                                    let is_sorted = *sort_col.read() == Some(h.clone());
                                    rsx! {
                                        th {
                                            key: "{h}",
                                            class: "px-3 py-2.5 font-semibold text-[var(--zd-text-primary)] hover:bg-[var(--zd-surface)] cursor-pointer transition-colors whitespace-nowrap",
                                            onclick: {
                                                let h = h.clone();
                                                move |_| {
                                                    if *sort_col.read() == Some(h.clone()) {
                                                        let next = !*sort_desc.read();
                                                        sort_desc.set(next);
                                                    } else {
                                                        sort_col.set(Some(h.clone()));
                                                        sort_desc.set(false);
                                                    }
                                                }
                                            },
                                            span { class: "flex items-center gap-1.5",
                                                span { "{h}" }
                                                if is_sorted {
                                                    span { class: "text-[var(--zd-primary)]",
                                                        if *sort_desc.read() { "↓" } else { "↑" }
                                                    }
                                                } else {
                                                    span { class: "opacity-20 hover:opacity-60", "↕" }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                    tbody {
                        for (r_idx, row) in rows.iter().enumerate() {
                            tr {
                                key: "{r_idx}",
                                class: "border-b border-[var(--zd-border)] hover:bg-[var(--zd-surface-raised)]/50 transition-colors duration-150",
                                for (c_idx, cell) in row.iter().enumerate() {
                                    {
                                        let is_null = cell == "null" || cell.is_empty();
                                        let cell_class = if is_null { "text-[var(--zd-text-muted)] italic" } else { "text-[var(--zd-text-primary)]" };
                                        rsx! {
                                            td {
                                                key: "{c_idx}",
                                                class: "px-3 py-2 max-w-xs truncate {cell_class}",
                                                title: "{cell}",
                                                if cell.is_empty() { "-" } else { "{cell}" }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            } else {
                div { class: "p-6 flex flex-col items-center justify-center gap-2 text-[var(--zd-text-muted)]",
                    p { class: "font-mono text-sm", "Table view requires a JSON array of objects" }
                    p { class: "text-xs opacity-60", "Example: [ {{\"id\": 1, \"name\": \"ZeroDock\"}} ]" }
                }
            }
        }
    }
}

#[component]
fn YamlPanel(content: String, on_apply: EventHandler<String>) -> Element {
    let mut direction = use_signal(|| "json_to_yaml".to_string());
    let mut yaml_input = use_signal(String::new);

    // Compute directly from the `content` prop instead of a `use_memo`. A memo
    // capturing an owned clone of `content` would never recompute when the prop
    // changes (the prop is not a signal), leaving the conversion output stale
    // after actions like Format or Send-to that rewrite the active tab.
    let output = if *direction.read() == "json_to_yaml" {
        json_to_yaml(&content).unwrap_or_else(|e| e.to_string())
    } else {
        yaml_to_json(&yaml_input.read()).unwrap_or_else(|e| e.to_string())
    };

    rsx! {
        div {
            class: "zd-tool-fill flex flex-col min-h-0",
            div {
                class: "px-3 py-2 border-b border-[var(--zd-border)] bg-[var(--zd-surface-raised)] flex flex-wrap items-center gap-2 shrink-0",
                SegmentedControl {
                    options: vec![("json_to_yaml", "JSON → YAML"), ("yaml_to_json", "YAML → JSON")],
                    active: direction.read().clone(),
                    on_change: EventHandler::new(move |d| direction.set(d)),
                }
                if *direction.read() == "yaml_to_json" {
                    Button {
                        onclick: move |_| {
                            match yaml_to_json(&yaml_input.read()) {
                                Ok(json) => {
                                    on_apply.call(json);
                                }
                                Err(_) => {}
                            }
                        },
                        "Apply to editor"
                    }
                }
            }
            div {
                class: "zd-tool-fill grid grid-cols-1 md:grid-cols-2 min-h-0 flex-1",
                if *direction.read() == "json_to_yaml" {
                    CodePanel {
                        title: "JSON".to_string(),
                        value: content.clone(),
                        oninput: None,
                        read_only: true,
                        language: CodeLanguage::Json,
                    }
                    CodePanel {
                        title: "YAML".to_string(),
                        value: output.clone(),
                        oninput: None,
                        read_only: true,
                        show_empty: true,
                        language: CodeLanguage::Yaml,
                    }
                } else {
                    CodePanel {
                        title: "YAML Input".to_string(),
                        value: yaml_input.read().clone(),
                        oninput: Some(EventHandler::new(move |e: Event<FormData>| yaml_input.set(e.value()))),
                        on_edit: Some(EventHandler::new(move |v: String| yaml_input.set(v))),
                        placeholder: "Paste YAML...",
                        language: CodeLanguage::Yaml,
                    }
                    CodePanel {
                        title: "JSON Preview".to_string(),
                        value: output.clone(),
                        oninput: None,
                        read_only: true,
                        show_empty: true,
                        language: CodeLanguage::Json,
                    }
                }
            }
        }
    }
}

#[component]
fn TypesPanel(content: String) -> Element {
    let mut lang = use_signal(|| "typescript".to_string());
    // Compute directly from the `content` prop so the generated types refresh
    // when the underlying JSON changes (a `use_memo` over an owned prop clone
    // would freeze on the first value).
    let output = {
        let target = match lang.read().as_str() {
            "go" => TargetLang::Go,
            "rust" => TargetLang::Rust,
            "schema" => TargetLang::Schema,
            _ => TargetLang::TypeScript,
        };
        convert_json_to_types(&content, target).unwrap_or_else(|e| e.to_string())
    };

    rsx! {
        div {
            class: "zd-tool-fill flex flex-col min-h-0",
            div {
                class: "p-3 border-b border-[var(--zd-border)] shrink-0",
                TabGroup {
                    tabs: vec![
                        ("typescript", "TypeScript"),
                        ("go", "Go"),
                        ("rust", "Rust"),
                        ("schema", "JSON Schema"),
                    ],
                    active: lang.read().clone(),
                    on_change: EventHandler::new(move |l| lang.set(l)),
                    variant: crate::shell::ui::TabVariant::Toolbar,
                }
            }
            CodePanel {
                title: "Generated Types".to_string(),
                value: output.clone(),
                oninput: None,
                read_only: true,
                show_empty: true,
                language: CodeLanguage::Plain,
                header_actions: rsx! {
                    ExportButton {
                        filename: "types.ts",
                        content: output.clone(),
                        label: "Download",
                    }
                },
            }
        }
    }
}

#[component]
fn PathPanel(content: String) -> Element {
    let mut query = use_signal(|| "features[0]".to_string());
    // Compute directly from the `content` prop so results track JSON edits.
    let output = jmespath_query(&content, &query.read()).unwrap_or_else(|e| e.to_string());

    rsx! {
        div {
            class: "zd-tool-fill flex flex-col min-h-0",
            div {
                class: "p-3 border-b border-[var(--zd-border)] shrink-0",
                input {
                    class: "w-full px-3 py-2 rounded-lg border border-[var(--zd-border)] bg-[var(--zd-surface)] font-mono text-sm focus-ring",
                    placeholder: "JMESPath expression",
                    aria_label: "JMESPath expression",
                    value: "{query}",
                    oninput: move |e: Event<FormData>| query.set(e.value()),
                }
            }
            CodePanel {
                title: "Query Result".to_string(),
                value: output.clone(),
                oninput: None,
                read_only: true,
                show_empty: true,
                language: CodeLanguage::Json,
            }
        }
    }
}

#[component]
fn DiffViewPanel(original_content: String) -> Element {
    let mut modified_content = use_signal(|| original_content.clone());
    let mut show_diff = use_signal(|| true);

    // Compute directly so the diff refreshes when `original_content` changes
    // (a `use_memo` over an owned prop clone would freeze on the first value).
    let diff_lines = {
        let orig = original_content.lines().collect::<Vec<_>>();
        let modif = modified_content.read().lines().map(|s| s.to_string()).collect::<Vec<_>>();
        let mut out = Vec::new();

        let max_len = orig.len().max(modif.len());
        for i in 0..max_len {
            let o = orig.get(i).copied().unwrap_or("");
            let m = modif.get(i).map(|s| s.as_str()).unwrap_or("");
            if o == m {
                out.push(("same", o.to_string()));
            } else {
                if !o.is_empty() {
                    out.push(("removed", format!("- {o}")));
                }
                if !m.is_empty() {
                    out.push(("added", format!("+ {m}")));
                }
            }
        }
        out
    };

    rsx! {
        div { class: "zd-tool-fill flex flex-col min-h-0",
            div { class: "px-3 py-2 border-b border-[var(--zd-border)] bg-[var(--zd-surface-raised)] flex items-center justify-between shrink-0",
                span { class: "text-xs font-mono text-[var(--zd-text-secondary)]", "Side-by-Side Diff Comparison" }
                Button {
                    variant: ButtonVariant::Ghost,
                    class: "px-2 py-1 text-xs",
                    onclick: move |_| {
                        let next = !*show_diff.read();
                        show_diff.set(next);
                    },
                    if *show_diff.read() { "Edit Modified JSON" } else { "Show Line Diffs" }
                }
            }
            if *show_diff.read() {
                div { class: "zd-tool-fill overflow-auto custom-scrollbar font-mono text-xs p-4 bg-[var(--zd-bg)]",
                    for (kind, line) in diff_lines.iter() {
                        {
                            let row_class = match *kind {
                                "added" => "bg-emerald-950/40 text-emerald-300 border-l-2 border-emerald-500 pl-2 py-0.5",
                                "removed" => "bg-rose-950/40 text-rose-300 border-l-2 border-rose-500 pl-2 py-0.5",
                                _ => "text-[var(--zd-text-muted)] pl-2.5 py-0.5",
                            };
                            rsx! {
                                div { class: "{row_class}", "{line}" }
                            }
                        }
                    }
                }
            } else {
                CodePanel {
                    title: "Modified JSON for Comparison".to_string(),
                    value: modified_content.read().clone(),
                    oninput: Some(EventHandler::new(move |e: Event<FormData>| modified_content.set(e.value()))),
                    on_edit: Some(EventHandler::new(move |v: String| modified_content.set(v))),
                    placeholder: "Paste modified JSON here...",
                    language: CodeLanguage::Json,
                }
            }
        }
    }
}
