use dioxus::prelude::*;

#[component]
pub fn DragDropZone(
    on_drop_text: EventHandler<String>,
    children: Element,
) -> Element {
    let mut dragging = use_signal(|| false);

    rsx! {
        div {
            class: if *dragging.read() {
                "relative flex flex-col flex-1 min-h-0 w-full ring-2 ring-[var(--zd-primary)] ring-offset-2 ring-offset-[var(--zd-bg)] rounded-lg"
            } else {
                "relative flex flex-col flex-1 min-h-0 w-full"
            },
            ondragover: move |e| {
                e.prevent_default();
                dragging.set(true);
            },
            ondragleave: move |_| dragging.set(false),
            ondrop: move |e| {
                e.prevent_default();
                dragging.set(false);
                #[cfg(target_arch = "wasm32")]
                {
                    let dt = e.data().data_transfer();
                    if let Some(text) = dt.get_data("text/plain") {
                        if !text.is_empty() {
                            on_drop_text.call(text);
                        }
                    }
                }
            },
            if *dragging.read() {
                div {
                    class: "absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-[var(--zd-primary-soft)]/80 backdrop-blur-sm pointer-events-none",
                    span { class: "zd-mono-label text-[var(--zd-primary)]", "Drop file or text" }
                }
            }
            {children}
        }
    }
}

// NOTE: True large-file drag-drop (bypassing a full-String materialization of
// the dropped file) is intentionally NOT wired here yet. Dioxus 0.7's
// `DragEvent::data().data_transfer()` returns Dioxus's own `DragData`
// wrapper, not a raw `web_sys::DataTransfer` — extracting a `web_sys::File`
// handle from it (to feed `file_load::web::load_rope_streaming`) requires
// confirming that wrapper's conversion API, which wasn't verified in this
// pass. `file_load::web::load_rope_streaming` is implemented, compiles, and
// is ready to be wired in once that's confirmed; today it has no caller in
// the drag-drop path. Follow-up: add an explicit "Open File" input/button
// (`<input type="file">` via web-sys, or Dioxus's file-upload event) as a
// more directly verifiable entry point than intercepting generic drag-drop.
