use dioxus::prelude::*;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::atomic::{AtomicU64, Ordering};

static TOAST_ID: AtomicU64 = AtomicU64::new(1);
static PRIMARY_TICK: AtomicU64 = AtomicU64::new(0);

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct Preferences {
    pub theme: String,
    pub sound_enabled: bool,
    pub recent_tools: Vec<String>,
    pub favorite_tools: Vec<String>,
    #[serde(default)]
    pub theme_user_set: bool,
}

impl Preferences {
    #[allow(dead_code)]
    pub fn is_dark(&self) -> bool {
        self.theme == "dark"
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProfileBackup {
    pub version: String,
    pub timestamp: String,
    pub preferences: Preferences,
    pub tool_states: HashMap<String, String>,
}

#[derive(Debug, Clone, Default)]
pub struct UiState {
    pub command_palette_open: bool,
    pub preferences_open: bool,
    pub zen_mode: bool,
    #[allow(dead_code)]
    pub sidebar_collapsed: bool,
    pub shortcuts_help_open: bool,
    pub toasts: Vec<Toast>,
    pub primary_action_tick: u64,
    pub primary_action_registered: bool,
    pub new_tab_tick: u64,
    pub new_tab_registered: bool,
}

#[derive(Debug, Clone)]
pub struct Toast {
    pub id: u64,
    pub message: String,
    pub kind: ToastKind,
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum ToastKind {
    Info,
    Success,
    Error,
}

#[derive(Clone)]
pub struct AppState {
    pub preferences: Signal<Preferences>,
    pub ui: Signal<UiState>,
    pub tool_states: Signal<HashMap<String, String>>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            preferences: Signal::new(Preferences {
                theme: "dark".into(),
                sound_enabled: true,
                recent_tools: vec![],
                favorite_tools: vec![],
                theme_user_set: false,
            }),
            ui: Signal::new(UiState::default()),
            tool_states: Signal::new(HashMap::new()),
        }
    }

    pub fn is_dark(&self) -> bool {
        self.preferences.read().theme == "dark"
    }

    #[allow(dead_code)]
    pub fn toggle_theme(&mut self) {
        let is_dark = self.is_dark();
        let mut prefs = self.preferences.write();
        prefs.theme = if is_dark {
            "light".into()
        } else {
            "dark".into()
        };
        prefs.theme_user_set = true;
    }

    pub fn toast(&mut self, message: impl Into<String>, kind: ToastKind) {
        let id = TOAST_ID.fetch_add(1, Ordering::Relaxed);
        let mut ui = self.ui.write();
        ui.toasts.push(Toast {
            id,
            message: message.into(),
            kind,
        });
        const MAX_TOASTS: usize = 3;
        if ui.toasts.len() > MAX_TOASTS {
            let overflow = ui.toasts.len() - MAX_TOASTS;
            ui.toasts.drain(0..overflow);
        }
    }

    pub fn dismiss_toast(&mut self, id: u64) {
        self.ui.write().toasts.retain(|t| t.id != id);
    }

    pub fn trigger_primary_action(&mut self) {
        if self.ui.read().primary_action_registered {
            let tick = PRIMARY_TICK.fetch_add(1, Ordering::Relaxed);
            self.ui.write().primary_action_tick = tick;
        }
    }

    pub fn set_primary_action_registered(&mut self, registered: bool) {
        self.ui.write().primary_action_registered = registered;
    }

    pub fn trigger_new_tab_action(&mut self) {
        if self.ui.read().new_tab_registered {
            let tick = PRIMARY_TICK.fetch_add(1, Ordering::Relaxed);
            self.ui.write().new_tab_tick = tick;
        }
    }

    pub fn set_new_tab_registered(&mut self, registered: bool) {
        self.ui.write().new_tab_registered = registered;
    }

    pub fn record_tool_visit(&mut self, tool_id: &str) {
        let mut prefs = self.preferences.write();
        prefs.recent_tools.retain(|id| id != tool_id);
        prefs.recent_tools.insert(0, tool_id.to_string());
        prefs.recent_tools.truncate(8);
    }

    #[allow(dead_code)]
    pub fn toggle_favorite(&mut self, tool_id: &str) {
        let mut prefs = self.preferences.write();
        if let Some(pos) = prefs.favorite_tools.iter().position(|id| id == tool_id) {
            prefs.favorite_tools.remove(pos);
        } else {
            prefs.favorite_tools.push(tool_id.to_string());
        }
    }

    #[allow(dead_code)]
    pub fn is_favorite(&self, tool_id: &str) -> bool {
        self.preferences
            .read()
            .favorite_tools
            .iter()
            .any(|id| id == tool_id)
    }

    #[allow(dead_code)]
    pub fn save_tool_state(&mut self, tool_id: &str, state_json: &str) {
        self.tool_states
            .write()
            .insert(tool_id.to_string(), state_json.to_string());
    }

    #[allow(dead_code)]
    pub fn load_tool_state(&self, tool_id: &str) -> Option<String> {
        self.tool_states.read().get(tool_id).cloned()
    }


}

pub fn use_app_state() -> AppState {
    use_context::<AppState>()
}

/// Invoke `handler` when the user presses Cmd/Ctrl+Enter (primary action shortcut).
pub fn use_primary_action(mut handler: impl FnMut() + 'static) {
    let state = use_app_state();
    let mut register_state = state.clone();
    let mut cleanup_state = state.clone();
    let mut last_tick = use_signal(|| 0u64);

    use_effect(move || {
        register_state.set_primary_action_registered(true);
    });

    use_drop(move || {
        cleanup_state.set_primary_action_registered(false);
    });

    use_effect(move || {
        let tick = state.ui.read().primary_action_tick;
        if tick > *last_tick.read() {
            last_tick.set(tick);
            handler();
        }
    });
}

/// Invoke `handler` when the user presses Ctrl+M / Cmd+M (new tab action shortcut).
pub fn use_new_tab_action(mut handler: impl FnMut() + 'static) {
    let state = use_app_state();
    let mut register_state = state.clone();
    let mut cleanup_state = state.clone();
    let mut last_tick = use_signal(|| 0u64);

    use_effect(move || {
        register_state.set_new_tab_registered(true);
    });

    use_drop(move || {
        cleanup_state.set_new_tab_registered(false);
    });

    use_effect(move || {
        let tick = state.ui.read().new_tab_tick;
        if tick > *last_tick.read() {
            last_tick.set(tick);
            handler();
        }
    });
}
