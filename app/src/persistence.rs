use crate::state::{AppState, Preferences};
use dioxus::prelude::*;
use zerodock_platform::{PlatformServices, PREFERENCES_KEY};

pub fn use_persistence(mut app_state: AppState, platform: PlatformServices) {
    let storage = platform.storage.clone();
    let mut loaded = use_signal(|| false);

    {
        let storage = storage.clone();
        let mut app_state = app_state.clone();
        use_effect(move || {
            let storage = storage.clone();
            let mut app_state = app_state.clone();
            spawn(async move {
                if let Ok(Some(json)) = storage.get(PREFERENCES_KEY).await {
                    if let Ok(prefs) = serde_json::from_str::<Preferences>(&json) {
                        *app_state.preferences.write() = prefs;
                    }
                } else {
                    apply_system_theme_if_unset(&mut app_state);
                }
                loaded.set(true);
            });
        });
    }

    {
        let storage = storage.clone();
        let app_state = app_state.clone();
        use_effect(move || {
            let prefs = (*app_state.preferences.read()).clone();
            if *loaded.read() && prefs.theme_user_set {
                let storage = storage.clone();
                spawn(async move {
                    if let Ok(json) = serde_json::to_string(&prefs) {
                        let _ = storage.set(PREFERENCES_KEY, &json).await;
                    }
                });
            }
        });
    }
}

fn apply_system_theme_if_unset(app_state: &mut AppState) {
    #[cfg(target_arch = "wasm32")]
    {
        if app_state.preferences.read().theme_user_set {
            return;
        }
        if let Some(window) = web_sys::window() {
            if let Ok(Some(media)) = window.match_media("(prefers-color-scheme: dark)") {
                let theme = if media.matches() { "dark" } else { "light" };
                app_state.preferences.write().theme = theme.to_string();
            }
        }
    }
}

pub async fn save_preferences(platform: &PlatformServices, prefs: &Preferences) {
    if let Ok(json) = serde_json::to_string(prefs) {
        let _ = platform.storage.set(PREFERENCES_KEY, &json).await;
    }
}
