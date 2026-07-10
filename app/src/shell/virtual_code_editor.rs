//! Viewport-virtualized, Rope-backed code editor for large files (JSON tools).
//!
//! Unlike `code_editor::CodeEditor` (which binds the full document into a single
//! `<textarea>`), this component keeps the document in a `ropey::Rope` and only
//! ever materializes a small windowed slice (visible lines +/- overscan) into the
//! DOM. Scroll position drives which window is rendered, so render/highlight cost
//! is O(visible lines), not O(file size).
//!
//! Markup/classes are kept identical to `CodeEditor` so no visual/design changes
//! are introduced by switching a panel over to this component.

use dioxus::prelude::*;
use ropey::Rope;
use std::collections::HashSet;
use std::sync::atomic::{AtomicU64, Ordering};
use zerodock_core::highlight_to_html;

use crate::shell::code_editor::CodeLanguage;

static VEDITOR_ID_COUNTER: AtomicU64 = AtomicU64::new(0);

/// Fixed row height in px — matches the gutter's `h-[20px] leading-[20px]` rows
/// in `code_editor.rs`, so the spacer/scrollbar math lines up with rendered rows.
const ROW_HEIGHT_PX: f64 = 20.0;
/// Extra lines rendered above/below the visible range so fast scroll/typing at
/// the edges doesn't visibly hit an unrendered wall before the next render.
const OVERSCAN_LINES: usize = 60;
/// Conservative default viewport row estimate used before the container has
/// been measured (first paint).
const DEFAULT_VISIBLE_ROWS: usize = 200;
/// Cap on how far `find_collapsible_blocks` scans from the window edge to find
/// an enclosing block, so a single huge/unbalanced file can't turn a scroll
/// event into an O(file) scan.
const FOLD_SCAN_LINE_CAP: usize = 20_000;

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

fn find_match_ranges(haystack: &str, needle: &str) -> Vec<(usize, usize)> {
    if needle.is_empty() {
        return Vec::new();
    }
    haystack
        .match_indices(needle)
        .map(|(start, _)| (start, start + needle.len()))
        .collect()
}

#[cfg(target_arch = "wasm32")]
fn textarea_by_id(id: &str) -> Option<web_sys::HtmlTextAreaElement> {
    let doc = web_sys::window()?.document()?;
    let el = doc.get_element_by_id(id)?;
    wasm_bindgen::JsCast::dyn_into(el).ok()
}

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

#[cfg(target_arch = "wasm32")]
fn read_caret_by_id(id: &str) -> Option<usize> {
    let ta = textarea_by_id(id)?;
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

/// Window of the document currently materialized into the DOM: a half-open
/// line range `[start_line, end_line)` (0-indexed), plus the char offset at
/// which that range begins — the anchor for translating every window-local
/// caret/selection offset coming out of the `<textarea>` back to document-
/// global Rope coordinates.
#[derive(Clone, Copy, PartialEq)]
struct Window {
    start_line: usize,
    end_line: usize,
    start_char: usize,
}

fn compute_window(rope: &Rope, scroll_top: f64, viewport_rows: usize) -> Window {
    let total_lines = rope.len_lines();
    let first_visible = (scroll_top / ROW_HEIGHT_PX).floor().max(0.0) as usize;
    let first_visible = first_visible.min(total_lines);
    let start_line = first_visible.saturating_sub(OVERSCAN_LINES).min(total_lines);
    let end_line = (first_visible + viewport_rows + OVERSCAN_LINES)
        .min(total_lines)
        .max(start_line);
    let start_char = rope.line_to_char(start_line);
    Window {
        start_line,
        end_line,
        start_char,
    }
}

/// Find the char range `[start_line, end_line)` covers in `rope`, returning the
/// text slice as an owned `String` (bounded to window size, not file size).
fn window_slice(rope: &Rope, window: Window) -> (String, usize) {
    let total_lines = rope.len_lines();
    let end_line = window.end_line.min(total_lines);
    let start_line = window.start_line.min(end_line);
    let start_char = rope.line_to_char(start_line);
    let end_char = rope.line_to_char(end_line);
    (rope.slice(start_char..end_char).to_string(), start_char)
}

/// Fold-block detection bounded to a window: scans forward/backward from the
/// window edges up to `FOLD_SCAN_LINE_CAP` lines to resolve any block that
/// opens/closes outside the visible slice. This avoids an O(file) bracket scan
/// on every render, at the cost of not detecting extremely long-range folds
/// (beyond the cap) — acceptable for the live/windowed path; "Collapse All"
/// (user-initiated) still runs the full-file scan from `zerodock_core`.
fn find_collapsible_blocks_windowed(
    rope: &Rope,
    window: Window,
) -> std::collections::HashMap<usize, usize> {
    let total_lines = rope.len_lines();
    let scan_start = window.start_line.saturating_sub(FOLD_SCAN_LINE_CAP);
    let scan_end = (window.end_line + FOLD_SCAN_LINE_CAP).min(total_lines);
    let start_char = rope.line_to_char(scan_start);
    let end_char = rope.line_to_char(scan_end);
    let text = rope.slice(start_char..end_char).to_string();
    let blocks = zerodock_core::find_collapsible_blocks(&text);
    blocks
        .into_iter()
        .map(|(s, e)| (s + scan_start, e + scan_start))
        .collect()
}

#[component]
pub fn VirtualCodeEditor(
    buffer: Signal<Rope>,
    #[props(default)] on_edit_range: Option<EventHandler<(usize, usize, String)>>,
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
    let mut scroll_top = use_signal(|| 0.0f64);
    let mut viewport_rows = use_signal(|| DEFAULT_VISIBLE_ROWS);

    let editor_id = use_signal(|| {
        format!(
            "zd-vcode-input-{}",
            VEDITOR_ID_COUNTER.fetch_add(1, Ordering::Relaxed)
        )
    });

    let editable = !read_only && on_edit_range.is_some();

    let rope_snapshot = buffer.read().clone();
    let total_lines_val = rope_snapshot.len_lines().max(1);
    let total_height_px = total_lines_val as f64 * ROW_HEIGHT_PX;

    let window = compute_window(&rope_snapshot, *scroll_top.read(), *viewport_rows.read());
    let (window_text, window_start_char) = window_slice(&rope_snapshot, window);
    let blocks = find_collapsible_blocks_windowed(&rope_snapshot, window);

    let (display_value, visible_line_nums): (String, Vec<usize>) = {
        let collapsed = collapsed_blocks.read();
        let window_line_offset = window.start_line;
        if collapsed.is_empty() || blocks.is_empty() {
            let nums: Vec<usize> = (window.start_line + 1..=window.end_line.max(window.start_line + 1)).collect();
            (window_text.clone(), nums)
        } else {
            let mut disp_lines = Vec::new();
            let mut line_nums = Vec::new();
            let raw_lines: Vec<&str> = window_text.split('\n').collect();
            let mut i = 1;
            while i <= raw_lines.len() {
                let global_line = window_line_offset + i;
                let text = raw_lines[i - 1];
                if collapsed.contains(&global_line) {
                    if let Some(&end_line) = blocks.get(&global_line) {
                        let collapsed_count = end_line.saturating_sub(global_line);
                        disp_lines.push(format!("{} ... [{} lines collapsed]", text, collapsed_count));
                        line_nums.push(global_line);
                        let skip = end_line.saturating_sub(global_line) + 1;
                        i += skip.max(1);
                        continue;
                    }
                }
                disp_lines.push(text.to_string());
                line_nums.push(global_line);
                i += 1;
            }
            (disp_lines.join("\n"), line_nums)
        }
    };

    // Highlight only the windowed slice — a few KB at most regardless of file size.
    let highlight_html = highlight_to_html(&display_value, language.into());
    let matches_list = find_match_ranges(&window_text, &find_query.read());

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
            // `c` is window-local (relative to the textarea's own content);
            // translate to document-global char offset for status-bar display.
            caret_char.set(window_start_char + c);
        }
    };

    let (line_no, col_no) = line_col_at(&rope_snapshot.to_string(), *caret_char.read());
    let wrap_on = *wrap.read();
    let wrap_class = if wrap_on { "zd-code-wrap" } else { "zd-code-nowrap" };
    let id_str = editor_id.read().clone();

    // Applies a window-local (start,end,replacement) edit: translates to
    // document-global char offsets, mutates the Rope in place (O(log n)),
    // and notifies the caller. This is the single choke point every mutating
    // handler below funnels through, so the offset math lives in one place.
    let mut apply_window_edit = {
        let mut buffer = buffer;
        move |local_start: usize, local_end: usize, replacement: String, new_local_caret: usize| {
            let global_start = window_start_char + local_start;
            let global_end = window_start_char + local_end;
            {
                let mut r = buffer.write();
                if global_end > global_start {
                    r.remove(global_start..global_end);
                }
                if !replacement.is_empty() {
                    r.insert(global_start, &replacement);
                }
            }
            if let Some(h) = on_edit_range.as_ref() {
                h.call((global_start, global_end, replacement));
            }
            pending_caret.set(Some(new_local_caret));
        }
    };

    let on_scroll = {
        #[cfg_attr(not(target_arch = "wasm32"), allow(unused_variables))]
        let scroll_id = id_str.clone();
        move |_| {
        // Dioxus 0.7's scroll event doesn't universally expose scrollTop across
        // targets yet; read it directly from the DOM element by id on wasm, and
        // no-op on desktop webview builds where this event still fires but the
        // direct DOM read isn't wired (falls back to overscan covering typical
        // native-webview scroll deltas until measured).
        #[cfg(target_arch = "wasm32")]
        {
            if let Some(doc) = web_sys::window().and_then(|w| w.document()) {
                if let Some(el) = doc.get_element_by_id(&format!("{}-scroll", scroll_id)) {
                    scroll_top.set(el.scroll_top() as f64);
                    let rows = (el.client_height() as f64 / ROW_HEIGHT_PX).ceil() as usize;
                    if rows > 0 {
                        viewport_rows.set(rows);
                    }
                }
            }
        }
        }
    };

    let window_text_key = window_text.clone();

    rsx! {
        div {
            class: "zd-code-editor-shell flex flex-1 min-h-0 flex-col",
            if *find_open.read() {
                div {
                    class: "zd-code-find shrink-0 flex flex-wrap items-center gap-2 px-2 py-1.5 border-b border-[var(--zd-border)] bg-[var(--zd-surface-raised)]",
                    input {
                        class: "zd-code-find-input flex-1 min-w-[8rem] px-2 py-1 text-xs font-mono rounded border border-[var(--zd-border)] bg-[var(--zd-surface)] focus-ring",
                        r#type: "text",
                        placeholder: "Find… (current window)",
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
                                let window_text = window_text_key.clone();
                                move |_| {
                                    let q = find_query.read().clone();
                                    let r = replace_query.read().clone();
                                    if q.is_empty() { return; }
                                    let m = matches.clone();
                                    if m.is_empty() { return; }
                                    let idx = *match_index.read() % m.len();
                                    let (s_char, e_char) = m[idx];
                                    let new_caret = s_char + r.chars().count();
                                    let _ = &window_text;
                                    apply_window_edit(s_char, e_char, r, new_caret);
                                }
                            },
                            "Replace"
                        }
                        button {
                            class: "toolbar-btn px-2 py-1 text-xs",
                            aria_label: "Replace all matches in current window",
                            title: "Replaces matches within the currently rendered window. Scroll to reach matches elsewhere in the file.",
                            onclick: {
                                let window_text = window_text_key.clone();
                                move |_| {
                                    let q = find_query.read().clone();
                                    let r = replace_query.read().clone();
                                    if q.is_empty() || q == r { return; }
                                    let ranges = find_match_ranges(&window_text, &q);
                                    if ranges.is_empty() { return; }
                                    // Apply back-to-front so earlier offsets stay valid.
                                    for (s, e) in ranges.into_iter().rev() {
                                        apply_window_edit(s, e, r.clone(), s);
                                    }
                                }
                            },
                            "All (window)"
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
                    id: "{id_str}-scroll",
                    onscroll: on_scroll,
                    div {
                        // Spacer: gives the scroll container the full document's
                        // height so scrollbar size/position stay correct even
                        // though only the windowed slice is actually rendered.
                        style: "height: {total_height_px}px; position: relative;",
                        div {
                            class: "flex min-h-full",
                            style: "position: absolute; top: {window.start_line as f64 * ROW_HEIGHT_PX}px; left: 0; right: 0;",
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
                                    oninput: {
                                        let window_text = window_text_key.clone();
                                        move |e: Event<FormData>| {
                                            if !editable {
                                                return;
                                            }
                                            let new_val = e.value();
                                            // Diff the new (window-sized) textarea value against the
                                            // last-rendered window text to find the minimal changed
                                            // range — bounded to viewport size, never file size.
                                            let old_chars: Vec<char> = window_text.chars().collect();
                                            let new_chars: Vec<char> = new_val.chars().collect();
                                            let mut prefix = 0;
                                            while prefix < old_chars.len()
                                                && prefix < new_chars.len()
                                                && old_chars[prefix] == new_chars[prefix]
                                            {
                                                prefix += 1;
                                            }
                                            let mut old_suffix = old_chars.len();
                                            let mut new_suffix = new_chars.len();
                                            while old_suffix > prefix
                                                && new_suffix > prefix
                                                && old_chars[old_suffix - 1] == new_chars[new_suffix - 1]
                                            {
                                                old_suffix -= 1;
                                                new_suffix -= 1;
                                            }
                                            let replacement: String = new_chars[prefix..new_suffix].iter().collect();
                                            let new_caret = new_suffix;
                                            apply_window_edit(prefix, old_suffix, replacement, new_caret);
                                            sync_caret();
                                        }
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

                                        // Tab / Shift+Tab indent handling — operates on the
                                        // window-local text; offsets stay window-local until
                                        // apply_window_edit translates them.
                                        if e.key() == Key::Tab {
                                            e.prevent_default();
                                            if let Some(caret) = read_caret_by_id(&editor_id.read()) {
                                                let text = window_text_key.clone();
                                                let caret_byte = char_to_byte(&text, caret);
                                                let line_start = text[..caret_byte].rfind('\n').map(|i| i + 1).unwrap_or(0);
                                                let line_end = text[caret_byte..].find('\n').map(|i| caret_byte + i).unwrap_or(text.len());
                                                let line_start_char = text[..line_start].chars().count();
                                                let line_end_char = text[..line_end].chars().count();
                                                if e.modifiers().shift() {
                                                    let block = &text[line_start..line_end];
                                                    let mut new_block = String::with_capacity(block.len());
                                                    let mut removed_before_caret = 0usize;
                                                    for ln in block.split_inclusive('\n') {
                                                        let body = ln.strip_suffix('\n').unwrap_or(ln);
                                                        if body.starts_with(indent_unit.as_str()) {
                                                            new_block.push_str(&body[indent_unit.len()..]);
                                                            removed_before_caret += indent_unit.len();
                                                        } else if let Some(stripped) = body.strip_prefix('\t') {
                                                            new_block.push_str(stripped);
                                                            removed_before_caret += 1;
                                                        } else {
                                                            new_block.push_str(body);
                                                        }
                                                        if ln.ends_with('\n') {
                                                            new_block.push('\n');
                                                        }
                                                    }
                                                    let new_caret = caret.saturating_sub(removed_before_caret.min(indent_unit.len().max(1)));
                                                    apply_window_edit(line_start_char, line_end_char, new_block, new_caret.max(line_start_char));
                                                } else {
                                                    let block = &text[line_start..line_end];
                                                    let mut new_block = String::with_capacity(block.len() + indent_unit.len());
                                                    for ln in block.split_inclusive('\n') {
                                                        new_block.push_str(&indent_unit);
                                                        new_block.push_str(ln);
                                                    }
                                                    let new_caret = caret + indent_unit.len();
                                                    apply_window_edit(line_start_char, line_end_char, new_block, new_caret);
                                                }
                                            }
                                            return;
                                        }

                                        // Enter: auto-indent
                                        if e.key() == Key::Enter {
                                            if let Some(caret) = read_caret_by_id(&editor_id.read()) {
                                                let text = window_text_key.clone();
                                                let caret_byte = char_to_byte(&text, caret);
                                                let line_start = text[..caret_byte].rfind('\n').map(|i| i + 1).unwrap_or(0);
                                                let current_line = &text[line_start..caret_byte];
                                                let indent = leading_indent(current_line).to_string();
                                                let extra = if ends_open_bracket(current_line) {
                                                    indent_unit.clone()
                                                } else {
                                                    String::new()
                                                };
                                                let insertion = format!("\n{indent}{extra}");
                                                let new_caret = caret + insertion.chars().count();
                                                e.prevent_default();
                                                apply_window_edit(caret, caret, insertion, new_caret);
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
                                                    let insertion = format!("{ch}{close}");
                                                    let new_caret = caret + 1;
                                                    e.prevent_default();
                                                    apply_window_edit(caret, caret, insertion, new_caret);
                                                }
                                            }
                                        }
                                    },
                                }
                            }
                        }
                    }
                }
            }
            div {
                class: "zd-code-status shrink-0 flex items-center justify-between gap-3 px-3 py-1 border-t border-[var(--zd-border)] bg-[var(--zd-surface-raised)] text-xs text-[var(--zd-text-muted)] zd-mono-label",
                span {
                    "Ln {line_no}, Col {col_no}    ·    {total_lines_val} lines (virtualized)"
                }
                div {
                    class: "flex items-center gap-2",
                    if !blocks.is_empty() {
                        button {
                            class: "toolbar-btn px-1.5 py-0.5 text-xs",
                            title: "Collapse all blocks in the current window",
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

#[cfg(test)]
mod tests {
    use super::*;

    fn ref_apply(s: &str, start: usize, end: usize, replacement: &str) -> String {
        let chars: Vec<char> = s.chars().collect();
        let mut out: String = chars[..start].iter().collect();
        out.push_str(replacement);
        out.push_str(&chars[end..].iter().collect::<String>());
        out
    }

    /// The core correctness property for the window-local -> document-global
    /// translation: applying a window-local edit through `apply_window_edit`'s
    /// logic (global_start = window_start_char + local_start, etc.) against a
    /// Rope must match applying the same edit directly against an equivalent
    /// plain-String reference implementation.
    #[test]
    fn window_local_edit_matches_reference_string_edit() {
        let doc = "line1\nline2\nline3\nline4\nline5\n";
        let mut rope = Rope::from_str(doc);
        let mut reference = doc.to_string();

        // Simulate a window starting at line 2 (char offset of "line3").
        let window_start_char = rope.line_to_char(2);

        // Edit: replace "line3" (window-local offsets 0..5) with "LINE_THREE".
        let local_start = 0usize;
        let local_end = 5usize;
        let replacement = "LINE_THREE";

        let global_start = window_start_char + local_start;
        let global_end = window_start_char + local_end;

        rope.remove(global_start..global_end);
        rope.insert(global_start, replacement);

        reference = ref_apply(&reference, global_start, global_end, replacement);

        assert_eq!(rope.to_string(), reference);
        assert!(rope.to_string().contains("LINE_THREE"));
    }

    #[test]
    fn window_local_edit_sequence_matches_reference() {
        let doc: String = (0..50).map(|i| format!("row-{i}\n")).collect();
        let mut rope = Rope::from_str(&doc);
        let mut reference = doc.clone();

        // Window starting at line 10.
        let window_start_line = 10;
        let window_start_char = rope.line_to_char(window_start_line);

        // Apply a sequence of window-local edits, translating each one.
        let edits: &[(usize, usize, &str)] = &[
            (0, 3, "XXX"),   // replace "row" -> "XXX" on the first windowed line
            (10, 10, "!"),   // pure insertion
            (5, 8, ""),      // pure deletion
        ];

        for &(local_start, local_end, replacement) in edits {
            let global_start = window_start_char + local_start;
            let global_end = window_start_char + local_end;
            rope.remove(global_start..global_end);
            rope.insert(global_start, replacement);
            reference = ref_apply(&reference, global_start, global_end, replacement);
        }

        assert_eq!(rope.to_string(), reference);
    }

    #[test]
    fn compute_window_stays_within_bounds() {
        let doc: String = (0..1000).map(|i| format!("line{i}\n")).collect();
        let rope = Rope::from_str(&doc);
        let w = compute_window(&rope, 0.0, 50);
        assert_eq!(w.start_line, 0);
        assert!(w.end_line <= rope.len_lines());

        // Scrolled to the very end: end_line must not exceed total lines.
        let w2 = compute_window(&rope, 1_000_000.0, 50);
        assert!(w2.end_line <= rope.len_lines());
        assert!(w2.start_line <= w2.end_line);
    }

    #[test]
    fn window_slice_matches_rope_content_for_range() {
        let doc = "a\nb\nc\nd\ne\n";
        let rope = Rope::from_str(doc);
        let window = Window {
            start_line: 1,
            end_line: 3,
            start_char: rope.line_to_char(1),
        };
        let (slice, start_char) = window_slice(&rope, window);
        assert_eq!(slice, "b\nc\n");
        assert_eq!(start_char, rope.line_to_char(1));
    }
}
