use crate::shell::export::download_text;
use crate::shell::ui::{Button, ButtonSize, ButtonVariant, IconClose, Modal, Overlay, Toggle, TabGroup, TabVariant};
use crate::state::{use_app_state, ProfileBackup, ToastKind};
use dioxus::prelude::*;

#[component]
pub fn PreferencesModal() -> Element {
    let mut state = use_app_state();
    let platform = use_context::<zerodock_platform::PlatformServices>();

    if !state.ui.read().preferences_open {
        return VNode::empty();
    }

    let sound_enabled = state.preferences.read().sound_enabled;

    let state_for_export = state.clone();
    let export_json = use_memo(move || {
        let backup = ProfileBackup {
            version: "1.0".to_string(),
            timestamp: chrono::Utc::now().to_rfc3339(),
            preferences: state_for_export.preferences.read().clone(),
            tool_states: state_for_export.tool_states.read().clone(),
        };
        serde_json::to_string_pretty(&backup).unwrap_or_default()
    });

    rsx! {
        Overlay {
            on_close: {
                let mut state = state.clone();
                move |_| state.ui.write().preferences_open = false
            },
            z: "--zd-z-modal",
            on_keydown: {
                let mut state = state.clone();
                Some(EventHandler::new(move |e: Event<KeyboardData>| {
                    if e.key() == Key::Escape {
                        state.ui.write().preferences_open = false;
                    }
                }))
            },
            Modal {
                max_width: "max-w-md",
                max_height: "max-h-[90vh]",
                aria_label: Some("Preferences".to_string()),

                // Header
                div {
                    class: "flex items-center justify-between px-5 py-4 border-b border-[var(--zd-border)]",
                    div {
                        h2 {
                            class: "text-base font-semibold text-[var(--zd-text-primary)]",
                            style: "letter-spacing: -0.01em;",
                            "Preferences"
                        }
                        p { class: "text-xs text-[var(--zd-text-muted)] mt-0.5", "Appearance, audio & data" }
                    }
                    button {
                        class: "inline-flex items-center justify-center w-7 h-7 rounded-md text-[var(--zd-text-muted)] hover:text-[var(--zd-text-primary)] hover:bg-[var(--zd-surface-raised)] transition-colors focus-ring",
                        aria_label: "Close preferences",
                        onclick: {
                            let mut state = state.clone();
                            move |_| state.ui.write().preferences_open = false
                        },
                        IconClose {}
                    }
                }

                // Body
                div {
                    class: "flex-1 overflow-y-auto custom-scrollbar px-5 py-5 space-y-6",

                    // Appearance
                    PrefsSection {
                        label: "Appearance",
                        div {
                            class: "flex flex-col sm:flex-row sm:items-center justify-between gap-3",
                            div {
                                p { class: "text-sm font-medium text-[var(--zd-text-primary)]", "Theme" }
                                p { class: "text-xs text-[var(--zd-text-muted)] mt-0.5", "Dark or light color scheme" }
                            }
                            TabGroup {
                                tabs: vec![
                                    ("light", "Light"),
                                    ("dark", "Dark"),
                                ],
                                active: state.preferences.read().theme.clone(),
                                variant: TabVariant::Segmented,
                                on_change: {
                                    let mut state = state.clone();
                                    let platform = platform.clone();
                                    move |new_theme: String| {
                                        {
                                            let mut prefs = state.preferences.write();
                                            prefs.theme = new_theme;
                                            prefs.theme_user_set = true;
                                        }
                                        let prefs = state.preferences.read().clone();
                                        let platform = platform.clone();
                                        spawn(async move {
                                            crate::persistence::save_preferences(&platform, &prefs).await;
                                        });
                                    }
                                },
                            }
                        }
                    }

                    // Audio
                    PrefsSection {
                        label: "Audio",
                        div {
                            class: "flex items-center justify-between",
                            div {
                                p { class: "text-sm font-medium text-[var(--zd-text-primary)]", "Sound Effects" }
                                p { class: "text-xs text-[var(--zd-text-muted)] mt-0.5", "Subtle audio cues on actions" }
                            }
                            Toggle {
                                checked: sound_enabled,
                                aria_label: Some(if sound_enabled { "Disable sound".to_string() } else { "Enable sound".to_string() }),
                                on_change: {
                                    let mut state = state.clone();
                                    let platform = platform.clone();
                                    move |_| {
                                        let mut prefs = state.preferences.write();
                                        prefs.sound_enabled = !prefs.sound_enabled;
                                        let prefs_clone = prefs.clone();
                                        let platform = platform.clone();
                                        spawn(async move {
                                            crate::persistence::save_preferences(&platform, &prefs_clone).await;
                                        });
                                    }
                                },
                            }
                        }
                    }

                    // Data backup
                    PrefsSection {
                        label: "Data",
                        div { class: "space-y-3",
                            p {
                                class: "text-xs text-[var(--zd-text-muted)] leading-relaxed",
                                "Export your entire workspace — theme, favorites, history, and tool states — to a portable "
                                code { class: "font-mono", ".zerodock" }
                                " file."
                            }
                            div { class: "flex flex-wrap gap-2",
                                // Export
                                Button {
                                    variant: ButtonVariant::Primary,
                                    size: ButtonSize::Small,
                                    aria_label: Some("Export backup".to_string()),
                                    onclick: {
                                        let mut state = state.clone();
                                        let export_json = export_json.clone();
                                        move |_| {
                                            match download_text("zerodock_profile.zerodock", export_json.read().as_str(), "application/json") {
                                                Ok(_)  => state.toast("Profile exported", ToastKind::Success),
                                                Err(e) => state.toast(format!("Export failed: {e}"), ToastKind::Error),
                                            }
                                        }
                                    },
                                    IconDownload {}
                                    "Export backup"
                                }
                                // Import
                                label {
                                    class: "inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-[var(--zd-border)] bg-[var(--zd-surface-raised)] text-xs font-semibold text-[var(--zd-text-primary)] hover:border-[var(--zd-border-hover)] transition-colors cursor-pointer focus-ring",
                                    tabindex: "0",
                                    IconUpload {}
                                    "Restore backup"
                                    input {
                                        r#type: "file",
                                        accept: ".zerodock,.json,application/json",
                                        class: "sr-only",
                                        onchange: {
                                            let state = state.clone();
                                            let platform = platform.clone();
                                            move |evt: Event<FormData>| {
                                                if let Some(file) = evt.files().first() {
                                                    let mut state = state.clone();
                                                    let platform = platform.clone();
                                                    let file_data = file.clone();
                                                    spawn(async move {
                                                        if let Ok(contents) = file_data.read_string().await {
                                                            if let Ok(backup) = serde_json::from_str::<ProfileBackup>(&contents) {
                                                                *state.preferences.write() = backup.preferences.clone();
                                                                *state.tool_states.write() = backup.tool_states.clone();
                                                                crate::persistence::save_preferences(&platform, &backup.preferences).await;
                                                                state.toast("Profile restored", ToastKind::Success);
                                                                state.ui.write().preferences_open = false;
                                                            } else {
                                                                state.toast("Invalid archive format", ToastKind::Error);
                                                            }
                                                        } else {
                                                            state.toast("Failed to read file", ToastKind::Error);
                                                        }
                                                    });
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                // Footer
                div {
                    class: "flex items-center justify-between px-5 py-3 border-t border-[var(--zd-border)] bg-[var(--zd-surface-raised)]",
                    p { class: "text-xs font-mono text-[var(--zd-text-muted)]", "ZeroDock v0.1.0" }
                    Button {
                        variant: ButtonVariant::Ghost,
                        class: "text-xs text-[var(--zd-error)] hover:bg-[var(--zd-error-soft)] px-3 py-1",
                        onclick: {
                            let mut state = state.clone();
                            let platform = platform.clone();
                            move |_| {
                                {
                                    let mut prefs = state.preferences.write();
                                    prefs.recent_tools.clear();
                                    prefs.favorite_tools.clear();
                                    let prefs_clone = prefs.clone();
                                    let platform = platform.clone();
                                    spawn(async move {
                                        crate::persistence::save_preferences(&platform, &prefs_clone).await;
                                    });
                                }
                                state.toast("History cleared", ToastKind::Info);
                            }
                        },
                        "Clear history"
                    }
                }
            }
        }
    }
}

#[component]
fn PrefsSection(label: &'static str, children: Element) -> Element {
    rsx! {
        div { class: "space-y-3",
            p { class: "zd-mono-label text-[var(--zd-primary)]", "{label}" }
            div {
                class: "p-4 rounded-lg border border-[var(--zd-border)] bg-[var(--zd-surface-raised)]",
                {children}
            }
        }
    }
}

#[component]
fn IconDownload() -> Element {
    rsx! {
        svg {
            width: "13", height: "13",
            fill: "none", stroke: "currentColor",
            stroke_width: "2", stroke_linecap: "round", stroke_linejoin: "round",
            view_box: "0 0 24 24",
            path { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" }
        }
    }
}

#[component]
fn IconUpload() -> Element {
    rsx! {
        svg {
            width: "13", height: "13",
            fill: "none", stroke: "currentColor",
            stroke_width: "2", stroke_linecap: "round", stroke_linejoin: "round",
            view_box: "0 0 24 24",
            path { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" }
        }
    }
}
