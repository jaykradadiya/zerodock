use dioxus::prelude::*;

#[component]
pub fn EmptyState(
    icon: &'static str,
    title: &'static str,
    hint: &'static str,
) -> Element {
    rsx! {
        div {
            class: "flex flex-col items-start justify-center gap-2 p-8 min-h-[200px]",
            span {
                class: "zd-icon-ring w-9 h-9 flex items-center justify-center text-sm font-mono mb-1",
                "{icon}"
            }
            p {
                class: "text-sm font-semibold text-[var(--zd-text-primary)]",
                "{title}"
            }
            p {
                class: "text-xs text-[var(--zd-text-muted)] max-w-sm leading-relaxed",
                "{hint}"
            }
        }
    }
}
