use dioxus::prelude::*;

#[component]
pub fn DragDropZone(
    on_drop_text: EventHandler<String>,
    /// Fired instead of `on_drop_text` when the drop is an actual file (not a
    /// plain-text drag) on web — lets callers route large files through the
    /// streaming loader (`file_load::web::load_rope_streaming`) instead of
    /// materializing the whole file as a String up front.
    #[props(default)]
    on_drop_file: Option<EventHandler<web_sys::File>>,
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
                    let files = dt.files();
                    if let Some(list) = files {
                        if list.length() > 0 {
                            if let Some(file) = list.get(0) {
                                if let Some(h) = on_drop_file.as_ref() {
                                    h.call(file);
                                    return;
                                }
                            }
                        }
                    }
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
