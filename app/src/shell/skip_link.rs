use dioxus::prelude::*;

#[component]
pub fn SkipLink() -> Element {
    rsx! {
        a {
            href: "#main-content",
            class: "sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[calc(var(--zd-z-modal)+1)] focus:px-4 focus:py-2 focus:rounded-md focus:bg-[var(--zd-primary)] focus:text-[var(--zd-primary-fg)] focus:text-sm focus:font-medium focus-ring",
            "Skip to content"
        }
    }
}
