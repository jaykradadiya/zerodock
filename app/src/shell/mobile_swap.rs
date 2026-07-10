use dioxus::prelude::*;

#[derive(Clone, Copy, PartialEq, Default)]
pub enum MobilePanel {
    #[default]
    Input,
    Output,
}

#[component]
pub fn MobileSwapBar(
    active: MobilePanel,
    on_change: EventHandler<MobilePanel>,
    input_label: &'static str,
    output_label: &'static str,
) -> Element {
    rsx! {
        div {
            class: "md:hidden flex gap-1 p-2 border-b border-[var(--zd-border)] bg-[var(--zd-surface-raised)] shrink-0",
            role: "tablist",
            aria_label: "Panel selector",
            button {
                class: if active == MobilePanel::Input {
                    "flex-1 px-3 py-2 rounded-lg text-xs font-medium zd-mono-label text-[var(--zd-primary)] bg-[var(--zd-primary-soft)]"
                } else {
                    "flex-1 px-3 py-2 rounded-lg text-xs font-medium zd-mono-label text-[var(--zd-text-muted)]"
                },
                role: "tab",
                aria_selected: active == MobilePanel::Input,
                onclick: move |_| on_change.call(MobilePanel::Input),
                "{input_label}"
            }
            button {
                class: if active == MobilePanel::Output {
                    "flex-1 px-3 py-2 rounded-lg text-xs font-medium zd-mono-label text-[var(--zd-primary)] bg-[var(--zd-primary-soft)]"
                } else {
                    "flex-1 px-3 py-2 rounded-lg text-xs font-medium zd-mono-label text-[var(--zd-text-muted)]"
                },
                role: "tab",
                aria_selected: active == MobilePanel::Output,
                onclick: move |_| on_change.call(MobilePanel::Output),
                "{output_label}"
            }
        }
    }
}
