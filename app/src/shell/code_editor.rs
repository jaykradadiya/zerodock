use dioxus::prelude::*;
use std::sync::atomic::{AtomicU64, Ordering};
use std::collections::BTreeSet;
use ropey::Rope;
use zerodock_core::{find_collapsible_blocks, highlight_to_html, line_count, EditorLanguage};
use std::collections::HashSet;
pub use zerodock_editor::{
    Command as EditorCommand, Document as EngineDocument, RenderSnapshot as EditorRenderSnapshot,
    Selection as EditorSelection, Viewport as EditorViewport,
};

#[derive(Clone, Copy, PartialEq, Default)]
pub enum CodeLanguage {
    #[default]
    Plain,
    Json,
    Yaml,
    Shell,
}

impl From<CodeLanguage> for EditorLanguage {
    fn from(lang: CodeLanguage) -> Self {
        match lang {
            CodeLanguage::Plain => EditorLanguage::Plain,
            CodeLanguage::Json => EditorLanguage::Json,
            CodeLanguage::Yaml => EditorLanguage::Yaml,
            CodeLanguage::Shell => EditorLanguage::Shell,
        }
    }
}

#[derive(Clone)]
pub struct EditorState {
    pub buffer: Rope,
    pub cursor_char: usize,
    pub scroll_top: usize,
    pub folded_lines: BTreeSet<usize>,
    pub engine: zerodock_editor::Document,
}

impl EditorState {
    pub fn new(text: &str) -> Self {
        let engine = zerodock_editor::Document::new(text);
        Self {
            buffer: engine.buffer().as_rope().clone(),
            cursor_char: 0,
            scroll_top: 0,
            folded_lines: BTreeSet::new(),
            engine,
        }
    }

    pub fn execute(&mut self, cmd: zerodock_editor::Command) -> Result<(), zerodock_editor::EditorError> {
        self.engine.execute_command(cmd)?;
        self.sync_from_engine();
        Ok(())
    }

    pub fn sync_from_engine(&mut self) {
        self.buffer = self.engine.buffer().as_rope().clone();
        self.cursor_char = self.engine.selections().primary().head;
    }

    pub fn sync_to_engine(&mut self) {
        self.engine = zerodock_editor::Document::new(&self.buffer.to_string());
        let _ = self.engine.execute_command(zerodock_editor::Command::SetSelection(
            zerodock_editor::Selection::caret(self.cursor_char)
        ));
    }

    pub fn render_snapshot(
        &self,
        viewport: &zerodock_editor::Viewport,
    ) -> Result<zerodock_editor::RenderSnapshot, zerodock_editor::EditorError> {
        self.engine.render_snapshot(viewport)
    }
}

static EDITOR_ID_COUNTER: AtomicU64 = AtomicU64::new(0);

fn find_match_ranges(haystack: &str, needle: &str) -> Vec<(usize, usize)> {
    if needle.is_empty() {
        return Vec::new();
    }
    haystack
        .match_indices(needle)
        .map(|(start, _)| (start, start + needle.len()))
        .collect()
}

/// Convert a UTF-16 code-unit offset (browser `selectionStart`) to a Rust char index.
#[cfg(target_arch = "wasm32")]
fn utf16_to_char_offset(s: &str, utf16_idx: usize) -> usize {
    let mut units = 0usize;
    for (i, c) in s.chars().enumerate() {
        if units >= utf16_idx {
            return i;
        }
        units += if (c as u32) >= 0x10000 { 2 } else { 1 };
    }
    s.chars().count()
}

/// Convert a Rust char index to a UTF-16 code-unit offset for `setSelectionRange`.
#[cfg(target_arch = "wasm32")]
fn char_to_utf16_offset(s: &str, char_idx: usize) -> usize {
    let mut units = 0usize;
    for (i, c) in s.chars().enumerate() {
        if i >= char_idx {
            break;
        }
        units += if (c as u32) >= 0x10000 { 2 } else { 1 };
    }
    units
}

fn char_to_byte(s: &str, char_idx: usize) -> usize {
    s.char_indices()
        .nth(char_idx)
        .map(|(b, _)| b)
        .unwrap_or(s.len())
}

fn line_col_at(value: &str, caret_char: usize) -> (usize, usize) {
    let total_chars = value.chars().count();
    let upto_char = caret_char.min(total_chars);
    let upto_byte = char_to_byte(value, upto_char);
    let upto = &value[..upto_byte.min(value.len())];
    let line = upto.matches('\n').count() + 1;
    let last_line_start = upto.rfind('\n').map(|i| i + 1).unwrap_or(0);
    let col = upto[last_line_start..].chars().count() + 1;
    (line, col)
}

fn leading_indent(line: &str) -> &str {
    let bytes = line.as_bytes();
    let mut i = 0;
    while i < bytes.len() && (bytes[i] == b' ' || bytes[i] == b'\t') {
        i += 1;
    }
    &line[..i]
}

fn ends_open_bracket(s: &str) -> bool {
    matches!(s.trim_end().chars().last(), Some('{') | Some('[') | Some('('))
}

// ---- web-only caret helpers (desktop falls back to default behaviour) ----

#[cfg(target_arch = "wasm32")]
fn read_caret_by_id(id: &str) -> Option<usize> {
    let doc = web_sys::window()?.document()?;
    let el = doc.get_element_by_id(id)?;
    let ta: web_sys::HtmlTextAreaElement = wasm_bindgen::JsCast::dyn_into(el).ok()?;
    let start = ta.selection_start().ok()??;
    Some(utf16_to_char_offset(&ta.value(), start as usize))
}

#[cfg(not(target_arch = "wasm32"))]
fn read_caret_by_id(_id: &str) -> Option<usize> {
    None
}

#[cfg(target_arch = "wasm32")]
fn apply_caret_by_id(id: &str, char_off: usize) {
    if let Some(ta) = textarea_by_id(id) {
        let utf16 = char_to_utf16_offset(&ta.value(), char_off);
        let _ = ta.set_selection_start(Some(utf16 as u32));
        let _ = ta.set_selection_end(Some(utf16 as u32));
        let _ = ta.focus();
    }
}

#[cfg(not(target_arch = "wasm32"))]
fn apply_caret_by_id(_id: &str, _char_off: usize) {}

#[cfg(target_arch = "wasm32")]
fn select_range_by_id(id: &str, start_char: usize, end_char: usize) {
    if let Some(ta) = textarea_by_id(id) {
        let v = ta.value();
        let s = char_to_utf16_offset(&v, start_char);
        let e = char_to_utf16_offset(&v, end_char);
        let _ = ta.set_selection_start(Some(s as u32));
        let _ = ta.set_selection_end(Some(e as u32));
        let _ = ta.focus();
    }
}

#[cfg(not(target_arch = "wasm32"))]
fn select_range_by_id(_id: &str, _start_char: usize, _end_char: usize) {}

#[cfg(target_arch = "wasm32")]
fn textarea_by_id(id: &str) -> Option<web_sys::HtmlTextAreaElement> {
    let doc = web_sys::window()?.document()?;
    let el = doc.get_element_by_id(id)?;
    wasm_bindgen::JsCast::dyn_into(el).ok()
}

#[component]
pub fn CodeEditor(
    value: String,
    #[props(default)] oninput: Option<EventHandler<Event<FormData>>>,
    #[props(default)] on_edit: Option<EventHandler<String>>,
    #[props(default)] read_only: bool,
    #[props(default)] placeholder: &'static str,
    #[props(default)] language: CodeLanguage,
    #[props(default)] tab_size: usize,
    #[props(default)] aria_label: &'static str,
) -> Element {
    let tab_size = if tab_size == 0 { 2 } else { tab_size };
    let indent_unit = " ".repeat(tab_size);

    let mut find_open = use_signal(|| false);
    let mut find_query = use_signal(String::new);
    let mut replace_query = use_signal(String::new);
    let mut match_index = use_signal(|| 0usize);
    let mut wrap = use_signal(|| false);
    let mut caret_char = use_signal(|| 0usize);
    let mut pending_caret = use_signal(|| None::<usize>);
    let mut collapsed_blocks = use_signal(HashSet::<usize>::new);

    let editor_id = use_signal(|| {
        format!(
            "zd-code-input-{}",
            EDITOR_ID_COUNTER.fetch_add(1, Ordering::Relaxed)
        )
    });

    let lines = line_count(&value);
    let blocks = find_collapsible_blocks(&value);

    let (display_value, visible_line_nums) = {
        let collapsed = collapsed_blocks.read();
        if collapsed.is_empty() || blocks.is_empty() {
            (value.clone(), (1..=lines).collect::<Vec<_>>())
        } else {
            let mut disp_lines = Vec::new();
            let mut line_nums = Vec::new();
            let raw_lines: Vec<&str> = value.split('\n').collect();
            let mut i = 1;
            while i <= raw_lines.len() {
                let text = raw_lines[i - 1];
                if collapsed.contains(&i) {
                    if let Some(&end_line) = blocks.get(&i) {
                        let collapsed_count = end_line.saturating_sub(i);
                        disp_lines.push(format!("{} ... [{} lines collapsed]", text, collapsed_count));
                        line_nums.push(i);
                        i = end_line + 1;
                        continue;
                    }
                }
                disp_lines.push(text.to_string());
                line_nums.push(i);
                i += 1;
            }
            (disp_lines.join("\n"), line_nums)
        }
    };

    let highlight_html = highlight_to_html(&display_value, language.into());
    let matches_list = find_match_ranges(&display_value, &find_query.read());
    let total_lines_val = lines;

    let gutter: String = visible_line_nums
        .iter()
        .map(|n| n.to_string())
        .collect::<Vec<_>>()
        .join("\n");

    let match_count = matches_list.len();
    let find_label = if find_query.read().is_empty() {
        "Find".to_string()
    } else if match_count == 0 {
        "No matches".to_string()
    } else {
        format!("{} of {}", (*match_index.read() % match_count) + 1, match_count)
    };

    let editable = !read_only && on_edit.is_some();

    // Owned clones of on_edit for each consuming handler (EventHandler is Clone,
    // but not Copy, so it cannot be shared across several `move` closures).
    let on_edit_key = on_edit.clone();
    let on_edit_replace = on_edit.clone();
    let on_edit_all = on_edit.clone();

    // `value` is a String (not Copy): give each mutating closure its own clone
    // so the `value: "{value}"` render binding and other reads still compile.
    let value_key = value.clone();
    let value_replace = value.clone();
    let value_all = value.clone();

    // Restore caret after a programmatic edit renders the new value.
    let mut pending_caret_eff = pending_caret.clone();
    let editor_id_eff = editor_id.clone();
    use_effect(move || {
        let target = *pending_caret_eff.read();
        if let Some(off) = target {
            pending_caret_eff.set(None);
            apply_caret_by_id(&editor_id_eff.read(), off);
        }
    });

    let mut sync_caret = move || {
        if let Some(c) = read_caret_by_id(&editor_id.read()) {
            caret_char.set(c);
        }
    };

    let (line_no, col_no) = line_col_at(&value, *caret_char.read());
    let wrap_on = *wrap.read();
    let wrap_class = if wrap_on { "zd-code-wrap" } else { "zd-code-nowrap" };
    let id_str = editor_id.read().clone();

    rsx! {
        div {
            class: "zd-code-editor-shell flex flex-1 min-h-0 flex-col",
            if *find_open.read() {
                div {
                    class: "zd-code-find shrink-0 flex flex-wrap items-center gap-2 px-2 py-1.5 border-b border-[var(--zd-border)] bg-[var(--zd-surface-raised)]",
                    input {
                        class: "zd-code-find-input flex-1 min-w-[8rem] px-2 py-1 text-xs font-mono rounded border border-[var(--zd-border)] bg-[var(--zd-surface)] focus-ring",
                        r#type: "text",
                        placeholder: "Find…",
                        aria_label: "Find in editor",
                        value: "{find_query}",
                        oninput: move |e: Event<FormData>| {
                            find_query.set(e.value());
                            match_index.set(0);
                        },
                        onkeydown: {
                            let matches = matches_list.clone();
                            move |e: Event<KeyboardData>| {
                            match e.key() {
                                Key::Enter => {
                                    e.prevent_default();
                                    let m = matches.clone();
                                    if !m.is_empty() {
                                        let cur = *match_index.read();
                                        let forward = !e.modifiers().shift();
                                        let next = if forward {
                                            (cur + 1) % m.len()
                                        } else if cur == 0 {
                                            m.len() - 1
                                        } else {
                                            cur - 1
                                        };
                                        match_index.set(next);
                                        let (s, en) = m[next];
                                        select_range_by_id(&editor_id.read(), s, en);
                                    }
                                }
                                Key::Escape => {
                                    e.prevent_default();
                                    find_open.set(false);
                                }
                                _ => {}
                            }
                            }
                        },
                    }
                    span { class: "text-xs text-[var(--zd-text-muted)] zd-mono-label shrink-0", "{find_label}" }
                    if editable {
                        input {
                            class: "zd-code-replace-input flex-1 min-w-[6rem] px-2 py-1 text-xs font-mono rounded border border-[var(--zd-border)] bg-[var(--zd-surface)] focus-ring",
                            r#type: "text",
                            placeholder: "Replace…",
                            aria_label: "Replace with",
                            value: "{replace_query}",
                            oninput: move |e: Event<FormData>| replace_query.set(e.value()),
                            onkeydown: move |e: Event<KeyboardData>| {
                                if e.key() == Key::Escape {
                                    e.prevent_default();
                                    find_open.set(false);
                                }
                            },
                        }
                        button {
                            class: "toolbar-btn px-2 py-1 text-xs",
                            aria_label: "Replace current match",
                            onclick: {
                                let matches = matches_list.clone();
                                move |_| {
                                let q = find_query.read().clone();
                                let r = replace_query.read().clone();
                                if q.is_empty() { return; }
                                let m = matches.clone();
                                if m.is_empty() { return; }
                                let idx = *match_index.read() % m.len();
                                let (s_char, e_char) = m[idx];
                                let s_byte = char_to_byte(&value_replace, s_char);
                                let e_byte = char_to_byte(&value_replace, e_char);
                                let mut new_val = String::with_capacity(value_replace.len() + r.len());
                                new_val.push_str(&value_replace[..s_byte]);
                                new_val.push_str(&r);
                                new_val.push_str(&value_replace[e_byte..]);
                                let new_caret = s_char + r.chars().count();
                                if let Some(h) = on_edit_replace.as_ref() {
                                    h.call(new_val);
                                    pending_caret.set(Some(new_caret));
                                }
                                }
                            },
                            "Replace"
                        }
                        button {
                            class: "toolbar-btn px-2 py-1 text-xs",
                            aria_label: "Replace all matches",
                            onclick: move |_| {
                                let q = find_query.read().clone();
                                let r = replace_query.read().clone();
                                if q.is_empty() || q == r { return; }
                                let new_val = value_all.replace(&q, &r);
                                if let Some(h) = on_edit_all.as_ref() {
                                    h.call(new_val);
                                    pending_caret.set(Some(0));
                                }
                            },
                            "All"
                        }
                    }
                    button {
                        class: "toolbar-btn px-2 py-1 text-xs",
                        aria_label: "Find previous",
                        onclick: {
                            let matches = matches_list.clone();
                            move |_| {
                            let m = matches.clone();
                            if m.is_empty() { return; }
                            let cur = *match_index.read();
                            let next = if cur == 0 { m.len() - 1 } else { cur - 1 };
                            match_index.set(next);
                            let (s, en) = m[next];
                            select_range_by_id(&editor_id.read(), s, en);
                            }
                        },
                        "‹"
                    }
                    button {
                        class: "toolbar-btn px-2 py-1 text-xs",
                        aria_label: "Find next",
                        onclick: {
                            let matches = matches_list.clone();
                            move |_| {
                            let m = matches.clone();
                            if m.is_empty() { return; }
                            let cur = *match_index.read();
                            let next = (cur + 1) % m.len();
                            match_index.set(next);
                            let (s, en) = m[next];
                            select_range_by_id(&editor_id.read(), s, en);
                            }
                        },
                        "›"
                    }
                    button {
                        class: "toolbar-btn px-2 py-1 text-xs",
                        aria_label: "Close find bar",
                        onclick: move |_| find_open.set(false),
                        "Close"
                    }
                }
            }
            div {
                class: "zd-code-editor flex flex-1 min-h-0",
                div {
                    class: "zd-code-scroll flex-1 min-h-0 overflow-auto relative",
                    div {
                        class: "flex min-h-full",
                        div {
                            class: "zd-code-gutter shrink-0 flex flex-col",
                            if visible_line_nums.len() <= 50_000 {
                                for &num in &visible_line_nums {
                                    div {
                                        class: "flex items-center justify-end gap-1.5 h-[20px] leading-[20px] font-mono text-xs text-[var(--zd-text-muted)] select-none",
                                        if blocks.contains_key(&num) {
                                            button {
                                                class: "hover:text-[var(--zd-text-primary)] cursor-pointer text-[10px]",
                                                title: if collapsed_blocks.read().contains(&num) { "Expand block" } else { "Collapse block" },
                                                onclick: move |_| {
                                                    let mut cb = collapsed_blocks.write();
                                                    if cb.contains(&num) {
                                                        cb.remove(&num);
                                                    } else {
                                                        cb.insert(num);
                                                    }
                                                },
                                                if collapsed_blocks.read().contains(&num) { "▶" } else { "▼" }
                                            }
                                        }
                                        span { "{num}" }
                                    }
                                }
                            } else {
                                pre {
                                    class: "zd-code-gutter-lines",
                                    aria_hidden: "true",
                                    "{gutter}"
                                }
                            }
                        }
                        div {
                            class: "zd-code-stack relative flex-1 min-h-full {wrap_class}",
                        pre {
                            class: "zd-code-highlight font-mono text-sm",
                            dangerous_inner_html: "{highlight_html}",
                        }
                        textarea {
                            class: "zd-code-input font-mono text-sm",
                            id: "{id_str}",
                            aria_label: if aria_label.is_empty() { "Code editor" } else { aria_label },
                            value: "{display_value}",
                            placeholder: "{placeholder}",
                            readonly: read_only,
                            spellcheck: false,
                            autocomplete: "off",
                            autocorrect: "off",
                            autocapitalize: "off",
                            oninput: move |e| {
                                if let Some(oninput) = oninput {
                                    oninput.call(e);
                                }
                                sync_caret();
                            },
                            onclick: move |_| sync_caret(),
                            onkeyup: move |_| sync_caret(),
                            onselect: move |_| sync_caret(),
                            onkeydown: move |e: Event<KeyboardData>| {
                                let ctrl = e.modifiers().ctrl() || e.modifiers().meta();
                                if ctrl && e.key() == Key::Character("f".into()) {
                                    e.prevent_default();
                                    find_open.set(true);
                                    return;
                                }
                                if ctrl && e.key() == Key::Character("h".into()) && editable {
                                    e.prevent_default();
                                    find_open.set(true);
                                    return;
                                }
                                if e.key() == Key::Escape && *find_open.read() {
                                    e.prevent_default();
                                    find_open.set(false);
                                    return;
                                }

                                if !editable {
                                    return;
                                }

                                // Tab / Shift+Tab indent handling
                                if e.key() == Key::Tab {
                                    e.prevent_default();
                                    if let Some(caret) = read_caret_by_id(&editor_id.read()) {
                                        let caret_byte = char_to_byte(&value_key, caret);
                                        let line_start = value_key[..caret_byte].rfind('\n').map(|i| i + 1).unwrap_or(0);
                                        let line_end = value_key[caret_byte..].find('\n').map(|i| caret_byte + i).unwrap_or(value_key.len());
                                        if e.modifiers().shift() {
                                            let mut new_val = String::with_capacity(value_key.len());
                                            new_val.push_str(&value_key[..line_start]);
                                            let block = &value_key[line_start..line_end];
                                            for ln in block.split_inclusive('\n') {
                                                let body = ln.strip_suffix('\n').unwrap_or(ln);
                                                if body.starts_with(indent_unit.as_str()) {
                                                    new_val.push_str(&body[indent_unit.len()..]);
                                                } else if let Some(stripped) = body.strip_prefix('\t') {
                                                    new_val.push_str(stripped);
                                                } else {
                                                    new_val.push_str(body);
                                                }
                                                if ln.ends_with('\n') {
                                                    new_val.push('\n');
                                                }
                                            }
                                            new_val.push_str(&value_key[line_end..]);
                                            let new_caret = caret.saturating_sub(indent_unit.len());
                                            if let Some(h) = on_edit_key.as_ref() {
                                                h.call(new_val);
                                                pending_caret.set(Some(new_caret));
                                            }
                                        } else {
                                            let mut new_val = String::with_capacity(value_key.len() + indent_unit.len());
                                            new_val.push_str(&value_key[..line_start]);
                                            let block = &value_key[line_start..line_end];
                                            for ln in block.split_inclusive('\n') {
                                                new_val.push_str(&indent_unit);
                                                new_val.push_str(ln);
                                            }
                                            new_val.push_str(&value_key[line_end..]);
                                            let new_caret = caret + indent_unit.len();
                                            if let Some(h) = on_edit_key.as_ref() {
                                                h.call(new_val);
                                                pending_caret.set(Some(new_caret));
                                            }
                                        }
                                    }
                                    return;
                                }

                                // Enter: auto-indent
                                if e.key() == Key::Enter {
                                    if let Some(caret) = read_caret_by_id(&editor_id.read()) {
                                        let caret_byte = char_to_byte(&value_key, caret);
                                        let line_start = value_key[..caret_byte].rfind('\n').map(|i| i + 1).unwrap_or(0);
                                        let current_line = &value[line_start..caret_byte];
                                        let indent = leading_indent(current_line).to_string();
                                        let extra = if ends_open_bracket(current_line) {
                                            indent_unit.clone()
                                        } else {
                                            String::new()
                                        };
                                        let insertion = format!("\n{indent}{extra}");
                                        let mut new_val = String::with_capacity(value_key.len() + insertion.len());
                                        new_val.push_str(&value_key[..caret_byte]);
                                        new_val.push_str(&insertion);
                                        new_val.push_str(&value_key[caret_byte..]);
                                        let new_caret = caret + insertion.chars().count();
                                        e.prevent_default();
                                        if let Some(h) = on_edit_key.as_ref() {
                                            h.call(new_val);
                                            pending_caret.set(Some(new_caret));
                                        }
                                    }
                                    return;
                                }

                                // Auto-pair brackets and quotes
                                if let Key::Character(ch) = e.key() {
                                    let pair_close = match ch.as_str() {
                                        "(" => Some(")"),
                                        "[" => Some("]"),
                                        "{" => Some("}"),
                                        "\"" => Some("\""),
                                        "'" => Some("'"),
                                        _ => None,
                                    };
                                    if let Some(close) = pair_close {
                                        if let Some(caret) = read_caret_by_id(&editor_id.read()) {
                                            let caret_byte = char_to_byte(&value_key, caret);
                                            let insertion = format!("{ch}{close}");
                                            let mut new_val = String::with_capacity(value_key.len() + 2);
                                            new_val.push_str(&value_key[..caret_byte]);
                                            new_val.push_str(&insertion);
                                            new_val.push_str(&value_key[caret_byte..]);
                                            let new_caret = caret + 1;
                                            e.prevent_default();
                                            if let Some(h) = on_edit_key.as_ref() {
                                                h.call(new_val);
                                                pending_caret.set(Some(new_caret));
                                            }
                                        }
                                    }
                                }
                            },
                        }
                    }
                }
                }
            }
            div {
                class: "zd-code-status shrink-0 flex items-center justify-between gap-3 px-3 py-1 border-t border-[var(--zd-border)] bg-[var(--zd-surface-raised)] text-xs text-[var(--zd-text-muted)] zd-mono-label",
                span {
                    "Ln {line_no}, Col {col_no}    ·    {total_lines_val} lines"
                }
                div {
                    class: "flex items-center gap-2",
                    if !blocks.is_empty() {
                        button {
                            class: "toolbar-btn px-1.5 py-0.5 text-xs",
                            title: "Collapse all blocks",
                            onclick: {
                                let b = blocks.clone();
                                move |_| {
                                    let all_starts: HashSet<usize> = b.keys().copied().collect();
                                    collapsed_blocks.set(all_starts);
                                }
                            },
                            "Collapse All"
                        }
                        if !collapsed_blocks.read().is_empty() {
                            button {
                                class: "toolbar-btn px-1.5 py-0.5 text-xs",
                                title: "Expand all blocks",
                                onclick: move |_| collapsed_blocks.write().clear(),
                                "Expand All"
                            }
                        }
                    }
                    button {
                        class: "toolbar-btn px-1.5 py-0.5 text-xs",
                        title: "Toggle word wrap",
                        aria_label: "Toggle word wrap",
                        aria_pressed: wrap_on,
                        onclick: move |_| {
                            let next = !*wrap.read();
                            wrap.set(next);
                        },
                        if wrap_on { "Wrap: On" } else { "Wrap: Off" }
                    }
                    button {
                        class: "toolbar-btn px-1.5 py-0.5 text-xs",
                        title: "Find (Ctrl/Cmd+F)",
                        aria_label: "Open find bar",
                        onclick: move |_| find_open.set(true),
                        "Find"
                    }
                }
            }
        }
    }
}
