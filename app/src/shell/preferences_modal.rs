use crate::shell::export::download_text;
use crate::shell::ui::{Button, ButtonVariant};
use crate::state::{use_app_state, ProfileBackup, ToastKind};
use dioxus::prelude::*;

#[component]
pub fn PreferencesModal() -> Element {
    let mut state = use_app_state();
    let platform = use_context::<zerodock_platform::PlatformServices>();

    if !state.ui.read().preferences_open {
        return VNode::empty();
    }

    let is_dark = state.preferences.read().is_dark();
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
        div {
            class: "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in",
            onclick: {
                let mut state = state.clone();
                move |_| state.ui.write().preferences_open = false
            },
            onkeydown: {
                let mut state = state.clone();
                move |e: Event<KeyboardData>| {
                    if e.key() == Key::Escape {
                        state.ui.write().preferences_open = false;
                    }
                }
            },
            div {
                class: "w-full max-w-lg rounded-xl border border-[var(--zd-border)] bg-[var(--zd-surface)] p-6 shadow-2xl flex flex-col gap-6 text-[var(--zd-text-primary)] max-h-[90vh] overflow-y-auto custom-scrollbar focus-ring",
                role: "dialog",
                aria_modal: "true",
                tabindex: "-1",
                onclick: move |e| e.stop_propagation(),
                
                div {
                    class: "flex items-center justify-between pb-4 border-b border-[var(--zd-border)]",
                    div {
                        h2 { class: "font-display text-xl font-bold tracking-tight", "Preferences & Profile" }
                        p { class: "text-xs text-[var(--zd-text-secondary)] mt-0.5", "Manage app appearance, sound, and local data backup" }
                    }
                    button {
                        class: "p-1.5 rounded-lg text-[var(--zd-text-muted)] hover:text-[var(--zd-text-primary)] hover:bg-[var(--zd-surface-hover)] transition-colors focus-ring",
                        onclick: {
                            let mut state = state.clone();
                            move |_| state.ui.write().preferences_open = false
                        },
                        "✕"
                    }
                }

                div {
                    class: "space-y-4",
                    h3 { class: "zd-mono-label text-[var(--zd-primary)]", "Appearance" }
                    div {
                        class: "flex items-center justify-between p-3 rounded-lg bg-[var(--zd-surface-raised)] border border-[var(--zd-border)]",
                        div {
                            p { class: "text-sm font-medium", "Theme" }
                            p { class: "text-xs text-[var(--zd-text-muted)]", "Toggle between dark and light color scheme" }
                        }
                        Button {
                            variant: ButtonVariant::Secondary,
                            class: "px-3 py-1 text-xs font-mono",
                            onclick: {
                                let mut state = state.clone();
                                let platform = platform.clone();
                                move |_| {
                                    state.toggle_theme();
                                    let prefs = state.preferences.read().clone();
                                    let platform = platform.clone();
                                    spawn(async move {
                                        crate::persistence::save_preferences(&platform, &prefs).await;
                                    });
                                }
                            },
                            if is_dark { "Dark Mode 🌙" } else { "Light Mode ☀️" }
                        }
                    }
                }

                div {
                    class: "space-y-4",
                    h3 { class: "zd-mono-label text-[var(--zd-primary)]", "Audio" }
                    div {
                        class: "flex items-center justify-between p-3 rounded-lg bg-[var(--zd-surface-raised)] border border-[var(--zd-border)]",
                        div {
                            p { class: "text-sm font-medium", "Sound Effects" }
                            p { class: "text-xs text-[var(--zd-text-muted)]", "Play subtle audio cues on task completion and copy" }
                        }
                        Button {
                            variant: if sound_enabled { ButtonVariant::Primary } else { ButtonVariant::Ghost },
                            class: "px-3 py-1 text-xs font-mono",
                            onclick: {
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
                            if sound_enabled { "Enabled" } else { "Disabled" }
                        }
                    }
                }

                div {
                    class: "space-y-4",
                    h3 { class: "zd-mono-label text-[var(--zd-primary)]", "Profile Backup & Restore" }
                    div {
                        class: "p-4 rounded-lg bg-[var(--zd-surface-raised)] border border-[var(--zd-border)] space-y-3",
                        p { class: "text-xs text-[var(--zd-text-secondary)] leading-relaxed",
                            "Export your entire ZeroDock workspace — including theme preferences, favorite tools, recent history, and all saved tool working states — to a portable `.zerodock` archive file."
                        }
                        div {
                            class: "flex flex-wrap items-center gap-2 pt-1",
                            button {
                                class: "toolbar-btn inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded bg-[var(--zd-primary)] text-white hover:opacity-90 transition-opacity",
                                onclick: {
                                    let mut state = state.clone();
                                    let export_json = export_json.clone();
                                    move |_| {
                                        match download_text("zerodock_profile.zerodock", export_json.read().as_str(), "application/json") {
                                            Ok(_) => state.toast("Profile exported as zerodock_profile.zerodock", ToastKind::Success),
                                            Err(e) => state.toast(format!("Export failed: {e}"), ToastKind::Error),
                                        }
                                    }
                                },
                                "⬇ Export Backup (.zerodock)"
                            }
                            label {
                                class: "toolbar-btn cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded bg-[var(--zd-surface)] border border-[var(--zd-border)] hover:border-[var(--zd-border-hover)] transition-colors",
                                "⬆ Restore Backup (.zerodock)"
                                input {
                                    r#type: "file",
                                    accept: ".zerodock,.json,application/json",
                                    class: "hidden",
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
                                                            state.toast("Profile restored successfully from .zerodock archive!", ToastKind::Success);
                                                            state.ui.write().preferences_open = false;
                                                        } else {
                                                            state.toast("Invalid .zerodock archive format", ToastKind::Error);
                                                        }
                                                    } else {
                                                        state.toast("Failed to read backup archive", ToastKind::Error);
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

                div {
                    class: "flex items-center justify-between pt-4 border-t border-[var(--zd-border)]",
                    p { class: "text-xs font-mono text-[var(--zd-text-muted)]", "ZeroDock v0.1.0 (Local-first RSX)" }
                    Button {
                        variant: ButtonVariant::Ghost,
                        class: "px-4 py-1.5 text-xs text-[var(--zd-error)] hover:bg-red-500/10",
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
                                state.toast("Recent & favorite history cleared", ToastKind::Info);
                            }
                        },
                        "Clear History"
                    }
                }
            }
        }
    }
}
