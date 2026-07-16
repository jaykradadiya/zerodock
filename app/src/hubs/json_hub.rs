use crate::shell::drag_drop::DragDropZone;
use crate::shell::export::ExportButton;
use crate::shell::layout::{CodePanel, HubToolHeader, ModeToggle, ToolBody, ToolPage, ToolToolbar, ToolWorkspace};
use crate::shell::code_editor::CodeLanguage;
use crate::shell::ui::{Button, ButtonVariant, SegmentedControl, TabGroup};
use crate::shell::virtual_code_editor::VirtualCodeEditor;
use crate::state::{use_app_state, use_primary_action, ToastKind};
use dioxus::prelude::*;
use ropey::Rope;
use std::collections::HashSet;
use zerodock_core::{convert_json_to_types, diff_json, format_json_opts, jmespath_query, json_to_yaml, repair_json, yaml_to_json, JsonChange, JsonChangeKind, TargetLang};
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

#[derive(Clone, PartialEq, Debug)]
pub struct FileTabMeta {
    pub id: String,
    pub name: String,
    pub is_modified: bool,
}

#[component]
pub fn WorkspaceTabBar(
    tabs_meta: Memo<Vec<FileTabMeta>>,
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

    let filtered_tabs: Vec<FileTabMeta> = {
        let q = find_query.read().to_lowercase();
        tabs_meta.read()
            .iter()
            .filter(|t| q.is_empty() || t.name.to_lowercase().contains(&q))
            .cloned()
            .collect()
    };

    rsx! {
        div { class: "flex items-center bg-[var(--zd-surface-raised)] border-b border-[var(--zd-border)] shrink-0 pr-3",
            div { class: "flex items-center gap-1 px-3 py-1.5 overflow-x-auto custom-scrollbar select-none flex-1 min-w-0",
            for (idx, tab) in tabs_meta.read().iter().enumerate() {
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
                            if tabs_meta.read().len() > 1 {
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
    
    let initial_content = use_hook(|| {
        let pasted = state.tool_states.read().get("json-toolkit").cloned();
        if pasted.is_some() {
            state.tool_states.write().remove("json-toolkit");
        }
        pasted.unwrap_or_else(|| r#"{"name":"ZeroDock","version":1,"features":["rust","dioxus"]}"#.to_string())
    });

    let mut tabs = use_signal(|| vec![
        FileTab {
            id: "tab_1".to_string(),
            name: "data.json".to_string(),
            content: initial_content.clone(),
            is_modified: false,
        }
    ]);
    let mut active_tab_id = use_signal(|| "tab_1".to_string());

    let tabs_meta = use_memo(move || {
        tabs.read()
            .iter()
            .map(|t| FileTabMeta {
                id: t.id.clone(),
                name: t.name.clone(),
                is_modified: t.is_modified,
            })
            .collect::<Vec<_>>()
    });

    // Rope mirror of the active tab's content, used only by the large-file
    // (virtualized) editor path. Kept separate from `FileTab.content: String`
    // so every other panel (tree/table/yaml/types/path/diff) is unaffected —
    // they keep reading `get_active_content()` snapshots exactly as before.
    let mut active_rope = use_signal(|| Rope::from_str(&initial_content));
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
    let mut undo_stack = use_signal(|| Vec::<String>::new());
    let mut redo_stack = use_signal(|| Vec::<String>::new());

    let mut set_active_content_raw = move |val: String| {
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

    let mut set_active_content = move |val: String| {
        let current = get_active_content();
        if current != val {
            undo_stack.write().push(current);
            redo_stack.write().clear();
        }
        set_active_content_raw(val);
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

    let import_into_tab = move |name: String, val: String| {
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

    let initial_panel_cloned = initial_panel.clone();
    let mut panel = use_signal(move || initial_panel_cloned.unwrap_or_else(|| "editor".to_string()));
    let initial_panel_for_sig = initial_panel.clone();
    let mut initial_panel_sig = use_signal(move || initial_panel_for_sig.clone());
    if *initial_panel_sig.read() != initial_panel {
        initial_panel_sig.set(initial_panel.clone());
        panel.set(initial_panel.clone().unwrap_or_else(|| "editor".to_string()));
    }
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
    let mut show_bottom_jmespath = use_signal(|| false);
    let mut bottom_jmespath_query = use_signal(|| "features[0]".to_string());



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
                tabs_meta: tabs_meta,
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
                                ModeToggle { active: *panel.read() == "yaml", onclick: move |_| { panel.set("yaml".into()); view_mode.set("editor".into()); }, "YAML ↔ JSON" }
                                ModeToggle { active: *panel.read() == "types", onclick: move |_| { panel.set("types".into()); view_mode.set("editor".into()); }, "Types" }
                                Button {
                                    variant: if *show_bottom_jmespath.read() { ButtonVariant::Primary } else { ButtonVariant::Ghost },
                                    class: "px-2 py-1 text-xs",
                                    onclick: move |_| {
                                        let val = *show_bottom_jmespath.read();
                                        show_bottom_jmespath.set(!val);
                                    },
                                    "JMESPath Bar"
                                }
                            }
                            div { class: "zd-toolbar-group",
                                span { class: "zd-toolbar-group-label", "Format" }
                                Button {
                                    shortcut: "⌘↵".to_string(),
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
                                Button {
                                    shortcut: "⌘Z".to_string(),
                                    disabled: undo_stack.read().is_empty(),
                                    onclick: move |_| {
                                        if let Some(prev) = undo_stack.write().pop() {
                                            let curr = get_active_content();
                                            redo_stack.write().push(curr);
                                            set_active_content_raw(prev);
                                        }
                                    },
                                    "Undo"
                                }
                                Button {
                                    shortcut: "⌘⇧Z".to_string(),
                                    disabled: redo_stack.read().is_empty(),
                                    onclick: move |_| {
                                        if let Some(next) = redo_stack.write().pop() {
                                            let curr = get_active_content();
                                            undo_stack.write().push(curr);
                                            set_active_content_raw(next);
                                        }
                                    },
                                    "Redo"
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
                                tabs: tabs,
                                active_tab_id: active_tab_id,
                                on_update_tab: EventHandler::new({
                                    let mut set_active_raw = set_active_content_raw.clone();
                                    move |(id, new_content): (String, String)| {
                                        let is_active = id == *active_tab_id.peek();
                                        tabs.write().iter_mut().for_each(|t| {
                                            if t.id == id {
                                                t.content = new_content.clone();
                                                t.is_modified = true;
                                            }
                                        });
                                        if is_active {
                                            set_active_raw(new_content);
                                        }
                                    }
                                }),
                                on_add_tab: EventHandler::new(move |initial_name: String| {
                                    let new_id = format!("tab_{}", tabs.read().len() + 1);
                                    let name = if initial_name.is_empty() { format!("Untitled {}", tabs.read().len() + 1) } else { initial_name };
                                    tabs.write().push(FileTab {
                                        id: new_id.clone(),
                                        name,
                                        content: "{\n  \n}".to_string(),
                                        is_modified: false,
                                    });
                                }),
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
            if *show_bottom_jmespath.read() {
                div {
                    class: "h-48 border-t border-[var(--zd-border)] bg-[var(--zd-surface-raised)] flex flex-col shrink-0 min-h-0 z-10 shadow-lg",
                    div {
                        class: "px-3 py-1.5 border-b border-[var(--zd-border)] flex items-center justify-between bg-[var(--zd-surface)] shrink-0 gap-2",
                        div {
                            class: "flex items-center gap-2 flex-1 max-w-xl",
                            span { class: "text-xs font-mono font-semibold text-[var(--zd-accent)]", "Live JMESPath:" }
                            input {
                                class: "flex-1 px-2.5 py-1 text-xs font-mono rounded border border-[var(--zd-border)] bg-[var(--zd-surface-raised)] text-[var(--zd-text-primary)] focus-ring",
                                placeholder: "e.g. features[0] or users[?age > `20`]",
                                value: "{bottom_jmespath_query}",
                                oninput: move |e: Event<FormData>| bottom_jmespath_query.set(e.value()),
                            }
                        }
                        button {
                            class: "text-xs text-[var(--zd-text-muted)] hover:text-[var(--zd-text-primary)] focus-ring px-1",
                            onclick: move |_| show_bottom_jmespath.set(false),
                            "Close (×)"
                        }
                    }
                    div {
                        class: "flex-1 min-h-0",
                        CodePanel {
                            title: "Query Result".to_string(),
                            value: jmespath_query(&get_active_content(), &bottom_jmespath_query.read()).unwrap_or_else(|e| e.to_string()),
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

fn matches_tree_filter(val: &serde_json::Value, path: &str, query: &str) -> bool {
    if query.is_empty() {
        return true;
    }
    let q = query.to_lowercase();
    if path.to_lowercase().contains(&q) {
        return true;
    }
    match val {
        serde_json::Value::Object(m) => {
            m.iter().any(|(k, v)| k.to_lowercase().contains(&q) || matches_tree_filter(v, &format!("{path}.{k}"), query))
        }
        serde_json::Value::Array(a) => {
            a.iter().enumerate().any(|(i, v)| matches_tree_filter(v, &format!("{path}[{i}]"), query))
        }
        serde_json::Value::String(s) => s.to_lowercase().contains(&q),
        serde_json::Value::Number(n) => n.to_string().contains(&q),
        serde_json::Value::Bool(b) => b.to_string().contains(&q),
        serde_json::Value::Null => "null".contains(&q),
    }
}

fn render_single_tree_node(
    val: &serde_json::Value,
    path: String,
    mut expanded_paths: Signal<HashSet<String>>,
    filter_text: Signal<String>,
) -> Element {
    if !filter_text.read().is_empty() && !matches_tree_filter(val, &path, &filter_text.read()) {
        return rsx! {};
    }

    let is_expanded = expanded_paths.read().contains(&path);
    let key_label = if path == "$" {
        "root".to_string()
    } else if let Some(last_dot) = path.rfind('.') {
        path[last_dot + 1..].to_string()
    } else if let Some(last_bracket) = path.rfind('[') {
        path[last_bracket..].to_string()
    } else {
        path.clone()
    };

    let is_array_idx = (path.rfind('[').is_some() && !path.ends_with(']')) || (key_label.starts_with('[') && key_label.ends_with(']'));

    match val {
        serde_json::Value::Object(map) => {
            let mut keys: Vec<_> = map.keys().collect();
            keys.sort();
            rsx! {
                div { class: "flex flex-col font-mono text-xs select-text",
                    div {
                        class: "flex items-center justify-between py-1 px-2 hover:bg-[var(--zd-surface-hover)] transition-colors cursor-pointer rounded",
                        onclick: move |_| {
                            let mut exp = expanded_paths.write();
                            if exp.contains(&path) {
                                exp.remove(&path);
                            } else {
                                exp.insert(path.clone());
                            }
                        },
                        div { class: "flex items-center gap-1.5 min-w-0 truncate pr-2",
                            span { class: "w-4 text-center text-[var(--zd-text-muted)] font-bold shrink-0 select-none",
                                if is_expanded { "▼" } else { "▶" }
                            }
                            if key_label == "root" {
                                span { class: "font-bold text-[var(--zd-accent)] shrink-0", "root:" }
                            } else if is_array_idx {
                                span { class: "font-semibold text-[var(--zd-primary)] shrink-0", "{key_label}:" }
                            } else {
                                span { class: "font-semibold text-[var(--zd-primary)] shrink-0", "\"{key_label}\":" }
                            }
                            span { class: "text-[var(--zd-text-muted)] text-[11px] opacity-75 shrink-0 select-none italic", "{{...}} ({map.len()} keys)" }
                        }
                    }
                    if is_expanded {
                        div { class: "pl-4 border-l border-[var(--zd-border)]/40 ml-2 flex flex-col",
                            for key in keys {
                                {
                                    let next_path = if path == "$" { format!("$.{key}") } else { format!("{path}.{key}") };
                                    if let Some(child_val) = map.get(key) {
                                        render_single_tree_node(child_val, next_path, expanded_paths, filter_text)
                                    } else {
                                        rsx! {}
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        serde_json::Value::Array(arr) => {
            rsx! {
                div { class: "flex flex-col font-mono text-xs select-text",
                    div {
                        class: "flex items-center justify-between py-1 px-2 hover:bg-[var(--zd-surface-hover)] transition-colors cursor-pointer rounded",
                        onclick: move |_| {
                            let mut exp = expanded_paths.write();
                            if exp.contains(&path) {
                                exp.remove(&path);
                            } else {
                                exp.insert(path.clone());
                            }
                        },
                        div { class: "flex items-center gap-1.5 min-w-0 truncate pr-2",
                            span { class: "w-4 text-center text-[var(--zd-text-muted)] font-bold shrink-0 select-none",
                                if is_expanded { "▼" } else { "▶" }
                            }
                            if key_label == "root" {
                                span { class: "font-bold text-[var(--zd-accent)] shrink-0", "root:" }
                            } else if is_array_idx {
                                span { class: "font-semibold text-[var(--zd-primary)] shrink-0", "{key_label}:" }
                            } else {
                                span { class: "font-semibold text-[var(--zd-primary)] shrink-0", "\"{key_label}\":" }
                            }
                            span { class: "text-[var(--zd-text-muted)] text-[11px] opacity-75 shrink-0 select-none italic", "[...] ({arr.len()} items)" }
                        }
                    }
                    if is_expanded {
                        div { class: "pl-4 border-l border-[var(--zd-border)]/40 ml-2 flex flex-col",
                            for (i, child_val) in arr.iter().enumerate() {
                                {
                                    let next_path = format!("{path}[{i}]");
                                    render_single_tree_node(child_val, next_path, expanded_paths, filter_text)
                                }
                            }
                        }
                    }
                }
            }
        }
        _ => {
            rsx! {
                div {
                    class: "flex items-center justify-between py-1 px-2 hover:bg-[var(--zd-surface-hover)] transition-colors rounded font-mono text-xs",
                    div { class: "flex items-center gap-1.5 min-w-0 truncate pr-2",
                        span { class: "w-4 shrink-0 select-none", " " }
                        if key_label == "root" {
                            span { class: "font-bold text-[var(--zd-accent)] shrink-0", "root:" }
                        } else if is_array_idx {
                            span { class: "font-semibold text-[var(--zd-primary)] shrink-0", "{key_label}:" }
                        } else {
                            span { class: "font-semibold text-[var(--zd-primary)] shrink-0", "\"{key_label}\":" }
                        }
                        span {
                            class: match val {
                                serde_json::Value::String(_) => "text-[var(--zd-syntax-string)] font-medium truncate",
                                serde_json::Value::Number(_) => "text-[var(--zd-syntax-number)] font-medium",
                                serde_json::Value::Bool(_) => "text-[var(--zd-syntax-bool)] font-medium",
                                serde_json::Value::Null => "text-[var(--zd-syntax-null)] italic",
                                _ => "",
                            },
                            "{format_val_short(val)}"
                        }
                    }
                }
            }
        }
    }
}

#[component]
fn SingleJsonTreeView(val: serde_json::Value) -> Element {
    let mut expanded_paths = use_signal(|| {
        let mut set = HashSet::new();
        set.insert("$".to_string());
        set
    });
    let mut filter_text = use_signal(String::new);

    rsx! {
        div { class: "zd-tool-fill flex flex-col min-h-0 bg-[var(--zd-bg)]",
            // Toolbar
            div { class: "flex flex-wrap items-center justify-between px-4 py-2 bg-[var(--zd-surface-raised)] border-b border-[var(--zd-border)] gap-3 text-xs font-mono shrink-0 shadow-2xs",
                div { class: "flex items-center gap-2",
                    button {
                        class: "px-2.5 py-1 rounded bg-[var(--zd-surface)] border border-[var(--zd-border)] hover:bg-[var(--zd-surface-hover)] text-[var(--zd-text-primary)] font-semibold transition-colors flex items-center gap-1.5 shadow-2xs",
                        title: "Expand all branches",
                        onclick: move |_| {
                            let mut exp = expanded_paths.write();
                            collect_all_tree_paths(&val, "$", &mut exp);
                        },
                        "┼ Expand All"
                    }
                    button {
                        class: "px-2.5 py-1 rounded bg-[var(--zd-surface)] border border-[var(--zd-border)] hover:bg-[var(--zd-surface-hover)] text-[var(--zd-text-primary)] font-semibold transition-colors flex items-center gap-1.5 shadow-2xs",
                        title: "Collapse all branches to root",
                        onclick: move |_| {
                            let mut exp = expanded_paths.write();
                            exp.clear();
                            exp.insert("$".to_string());
                        },
                        "─ Collapse All"
                    }
                }
                div { class: "flex items-center gap-2 flex-1 max-w-md",
                    input {
                        class: "w-full px-3 py-1 rounded border border-[var(--zd-border)] bg-[var(--zd-surface)] text-[var(--zd-text-primary)] placeholder-[var(--zd-text-muted)] focus:outline-none focus:border-[var(--zd-primary)] text-xs font-mono transition-colors",
                        placeholder: "🔍 Filter keys or values in tree...",
                        value: "{filter_text.read()}",
                        oninput: move |e| filter_text.set(e.value())
                    }
                    if !filter_text.read().is_empty() {
                        button {
                            class: "px-2 py-1 rounded text-xs text-[var(--zd-text-muted)] hover:text-[var(--zd-text-primary)] font-bold",
                            onclick: move |_| filter_text.set(String::new()),
                            "✕"
                        }
                    }
                }
            }
            // Tree content
            div { class: "overflow-y-auto custom-scrollbar flex-1 min-h-0 p-3",
                {render_single_tree_node(&val, "$".to_string(), expanded_paths, filter_text)}
            }
        }
    }
}

#[component]
fn VirtualTreeView(content: String, index: Option<JsonIndex>) -> Element {
    if let Ok(val) = serde_json::from_str::<serde_json::Value>(&content) {
        return rsx! {
            SingleJsonTreeView { val }
        };
    }

    let mut scroll_top = use_signal(|| 0usize);
    let mut expanded_nodes = use_signal(|| {
        let mut set = HashSet::new();
        set.insert(0);
        set.insert(1);
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
        let val_slice = std::str::from_utf8(index.slice(content.as_bytes(), node)).unwrap_or("?");
        let key_opt = index.key_str(content.as_bytes(), node).map(|k| k.to_string());

        let val_preview = match node.node_type {
            zerodock_indexer::NodeType::Object => format!("{{...}} ({} keys)", node.child_count),
            zerodock_indexer::NodeType::Array => format!("[...] ({} items)", node.child_count),
            _ => {
                let trimmed = val_slice.trim();
                if trimmed.len() > 80 {
                    format!("{}...", &trimmed[..80])
                } else {
                    trimmed.to_string()
                }
            }
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
                    thead { class: "bg-[var(--zd-surface-raised)] sticky top-0 z-10 border-b border-[var(--zd-border)] select-none",
                        tr {
                            for header in headers.iter() {
                                {
                                    let h = header.clone();
                                    let is_sorted = *sort_col.read() == Some(h.clone());
                                    rsx! {
                                        th {
                                            key: "{h}",
                                            tabindex: "0",
                                            role: "columnheader",
                                            class: "px-4 py-3 font-semibold text-[var(--zd-text-primary)] hover:bg-[var(--zd-surface)] cursor-pointer transition-colors whitespace-nowrap focus-ring",
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
                                            onkeydown: {
                                                let h = h.clone();
                                                move |e: Event<KeyboardData>| {
                                                    if e.key() == Key::Enter || e.key() == Key::Character(" ".into()) {
                                                        e.prevent_default();
                                                        if *sort_col.read() == Some(h.clone()) {
                                                            let next = !*sort_desc.read();
                                                            sort_desc.set(next);
                                                        } else {
                                                            sort_col.set(Some(h.clone()));
                                                            sort_desc.set(false);
                                                        }
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
                                class: "border-b border-[var(--zd-border)] hover:bg-[var(--zd-surface-hover)] transition-colors duration-150",
                                for (c_idx, cell) in row.iter().enumerate() {
                                    {
                                        let is_null = cell == "null" || cell.is_empty();
                                        let cell_class = if is_null { "text-[var(--zd-text-muted)] italic" } else { "text-[var(--zd-text-primary)]" };
                                        rsx! {
                                            td {
                                                key: "{c_idx}",
                                                tabindex: "0",
                                                role: "cell",
                                                class: "px-4 py-3 max-w-sm truncate {cell_class} focus-ring",
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
            "zod" => TargetLang::Zod,
            "pydantic" => TargetLang::Pydantic,
            "schema" => TargetLang::Schema,
            _ => TargetLang::TypeScript,
        };
        convert_json_to_types(&content, target).unwrap_or_else(|e| e.to_string())
    };

    let filename = match lang.read().as_str() {
        "go" => "types.go",
        "rust" => "types.rs",
        "pydantic" => "models.py",
        "schema" => "schema.json",
        _ => "types.ts",
    };

    rsx! {
        div {
            class: "zd-tool-fill flex flex-col min-h-0",
            div {
                class: "p-3 border-b border-[var(--zd-border)] shrink-0",
                TabGroup {
                    tabs: vec![
                        ("typescript", "TypeScript"),
                        ("zod", "Zod Schema"),
                        ("pydantic", "Pydantic (Python)"),
                        ("go", "Go Structs"),
                        ("rust", "Rust Structs"),
                        ("schema", "JSON Schema"),
                    ],
                    active: lang.read().clone(),
                    on_change: EventHandler::new(move |l| lang.set(l)),
                    variant: crate::shell::ui::TabVariant::Toolbar,
                }
            }
            CodePanel {
                title: "Generated Types & Schemas".to_string(),
                value: output.clone(),
                oninput: None,
                read_only: true,
                show_empty: true,
                language: CodeLanguage::Plain,
                header_actions: rsx! {
                    ExportButton {
                        filename: filename,
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

fn get_ancestor_paths(path: &str) -> Vec<String> {
    let mut ancestors = Vec::new();
    ancestors.push("$".to_string());
    if path == "$" { return ancestors; }
    let trimmed = path.strip_prefix("$.").unwrap_or(path.strip_prefix('$').unwrap_or(path));
    let mut current = "$".to_string();
    let mut token = String::new();
    for ch in trimmed.chars() {
        if ch == '.' || ch == '[' {
            if !token.is_empty() {
                if current == "$" {
                    current = format!("$.{token}");
                } else {
                    current = format!("{current}.{token}");
                }
                ancestors.push(current.clone());
                token.clear();
            }
            if ch == '[' {
                token.push(ch);
            }
        } else if ch == ']' {
            token.push(ch);
            current = format!("{current}{token}");
            ancestors.push(current.clone());
            token.clear();
        } else {
            token.push(ch);
        }
    }
    ancestors
}

fn collect_all_tree_paths(val: &serde_json::Value, path: &str, out: &mut HashSet<String>) {
    out.insert(path.to_string());
    match val {
        serde_json::Value::Object(map) => {
            for (key, child) in map {
                let next_path = if path == "$" { format!("$.{key}") } else { format!("{path}.{key}") };
                collect_all_tree_paths(child, &next_path, out);
            }
        }
        serde_json::Value::Array(arr) => {
            for (i, child) in arr.iter().enumerate() {
                let next_path = format!("{path}[{i}]");
                collect_all_tree_paths(child, &next_path, out);
            }
        }
        _ => {}
    }
}

fn format_val_short(v: &serde_json::Value) -> String {
    match v {
        serde_json::Value::String(s) => format!("\"{s}\""),
        serde_json::Value::Null => "null".to_string(),
        serde_json::Value::Bool(b) => b.to_string(),
        serde_json::Value::Number(n) => n.to_string(),
        serde_json::Value::Array(a) => format!("[Array ({})]", a.len()),
        serde_json::Value::Object(o) => format!("[Object ({})]", o.len()),
    }
}

#[derive(Clone, PartialEq)]
struct AlignedTreeNode {
    path: String,
    depth: usize,
    key_label: String,
    left_val: Option<serde_json::Value>,
    right_val: Option<serde_json::Value>,
    status: AlignedNodeStatus,
    has_children: bool,
    is_expanded: bool,
}

#[derive(Clone, Copy, PartialEq)]
enum AlignedNodeStatus {
    Equal,
    Added,
    Deleted,
    Modified,
}

fn collect_aligned_tree_nodes(
    l_opt: Option<&serde_json::Value>,
    r_opt: Option<&serde_json::Value>,
    path: &str,
    depth: usize,
    changes: &[JsonChange],
    expanded_paths: &HashSet<String>,
    only_show_changes: bool,
    out: &mut Vec<AlignedTreeNode>,
) -> bool {
    let direct_change = changes.iter().find(|c| c.path == path);
    let has_descendant_changes = changes.iter().any(|c| {
        c.path.starts_with(&format!("{path}.")) || c.path.starts_with(&format!("{path}["))
    });

    let status = match (l_opt, r_opt) {
        (Some(_), None) => AlignedNodeStatus::Deleted,
        (None, Some(_)) => AlignedNodeStatus::Added,
        (Some(lv), Some(rv)) => {
            if let Some(c) = direct_change {
                match c.kind {
                    JsonChangeKind::Added => AlignedNodeStatus::Added,
                    JsonChangeKind::Deleted => AlignedNodeStatus::Deleted,
                    JsonChangeKind::Modified => AlignedNodeStatus::Modified,
                }
            } else if lv != rv {
                AlignedNodeStatus::Modified
            } else {
                AlignedNodeStatus::Equal
            }
        }
        (None, None) => AlignedNodeStatus::Equal,
    };

    let has_any_change = status != AlignedNodeStatus::Equal || has_descendant_changes;
    if only_show_changes && !has_any_change && path != "$" {
        return false;
    }

    let is_expanded = expanded_paths.contains(path);
    let key_label = if path == "$" {
        "root".to_string()
    } else if let Some(last_dot) = path.rfind('.') {
        path[last_dot + 1..].to_string()
    } else if let Some(last_bracket) = path.rfind('[') {
        path[last_bracket..].to_string()
    } else {
        path.to_string()
    };

    let has_children = match (l_opt, r_opt) {
        (Some(serde_json::Value::Object(m)), _) | (_, Some(serde_json::Value::Object(m))) => !m.is_empty(),
        (Some(serde_json::Value::Array(a)), _) | (_, Some(serde_json::Value::Array(a))) => !a.is_empty(),
        _ => false,
    };

    out.push(AlignedTreeNode {
        path: path.to_string(),
        depth,
        key_label,
        left_val: l_opt.cloned(),
        right_val: r_opt.cloned(),
        status,
        has_children,
        is_expanded,
    });

    if has_children && is_expanded {
        let mut keys_set = std::collections::BTreeSet::new();
        if let Some(serde_json::Value::Object(m)) = l_opt {
            for k in m.keys() { keys_set.insert(k.clone()); }
        }
        if let Some(serde_json::Value::Object(m)) = r_opt {
            for k in m.keys() { keys_set.insert(k.clone()); }
        }
        if !keys_set.is_empty() {
            for k in keys_set {
                let next_path = if path == "$" { format!("$.{k}") } else { format!("{path}.{k}") };
                let lv = l_opt.and_then(|v| v.as_object()).and_then(|m| m.get(&k));
                let rv = r_opt.and_then(|v| v.as_object()).and_then(|m| m.get(&k));
                collect_aligned_tree_nodes(lv, rv, &next_path, depth + 1, changes, expanded_paths, only_show_changes, out);
            }
        } else {
            let l_arr = l_opt.and_then(|v| v.as_array());
            let r_arr = r_opt.and_then(|v| v.as_array());
            let aligned = match (l_arr, r_arr) {
                (Some(la), Some(ra)) => zerodock_core::align_arrays(la, ra),
                (Some(la), None) => (0..la.len()).map(|i| (Some(i), None)).collect(),
                (None, Some(ra)) => (0..ra.len()).map(|j| (None, Some(j))).collect(),
                (None, None) => Vec::new(),
            };
            for (idx, (opt_l, opt_r)) in aligned.into_iter().enumerate() {
                let next_path = format!("{path}[{idx}]");
                let lv = opt_l.and_then(|i| l_arr.map(|a| &a[i]));
                let rv = opt_r.and_then(|j| r_arr.map(|a| &a[j]));
                collect_aligned_tree_nodes(lv, rv, &next_path, depth + 1, changes, expanded_paths, only_show_changes, out);
            }
        }
    }

    has_any_change
}

fn render_aligned_tree_cell(
    val_opt: &Option<serde_json::Value>,
    node: &AlignedTreeNode,
    side: &'static str,
    mut expanded_paths: Signal<HashSet<String>>,
) -> Element {
    let Some(val) = val_opt else {
        return rsx! {
            div { class: "py-1 px-3 flex items-center justify-center bg-[var(--zd-surface-sunken)] border border-dashed border-[var(--zd-border)] rounded my-0.5 mx-2 text-[11px] italic text-[var(--zd-text-muted)] select-none h-full min-h-[28px]",
                "(empty)"
            }
        };
    };

    let is_expanded = node.is_expanded;
    let has_children = node.has_children;
    let path_clone = node.path.clone();
    let row_bg = match (node.status, side) {
        (AlignedNodeStatus::Added, "right") => "bg-[var(--zd-accent)]/15 border-l-4 border-[var(--zd-accent)]",
        (AlignedNodeStatus::Deleted, "left") => "bg-[var(--zd-error)]/15 border-l-4 border-[var(--zd-error)]",
        (AlignedNodeStatus::Modified, _) => "bg-[var(--zd-primary)]/15 border-l-4 border-[var(--zd-primary)]",
        _ => "transparent",
    };
    let badge = match (node.status, side) {
        (AlignedNodeStatus::Added, "right") => Some(("+ added", "bg-[var(--zd-accent)]/20 text-[var(--zd-accent)] border border-[var(--zd-accent)]/30")),
        (AlignedNodeStatus::Deleted, "left") => Some(("- removed", "bg-[var(--zd-error)]/20 text-[var(--zd-error)] border border-[var(--zd-error)]/30")),
        (AlignedNodeStatus::Modified, _) => Some(("~ changed", "bg-[var(--zd-primary)]/20 text-[var(--zd-primary)] border border-[var(--zd-primary)]/30")),
        _ => None,
    };

    rsx! {
        div {
            style: "padding-left: {node.depth * 16 + 12}px;",
            class: "flex items-center justify-between py-1 px-2.5 h-full min-h-[28px] transition-colors font-mono text-xs select-text {row_bg}",
            onclick: move |_| {
                if has_children {
                    let mut exp = expanded_paths.write();
                    if exp.contains(&path_clone) {
                        exp.remove(&path_clone);
                    } else {
                        exp.insert(path_clone.clone());
                    }
                }
            },
            div { class: "flex items-center gap-1.5 min-w-0 truncate pr-2",
                if has_children {
                    span { class: "w-4 text-center text-[var(--zd-text-muted)] font-bold shrink-0 select-none cursor-pointer",
                        if is_expanded { "▼" } else { "▶" }
                    }
                } else {
                    span { class: "w-4 shrink-0 select-none", " " }
                }
                {
                    let is_array_idx = (node.path.rfind('[').is_some() && !node.path.ends_with(']')) || (node.key_label.starts_with('[') && node.key_label.ends_with(']'));
                    if node.key_label == "root" {
                        rsx! { span { class: "font-bold text-[var(--zd-accent)] shrink-0", "root:" } }
                    } else if is_array_idx {
                        rsx! { span { class: "font-semibold text-[var(--zd-primary)] shrink-0", "{node.key_label}:" } }
                    } else {
                        rsx! { span { class: "font-semibold text-[var(--zd-primary)] shrink-0", "\"{node.key_label}\":" } }
                    }
                }
                if has_children {
                    span { class: "text-[var(--zd-text-muted)] text-[11px] opacity-75 shrink-0 select-none italic",
                        {
                            if let serde_json::Value::Object(m) = val {
                                format!("{{...}} ({})", m.len())
                            } else if let serde_json::Value::Array(a) = val {
                                format!("[...] ({})", a.len())
                            } else {
                                "".to_string()
                            }
                        }
                    }
                } else {
                    span {
                        class: match val {
                            serde_json::Value::String(_) => "text-[var(--zd-syntax-string)] font-medium truncate",
                            serde_json::Value::Number(_) => "text-[var(--zd-syntax-number)] font-medium",
                            serde_json::Value::Bool(_) => "text-[var(--zd-syntax-bool)] font-medium",
                            serde_json::Value::Null => "text-[var(--zd-syntax-null)] italic",
                            _ => "",
                        },
                        "{format_val_short(val)}"
                    }
                }
            }
            if let Some((txt, bclass)) = badge {
                span { class: "px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider shrink-0 select-none {bclass}", "{txt}" }
            }
        }
    }
}

#[derive(Clone, Copy, PartialEq)]
enum JsonDiffMode {
    TreeDiff,
    CodeDiff,
}

#[derive(Clone, PartialEq)]
enum DiffTarget {
    OtherTab(String),
    CustomText,
}

#[component]
fn DiffViewPanel(
    tabs: Signal<Vec<FileTab>>,
    active_tab_id: Signal<String>,
    on_update_tab: EventHandler<(String, String)>,
    on_add_tab: EventHandler<String>,
) -> Element {
    let mut custom_modified_content = use_signal(|| "{\n  \n}".to_string());
    let mut selected_target = use_signal(|| {
        let active = active_tab_id.read();
        if let Some(first_other) = tabs.read().iter().find(|t| t.id != *active) {
            DiffTarget::OtherTab(first_other.id.clone())
        } else {
            DiffTarget::CustomText
        }
    });
    let mut diff_mode = use_signal(|| JsonDiffMode::TreeDiff);
    let mut expanded_paths = use_signal(|| {
        let mut s = HashSet::new();
        s.insert("$".to_string());
        s
    });
    let mut active_diff_idx = use_signal(|| 0usize);
    let mut only_show_changes = use_signal(|| false);

    // Auto-scroll to active diff row when navigating
    use_effect(move || {
        let _idx = *active_diff_idx.read();
        let js = r#"
            setTimeout(() => {
                let el = document.getElementById("active-diff-row");
                if (el) { el.scrollIntoView({ behavior: "smooth", block: "center" }); }
            }, 50);
        "#;
        let _ = dioxus::document::eval(js);
    });

    // Auto-correct selected_target when tabs change
    use_effect(move || {
        let active = active_tab_id.read().clone();
        let current_tabs = tabs.read();
        let target = selected_target.peek().clone();
        match target {
            DiffTarget::OtherTab(ref id) => {
                if *id == active || !current_tabs.iter().any(|t| t.id == *id) {
                    if let Some(first_other) = current_tabs.iter().find(|t| t.id != active) {
                        selected_target.set(DiffTarget::OtherTab(first_other.id.clone()));
                    } else {
                        selected_target.set(DiffTarget::CustomText);
                    }
                }
            }
            DiffTarget::CustomText => {}
        }
    });

    // ─── Resolve content from tabs ─────────────────────────────────────
    let (left_id, left_name, left_content) = {
        let active = active_tab_id.read().clone();
        if let Some(t) = tabs.read().iter().find(|t| t.id == active) {
            (t.id.clone(), t.name.clone(), t.content.clone())
        } else {
            ("".to_string(), "Base".to_string(), "".to_string())
        }
    };

    let (right_id_opt, right_name, right_content) = match selected_target.read().clone() {
        DiffTarget::OtherTab(ref id) => {
            if let Some(t) = tabs.read().iter().find(|t| t.id == *id && t.id != *active_tab_id.read()) {
                (Some(t.id.clone()), t.name.clone(), t.content.clone())
            } else if let Some(first_other) = tabs.read().iter().find(|t| t.id != *active_tab_id.read()) {
                (Some(first_other.id.clone()), first_other.name.clone(), first_other.content.clone())
            } else {
                (None, "Custom JSON".to_string(), custom_modified_content.read().clone())
            }
        }
        DiffTarget::CustomText => (None, "Custom JSON".to_string(), custom_modified_content.read().clone()),
    };

    let other_tabs: Vec<(String, String)> = tabs.read()
        .iter()
        .filter(|t| t.id != *active_tab_id.read())
        .map(|t| (t.id.clone(), t.name.clone()))
        .collect();

    // ─── Semantic diff (for counts + tree data) ─────────────────────────
    let semantic_result = diff_json(&left_content, &right_content).map_err(|e| e.to_string());

    let (s_add, s_del, s_mod, changes_for_nav) = match semantic_result.as_ref() {
        Ok(changes) => {
            let a = changes.iter().filter(|c| c.kind == JsonChangeKind::Added).count();
            let d = changes.iter().filter(|c| c.kind == JsonChangeKind::Deleted).count();
            let m = changes.iter().filter(|c| c.kind == JsonChangeKind::Modified).count();
            (a, d, m, changes.clone())
        }
        Err(_) => (0, 0, 0, vec![]),
    };
    let total_diffs = s_add + s_del + s_mod;

    rsx! {
        div { class: "zd-tool-fill flex flex-col min-h-0 bg-[var(--zd-bg)]",

            // ═══════════════════════════════════════════════════════════════
            // HEADER — Target selector + Stats + Mode toggle
            // ═══════════════════════════════════════════════════════════════
            div {
                class: "flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 border-b border-[var(--zd-border)] bg-[var(--zd-surface)] shrink-0 shadow-sm",

                // Left group: Base ⇄ Target selectors
                div { class: "flex items-center gap-2 flex-wrap text-xs font-mono",

                    // Base label
                    div {
                        class: "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[var(--zd-surface-raised)] border border-[var(--zd-border)] shadow-sm max-w-[180px]",
                        span { class: "text-[9px] font-black uppercase tracking-widest text-[var(--zd-error)] shrink-0", "BASE" }
                        span { class: "text-[var(--zd-border)] shrink-0 opacity-50", "│" }
                        span { class: "truncate font-semibold text-[var(--zd-text-primary)]", title: "{left_name}", "{left_name}" }
                    }

                    span { class: "text-[var(--zd-text-muted)] font-bold text-sm select-none", "⇄" }

                    // Target selector dropdown
                    div {
                        class: "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[var(--zd-surface-raised)] border border-[var(--zd-border)] focus-within:border-[var(--zd-primary)] transition-colors shadow-sm max-w-[220px]",
                        span { class: "text-[9px] font-black uppercase tracking-widest text-[var(--zd-accent)] shrink-0", "TARGET" }
                        span { class: "text-[var(--zd-border)] shrink-0 opacity-50", "│" }
                        select {
                            class: "bg-transparent text-[var(--zd-text-primary)] font-semibold focus:outline-none text-xs font-mono cursor-pointer pr-1 min-w-0",
                            value: match selected_target.read().clone() {
                                DiffTarget::OtherTab(ref id) => format!("tab:{id}"),
                                DiffTarget::CustomText => "custom".to_string(),
                            },
                            onchange: move |e: Event<FormData>| {
                                let val = e.value();
                                if let Some(id) = val.strip_prefix("tab:") {
                                    selected_target.set(DiffTarget::OtherTab(id.to_string()));
                                } else {
                                    selected_target.set(DiffTarget::CustomText);
                                }
                            },
                            for (t_id, t_name) in other_tabs.iter() {
                                option { key: "{t_id}", value: "tab:{t_id}", "Tab: {t_name}" }
                            }
                            option { value: "custom", "Custom JSON" }
                        }
                    }

                    if other_tabs.is_empty() {
                        button {
                            class: "text-[11px] px-2.5 py-1.5 rounded-lg bg-[var(--zd-primary)]/10 text-[var(--zd-primary)] font-semibold border border-[var(--zd-primary)]/30 hover:bg-[var(--zd-primary)] hover:text-[var(--zd-primary-fg)] transition-all shadow-sm shrink-0",
                            onclick: move |_| {
                                on_add_tab.call("Diff Target".to_string());
                            },
                            "+ Add Tab"
                        }
                    }
                }

                // Center group: Diff navigation + stats
                div { class: "flex items-center gap-2",

                    if total_diffs > 0 {
                        // Prev / Next navigation
                        div {
                            class: "flex items-center bg-[var(--zd-surface-raised)] border border-[var(--zd-border)] rounded-lg shadow-sm overflow-hidden text-xs font-mono",
                            button {
                                class: "px-2.5 py-1.5 hover:bg-[var(--zd-surface-hover)] text-[var(--zd-text-primary)] font-bold transition-colors border-r border-[var(--zd-border)] disabled:opacity-30",
                                disabled: total_diffs == 0,
                                title: "Previous Difference",
                                onclick: {
                                    let changes = changes_for_nav.clone();
                                    move |_| {
                                        let total = changes.len();
                                        if total > 0 {
                                            let curr = *active_diff_idx.read();
                                            let prev = if curr == 0 { total - 1 } else { curr - 1 };
                                            active_diff_idx.set(prev);
                                            let mut exp = expanded_paths.write();
                                            for anc in get_ancestor_paths(&changes[prev].path) {
                                                exp.insert(anc);
                                            }
                                        }
                                    }
                                },
                                "◀"
                            }
                            div { class: "px-3 py-1.5 text-[var(--zd-primary)] font-bold select-none",
                                if *active_diff_idx.read() < total_diffs {
                                    "{*active_diff_idx.read() + 1} / {total_diffs}"
                                } else {
                                    "1 / {total_diffs}"
                                }
                            }
                            button {
                                class: "px-2.5 py-1.5 hover:bg-[var(--zd-surface-hover)] text-[var(--zd-text-primary)] font-bold transition-colors border-l border-[var(--zd-border)] disabled:opacity-30",
                                disabled: total_diffs == 0,
                                title: "Next Difference",
                                onclick: {
                                    let changes = changes_for_nav.clone();
                                    move |_| {
                                        let total = changes.len();
                                        if total > 0 {
                                            let curr = *active_diff_idx.read();
                                            let next = if curr + 1 >= total { 0 } else { curr + 1 };
                                            active_diff_idx.set(next);
                                            let mut exp = expanded_paths.write();
                                            for anc in get_ancestor_paths(&changes[next].path) {
                                                exp.insert(anc);
                                            }
                                        }
                                    }
                                },
                                "▶"
                            }
                        }

                        // Stat badges
                        div { class: "flex items-center gap-1.5 text-[11px] font-mono font-bold",
                            if s_add > 0 {
                                span { class: "px-2 py-0.5 rounded-md bg-[var(--zd-accent)]/15 text-[var(--zd-accent)] border border-[var(--zd-accent)]/25", "+{s_add}" }
                            }
                            if s_del > 0 {
                                span { class: "px-2 py-0.5 rounded-md bg-[var(--zd-error)]/15 text-[var(--zd-error)] border border-[var(--zd-error)]/25", "-{s_del}" }
                            }
                            if s_mod > 0 {
                                span { class: "px-2 py-0.5 rounded-md bg-[var(--zd-primary)]/15 text-[var(--zd-primary)] border border-[var(--zd-primary)]/25", "~{s_mod}" }
                            }
                        }
                    } else if semantic_result.is_ok() {
                        span {
                            class: "flex items-center gap-1.5 text-xs font-mono text-[var(--zd-accent)] font-semibold px-2.5 py-1.5 rounded-lg bg-[var(--zd-accent)]/10 border border-[var(--zd-accent)]/20",
                            "✓  No Differences"
                        }
                    }
                }

                // Right group: Mode toggle + Normalize action
                div { class: "flex items-center gap-2 shrink-0",

                    // Normalize shortcut
                    {
                        let l_content = left_content.clone();
                        let l_id = left_id.clone();
                        let r_content = right_content.clone();
                        rsx! {
                            button {
                                class: "text-xs px-2.5 py-1.5 rounded-lg bg-[var(--zd-surface-raised)] border border-[var(--zd-border)] hover:bg-[var(--zd-surface-hover)] text-[var(--zd-text-secondary)] hover:text-[var(--zd-text-primary)] font-semibold transition-colors shadow-sm font-mono",
                                title: "Sort keys and reformat both tabs",
                                onclick: move |_| {
                                    if let Ok(fmt) = format_json_opts(&l_content, 2, true) {
                                        if !l_id.is_empty() {
                                            on_update_tab.call((l_id.clone(), fmt));
                                        }
                                    }
                                    match selected_target.read().clone() {
                                        DiffTarget::OtherTab(ref r_id) => {
                                            if let Ok(fmt) = format_json_opts(&r_content, 2, true) {
                                                on_update_tab.call((r_id.clone(), fmt));
                                            }
                                        }
                                        DiffTarget::CustomText => {
                                            if let Ok(fmt) = format_json_opts(&r_content, 2, true) {
                                                custom_modified_content.set(fmt);
                                            }
                                        }
                                    }
                                },
                                "⚡ Normalize"
                            }
                        }
                    }

                    // Mode Segment Toggle
                    div {
                        class: "flex items-center bg-[var(--zd-surface-raised)] border border-[var(--zd-border)] rounded-lg overflow-hidden text-xs font-mono shadow-sm",
                        button {
                            class: if *diff_mode.read() == JsonDiffMode::TreeDiff {
                                "px-3 py-1.5 bg-[var(--zd-primary)] text-[var(--zd-primary-fg)] font-bold transition-colors"
                            } else {
                                "px-3 py-1.5 text-[var(--zd-text-secondary)] hover:bg-[var(--zd-surface-hover)] hover:text-[var(--zd-text-primary)] transition-colors"
                            },
                            onclick: move |_| diff_mode.set(JsonDiffMode::TreeDiff),
                            "Tree Diff"
                        }
                        button {
                            class: if *diff_mode.read() == JsonDiffMode::CodeDiff {
                                "px-3 py-1.5 bg-[var(--zd-primary)] text-[var(--zd-primary-fg)] font-bold transition-colors border-l border-[var(--zd-primary)]/40"
                            } else {
                                "px-3 py-1.5 text-[var(--zd-text-secondary)] hover:bg-[var(--zd-surface-hover)] hover:text-[var(--zd-text-primary)] transition-colors border-l border-[var(--zd-border)]"
                            },
                            onclick: move |_| diff_mode.set(JsonDiffMode::CodeDiff),
                            "Code Diff"
                        }
                    }
                }
            }

            // ═══════════════════════════════════════════════════════════════
            // BODY — View switching
            // ═══════════════════════════════════════════════════════════════
            if *diff_mode.read() == JsonDiffMode::TreeDiff {
                {
                    let l_val_opt = serde_json::from_str::<serde_json::Value>(&left_content);
                    let r_val_opt = serde_json::from_str::<serde_json::Value>(&right_content);

                    match (l_val_opt, r_val_opt, semantic_result.clone()) {
                        (Ok(l_val), Ok(r_val), Ok(changes)) => {
                            rsx! {
                                div { class: "flex flex-col flex-1 min-h-0",
                                    // Tree-diff toolbar
                                    div {
                                        class: "flex items-center justify-between px-4 py-2 bg-[var(--zd-surface-raised)] border-b border-[var(--zd-border)] gap-3 text-xs font-mono shrink-0",
                                        div { class: "flex items-center gap-2",
                                            button {
                                                class: "px-2.5 py-1 rounded-lg bg-[var(--zd-surface)] border border-[var(--zd-border)] hover:bg-[var(--zd-surface-hover)] text-[var(--zd-text-primary)] font-semibold transition-colors shadow-sm",
                                                title: "Expand all",
                                                onclick: move |_| {
                                                    let mut exp = expanded_paths.write();
                                                    collect_all_tree_paths(&l_val, "$", &mut exp);
                                                    collect_all_tree_paths(&r_val, "$", &mut exp);
                                                },
                                                "┼ Expand All"
                                            }
                                            button {
                                                class: "px-2.5 py-1 rounded-lg bg-[var(--zd-surface)] border border-[var(--zd-border)] hover:bg-[var(--zd-surface-hover)] text-[var(--zd-text-primary)] font-semibold transition-colors shadow-sm",
                                                title: "Collapse to root",
                                                onclick: move |_| {
                                                    let mut exp = expanded_paths.write();
                                                    exp.clear();
                                                    exp.insert("$".to_string());
                                                },
                                                "─ Collapse All"
                                            }
                                            button {
                                                class: if *only_show_changes.read() {
                                                    "px-2.5 py-1 rounded-lg bg-[var(--zd-primary)] text-[var(--zd-primary-fg)] font-semibold border border-[var(--zd-primary)] transition-all shadow-sm"
                                                } else {
                                                    "px-2.5 py-1 rounded-lg bg-[var(--zd-surface)] border border-[var(--zd-border)] hover:bg-[var(--zd-surface-hover)] text-[var(--zd-text-secondary)] font-semibold transition-all shadow-sm"
                                                },
                                                title: "Show only changed paths",
                                                onclick: move |_| {
                                                    let next = !*only_show_changes.read();
                                                    only_show_changes.set(next);
                                                },
                                                if *only_show_changes.read() { "⚡ Only Changes" } else { "All Paths" }
                                            }
                                        }

                                        // Column headers inside toolbar
                                        div { class: "flex items-center gap-2 text-[10px] font-mono font-bold text-[var(--zd-text-muted)] tracking-wide",
                                            span { class: "px-2 py-0.5 rounded bg-[var(--zd-error)]/10 text-[var(--zd-error)] border border-[var(--zd-error)]/20 text-[9px] uppercase tracking-widest", "BASE: {left_name}" }
                                            span { class: "opacity-40", "←→" }
                                            span { class: "px-2 py-0.5 rounded bg-[var(--zd-accent)]/10 text-[var(--zd-accent)] border border-[var(--zd-accent)]/20 text-[9px] uppercase tracking-widest", "TARGET: {right_name}" }
                                        }
                                    }

                                    // Tree aligned grid
                                    {
                                        let only_changes_flag = *only_show_changes.read();
                                        let active_idx = *active_diff_idx.read();
                                        let active_path = changes_for_nav.get(active_idx).map(|c| c.path.clone()).unwrap_or_default();
                                        let mut node_buf: Vec<AlignedTreeNode> = Vec::new();
                                        collect_aligned_tree_nodes(
                                            Some(&l_val), Some(&r_val), "$", 0, &changes, &expanded_paths.read(), only_changes_flag, &mut node_buf
                                        );

                                        rsx! {
                                            div { class: "grid grid-cols-2 divide-x divide-[var(--zd-border)] border-b border-[var(--zd-border)] bg-[var(--zd-surface)] text-[10px] font-mono font-bold tracking-wide shrink-0 select-none",
                                                div { class: "px-4 py-1 text-[var(--zd-error)]/70", "Base" }
                                                div { class: "px-4 py-1 text-[var(--zd-accent)]/70", "Target" }
                                            }
                                            div {
                                                class: "overflow-y-auto custom-scrollbar flex-1 min-h-0 font-mono text-xs select-text",
                                                for (node_idx, node) in node_buf.iter().enumerate() {
                                                    {
                                                        let is_active = node.path == active_path;
                                                        let row_id = if is_active { "active-diff-row".to_string() } else { format!("tree-row-{node_idx}") };
                                                        let (row_bg, left_accent, right_accent) = match node.status {
                                                            AlignedNodeStatus::Added => (
                                                                if is_active { "bg-[var(--zd-accent)]/20" } else { "hover:bg-[var(--zd-accent)]/8" },
                                                                "opacity-30 text-[var(--zd-text-muted)]",
                                                                "text-[var(--zd-accent)] font-semibold",
                                                            ),
                                                            AlignedNodeStatus::Deleted => (
                                                                if is_active { "bg-[var(--zd-error)]/20" } else { "hover:bg-[var(--zd-error)]/8" },
                                                                "text-[var(--zd-error)] font-semibold",
                                                                "opacity-30 text-[var(--zd-text-muted)]",
                                                            ),
                                                            AlignedNodeStatus::Modified => (
                                                                if is_active { "bg-[var(--zd-primary)]/15" } else { "hover:bg-[var(--zd-primary)]/8" },
                                                                "text-[var(--zd-error)]",
                                                                "text-[var(--zd-accent)]",
                                                            ),
                                                            AlignedNodeStatus::Equal => (
                                                                if is_active { "bg-[var(--zd-surface-raised)]" } else { "hover:bg-[var(--zd-surface-raised)]/60" },
                                                                "text-[var(--zd-text-secondary)]",
                                                                "text-[var(--zd-text-secondary)]",
                                                            ),
                                                        };
                                                        let path = node.path.clone();
                                                        rsx! {
                                                            div {
                                                                id: "{row_id}",
                                                                key: "{node_idx}",
                                                                class: "grid grid-cols-2 divide-x divide-[var(--zd-border)]/30 border-b border-[var(--zd-border)]/15 transition-colors {row_bg}",
                                                                // Base cell
                                                                div {
                                                                    class: "flex items-center overflow-hidden min-h-[28px] px-2 py-0.5 {left_accent}",
                                                                    onclick: move |_| {
                                                                        let mut exp = expanded_paths.write();
                                                                        if exp.contains(&path) { exp.remove(&path); } else { exp.insert(path.clone()); }
                                                                    },
                                                                    {render_aligned_tree_cell(&node.left_val, node, "left", expanded_paths)}
                                                                }
                                                                // Target cell
                                                                div {
                                                                    class: "flex items-center overflow-hidden min-h-[28px] px-2 py-0.5 {right_accent}",
                                                                    {render_aligned_tree_cell(&node.right_val, node, "right", expanded_paths)}
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                                if node_buf.is_empty() {
                                                    div { class: "p-12 flex flex-col items-center justify-center text-[var(--zd-text-muted)] gap-3",
                                                        div { class: "w-12 h-12 rounded-full bg-[var(--zd-surface-raised)] border border-[var(--zd-border)] flex items-center justify-center text-xl text-[var(--zd-accent)] font-bold", "✓" }
                                                        span { class: "text-sm font-semibold text-[var(--zd-text-primary)]", "No Differences" }
                                                        span { class: "text-xs opacity-70 font-mono", "Both JSON documents are identical." }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        _ => rsx! {
                            div { class: "flex-1 flex flex-col items-center justify-center gap-4 text-[var(--zd-text-muted)] p-12",
                                div { class: "w-14 h-14 rounded-full bg-[var(--zd-error)]/10 border border-[var(--zd-error)]/20 flex items-center justify-center text-2xl text-[var(--zd-error)] font-black", "!" }
                                span { class: "text-base font-semibold text-[var(--zd-text-primary)]", "Tree Diff Requires Valid JSON" }
                                span { class: "text-xs font-mono text-[var(--zd-error)] text-center max-w-sm",
                                    {
                                        match semantic_result.as_ref() {
                                            Err(e) => e.clone(),
                                            _ => "Unable to parse one or both JSON inputs.".to_string(),
                                        }
                                    }
                                }
                                button {
                                    class: "mt-2 px-3 py-1.5 text-xs rounded-lg bg-[var(--zd-surface-raised)] border border-[var(--zd-border)] hover:bg-[var(--zd-surface-hover)] font-mono font-semibold transition-colors",
                                    onclick: move |_| diff_mode.set(JsonDiffMode::CodeDiff),
                                    "Switch to Code Diff to Edit →"
                                }
                            }
                        },
                    }
                }
            } else {
                // ──────────────────────────────────────────────────────────
                // CODE DIFF — Two live, fully editable side-by-side editors
                // ──────────────────────────────────────────────────────────
                div { class: "zd-tool-fill grid grid-cols-1 md:grid-cols-2 min-h-0 flex-1 divide-y md:divide-y-0 md:divide-x divide-[var(--zd-border)]",

                    // Left / Base editor
                    div { class: "flex flex-col min-h-0 flex-1",
                        div { class: "flex items-center justify-between px-3 py-2 border-b border-[var(--zd-border)] bg-[var(--zd-surface-raised)] shrink-0",
                            div { class: "flex items-center gap-2",
                                span { class: "text-[9px] font-black uppercase tracking-widest text-[var(--zd-error)] px-1.5 py-0.5 rounded bg-[var(--zd-error)]/10 border border-[var(--zd-error)]/20", "BASE" }
                                span { class: "text-xs font-mono font-semibold text-[var(--zd-text-primary)] truncate", "{left_name}" }
                            }
                            // Left parse indicator
                            {
                                let is_valid = serde_json::from_str::<serde_json::Value>(&left_content).is_ok();
                                rsx! {
                                    span {
                                        class: if is_valid {
                                            "text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--zd-accent)]/10 text-[var(--zd-accent)] border border-[var(--zd-accent)]/20"
                                        } else {
                                            "text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--zd-error)]/10 text-[var(--zd-error)] border border-[var(--zd-error)]/20"
                                        },
                                        if is_valid { "✓ Valid JSON" } else { "✗ Invalid JSON" }
                                    }
                                }
                            }
                        }
                        CodePanel {
                            title: "".to_string(),
                            value: left_content.clone(),
                            oninput: Some(EventHandler::new({
                                let id = left_id.clone();
                                let on_update = on_update_tab.clone();
                                move |e: Event<FormData>| {
                                    if !id.is_empty() {
                                        on_update.call((id.clone(), e.value()));
                                    }
                                }
                            })),
                            on_edit: Some(EventHandler::new({
                                let id = left_id.clone();
                                let on_update = on_update_tab.clone();
                                move |v: String| {
                                    if !id.is_empty() {
                                        on_update.call((id.clone(), v));
                                    }
                                }
                            })),
                            placeholder: "Paste base JSON here...",
                            language: CodeLanguage::Json,
                        }
                    }

                    // Right / Target editor
                    div { class: "flex flex-col min-h-0 flex-1",
                        div { class: "flex items-center justify-between px-3 py-2 border-b border-[var(--zd-border)] bg-[var(--zd-surface-raised)] shrink-0",
                            div { class: "flex items-center gap-2",
                                span { class: "text-[9px] font-black uppercase tracking-widest text-[var(--zd-accent)] px-1.5 py-0.5 rounded bg-[var(--zd-accent)]/10 border border-[var(--zd-accent)]/20", "TARGET" }
                                span { class: "text-xs font-mono font-semibold text-[var(--zd-text-primary)] truncate", "{right_name}" }
                            }
                            // Right parse indicator
                            {
                                let is_valid = serde_json::from_str::<serde_json::Value>(&right_content).is_ok();
                                rsx! {
                                    span {
                                        class: if is_valid {
                                            "text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--zd-accent)]/10 text-[var(--zd-accent)] border border-[var(--zd-accent)]/20"
                                        } else {
                                            "text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--zd-error)]/10 text-[var(--zd-error)] border border-[var(--zd-error)]/20"
                                        },
                                        if is_valid { "✓ Valid JSON" } else { "✗ Invalid JSON" }
                                    }
                                }
                            }
                        }
                        CodePanel {
                            title: "".to_string(),
                            value: right_content.clone(),
                            oninput: Some(EventHandler::new({
                                let r_id = right_id_opt.clone();
                                let on_update = on_update_tab.clone();
                                move |e: Event<FormData>| {
                                    if let Some(ref id) = r_id {
                                        on_update.call((id.clone(), e.value()));
                                    } else {
                                        custom_modified_content.set(e.value());
                                    }
                                }
                            })),
                            on_edit: Some(EventHandler::new({
                                let r_id = right_id_opt.clone();
                                let on_update = on_update_tab.clone();
                                move |v: String| {
                                    if let Some(ref id) = r_id {
                                        on_update.call((id.clone(), v));
                                    } else {
                                        custom_modified_content.set(v);
                                    }
                                }
                            })),
                            placeholder: "Paste target JSON here...",
                            language: CodeLanguage::Json,
                        }
                    }
                }
            }
        }
    }
}
