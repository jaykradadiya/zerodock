use crate::state::{use_app_state, AppState};
use dioxus::prelude::*;

fn is_editable_target(tag: &str) -> bool {
    matches!(tag, "INPUT" | "TEXTAREA" | "SELECT")
}

#[cfg(any(target_arch = "wasm32", feature = "desktop"))]
fn install_document_keydown(state: AppState) {
    use std::sync::atomic::{AtomicBool, Ordering};
    static INSTALLED: AtomicBool = AtomicBool::new(false);

    // GlobalKeyboardHandler is mounted once at the app root, but hot-reload or
    // remount would otherwise add another `keydown` listener each time. The
    // guard installs the handler at most once for the page lifetime.
    if INSTALLED.swap(true, Ordering::SeqCst) {
        return;
    }

    use wasm_bindgen::prelude::*;
    use wasm_bindgen::JsCast;

    // The document listener holds a JS `Function` reference, but that function is
    // just a trampoline back into the Rust `Closure`. If the `Closure` is dropped,
    // the trampoline calls into freed memory and the listener silently no-ops —
    // which is exactly why the shortcuts stopped firing. We install at most once
    // (guarded by INSTALLED above), so leak the closure for the page lifetime to
    // keep the trampoline valid.
    let state_for_keys = state.clone();
    let handler: Closure<dyn FnMut(web_sys::KeyboardEvent)> = Closure::wrap(Box::new(move |e: web_sys::KeyboardEvent| {
        let key_str = e.key();
        let ctrl = e.ctrl_key() || e.meta_key();
        let mut st = state_for_keys.clone();

        if ctrl && key_str == "k" {
            e.prevent_default();
            let mut ui = st.ui.write();
            ui.command_palette_open = !ui.command_palette_open;
            return;
        }
        if ctrl && key_str == "." {
            e.prevent_default();
            let mut ui = st.ui.write();
            ui.zen_mode = !ui.zen_mode;
            return;
        }
        if ctrl && key_str == "Enter" {
            if st.ui.read().primary_action_registered {
                e.prevent_default();
                st.trigger_primary_action();
            }
            return;
        }
        if key_str == "/" && !ctrl {
            if let Some(target) = e.target().and_then(|t| t.dyn_into::<web_sys::Element>().ok()) {
                let tag = target.tag_name();
                if is_editable_target(&tag) {
                    return;
                }
            }
            if let Some(doc) = web_sys::window().and_then(|w| w.document()) {
                if let Some(el) = doc.get_element_by_id("catalog-search-input") {
                    if let Ok(input_el) = el.dyn_into::<web_sys::HtmlInputElement>() {
                        e.prevent_default();
                        let _ = input_el.focus();
                        return;
                    }
                }
            }
        }
        if key_str == "?" && !ctrl {
            if let Some(target) = e.target().and_then(|t| t.dyn_into::<web_sys::Element>().ok()) {
                let tag = target.tag_name();
                if is_editable_target(&tag) {
                    return;
                }
            }
            e.prevent_default();
            st.ui.write().shortcuts_help_open = true;
            return;
        }
        if key_str == "Escape" {
            let mut ui = st.ui.write();
            ui.command_palette_open = false;
            ui.shortcuts_help_open = false;
            if ui.zen_mode {
                ui.zen_mode = false;
            }
        }
    }) as Box<dyn FnMut(_)>);

    if let Some(doc) = web_sys::window().and_then(|w| w.document()) {
        let _ = doc.add_event_listener_with_callback("keydown", handler.as_ref().unchecked_ref());
    }

    // Close the command palette on browser back/forward navigation.
    let nav_state = state.clone();
    let popstate_handler: Closure<dyn FnMut()> = Closure::wrap(Box::new(move || {
        let mut st = nav_state.clone();
        let mut ui = st.ui.write();
        if ui.command_palette_open {
            ui.command_palette_open = false;
        }
    }) as Box<dyn FnMut()>);
    if let Some(win) = web_sys::window() {
        let _ = win.add_event_listener_with_callback(
            "popstate",
            popstate_handler.as_ref().unchecked_ref(),
        );
    }
    std::mem::forget(popstate_handler);

    // Keep the closure backing the listener alive for the lifetime of the page.
    std::mem::forget(handler);
}

/// Global keyboard shortcuts (document-level on web and desktop webview).
#[component]
pub fn GlobalKeyboardHandler() -> Element {
    let state = use_app_state();

    #[cfg(any(target_arch = "wasm32", feature = "desktop"))]
    {
        let state_for_effect = state.clone();
        use_effect(move || {
            install_document_keydown(state_for_effect.clone());
        });
    }

    rsx! {
        div { class: "contents" }
    }
}
