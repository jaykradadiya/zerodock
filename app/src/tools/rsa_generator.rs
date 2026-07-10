use crate::shell::empty_state::EmptyState;
use crate::shell::layout::{CodePanel, ResponsiveSplitPanels, StandaloneTool, ToolBody, ToolToolbar};
use crate::shell::ui::{Badge, BadgeVariant, Button, InlineAlert, TabGroup};
use crate::state::{use_primary_action, ToastKind, use_app_state};
use dioxus::prelude::*;
use zerodock_core::generate_rsa;

#[component]
pub fn RsaGenerator() -> Element {
    rsx! {
        StandaloneTool {
            title: "RSA Key Generator",
            description: "Generate RSA key pairs in PEM format",
            RsaGeneratorContent {}
        }
    }
}

#[component]
pub fn RsaGeneratorContent() -> Element {
    let mut bits = use_signal(|| 2048usize);
    let mut keys = use_signal(|| None::<zerodock_core::RsaKeyPair>);
    let mut loading = use_signal(|| false);
    let mut generate_tick = use_signal(|| 0u64);
    let state = use_app_state();

    use_effect(move || {
        let tick = *generate_tick.read();
        if tick == 0 {
            return;
        }
        loading.set(true);
        let bits_val = *bits.read();
        let mut state = state.clone();
        spawn(async move {
            match generate_rsa(bits_val) {
                Ok(k) => {
                    keys.set(Some(k));
                }
                Err(e) => state.toast(e.to_string(), ToastKind::Error),
            }
            loading.set(false);
        });
    });

    use_primary_action(move || {
        let current = *generate_tick.read();
        generate_tick.set(current + 1);
    });

    rsx! {
        ToolBody {
            ToolToolbar {
                TabGroup {
                    tabs: vec![("1024", "1024-bit"), ("2048", "2048-bit"), ("4096", "4096-bit")],
                    active: bits.read().to_string(),
                    on_change: EventHandler::new(move |b: String| {
                        if let Ok(n) = b.parse::<usize>() {
                            bits.set(n);
                        }
                    }),
                    variant: crate::shell::ui::TabVariant::Toolbar,
                }
                if *bits.read() == 1024 {
                    Badge { variant: BadgeVariant::Error, "Deprecated — use 2048+ for production" }
                }
                Button {
                    disabled: *loading.read(),
                    onclick: move |_| {
                        let current = *generate_tick.read();
                        generate_tick.set(current + 1);
                    },
                    if *loading.read() { "Generating…" } else { "Generate" }
                }
            }
            if *bits.read() == 1024 {
                div {
                    class: "px-3 shrink-0",
                    InlineAlert {
                        message: "1024-bit RSA is deprecated and insecure for production use.".to_string(),
                        variant: crate::shell::ui::AlertVariant::Warning,
                    }
                }
            }
            if let Some(k) = keys.read().as_ref() {
                ResponsiveSplitPanels {
                    input_label: "Private",
                    output_label: "Public",
                    input_panel: rsx! {
                        CodePanel {
                            title: "Private Key (PKCS#8)".to_string(),
                            value: k.private_pem.clone(),
                            oninput: None,
                            read_only: true,
                        }
                    },
                    output_panel: rsx! {
                        CodePanel {
                            title: "Public Key (SPKI)".to_string(),
                            value: k.public_pem.clone(),
                            oninput: None,
                            read_only: true,
                        }
                    },
                }
            } else if !*loading.read() {
                EmptyState {
                    icon: "RSA",
                    title: "No keys generated",
                    hint: "Select key size and click Generate to create a PEM key pair.",
                }
            } else {
                div {
                    class: "flex-1 flex items-center justify-center p-8",
                    p { class: "text-sm text-[var(--zd-text-muted)] zd-mono-label", "Generating keys…" }
                }
            }
        }
    }
}
