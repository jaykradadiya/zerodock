use crate::shell::ui::Button;
use dioxus::prelude::*;

#[component]
pub fn ToolStandardActions(
    on_clear: EventHandler<()>,
    on_sample: EventHandler<()>,
    #[props(default)] on_reset: Option<EventHandler<()>>,
    #[props(default)] extra: Option<Element>,
) -> Element {
    rsx! {
        div {
            class: "flex items-center gap-1 shrink-0",
            Button {
                variant: crate::shell::ui::ButtonVariant::Ghost,
                class: "px-2 py-1 text-xs",
                onclick: move |_| on_clear.call(()),
                "Clear"
            }
            Button {
                variant: crate::shell::ui::ButtonVariant::Ghost,
                class: "px-2 py-1 text-xs",
                onclick: move |_| on_sample.call(()),
                "Sample"
            }
            if let Some(on_reset) = on_reset {
                Button {
                    variant: crate::shell::ui::ButtonVariant::Ghost,
                    class: "px-2 py-1 text-xs",
                    onclick: move |_| on_reset.call(()),
                    "Reset"
                }
            }
            if let Some(extra) = extra {
                {extra}
            }
        }
    }
}
