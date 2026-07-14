use crate::shell::ui::Button;
use dioxus::prelude::*;

#[derive(Clone)]
pub struct ToolHistory<T: Clone + PartialEq + 'static> {
    pub current: Signal<T>,
    pub undo_stack: Signal<Vec<T>>,
    pub redo_stack: Signal<Vec<T>>,
}

impl<T: Clone + PartialEq + 'static> ToolHistory<T> {
    pub fn new(initial: T) -> Self {
        Self {
            current: use_signal(|| initial),
            undo_stack: use_signal(|| Vec::new()),
            redo_stack: use_signal(|| Vec::new()),
        }
    }

    pub fn set(&mut self, new_val: T) {
        let old = self.current.read().clone();
        if old != new_val {
            self.undo_stack.write().push(old);
            self.redo_stack.write().clear();
            self.current.set(new_val);
        }
    }

    pub fn undo(&mut self) {
        if let Some(prev) = self.undo_stack.write().pop() {
            let curr = self.current.read().clone();
            self.redo_stack.write().push(curr);
            self.current.set(prev);
        }
    }

    pub fn redo(&mut self) {
        if let Some(next) = self.redo_stack.write().pop() {
            let curr = self.current.read().clone();
            self.undo_stack.write().push(curr);
            self.current.set(next);
        }
    }

    pub fn can_undo(&self) -> bool {
        !self.undo_stack.read().is_empty()
    }

    pub fn can_redo(&self) -> bool {
        !self.redo_stack.read().is_empty()
    }
}

#[component]
pub fn ToolStandardActions(
    on_clear: EventHandler<()>,
    on_sample: EventHandler<()>,
    #[props(default)] on_reset: Option<EventHandler<()>>,
    #[props(default)] on_undo: Option<EventHandler<()>>,
    #[props(default)] on_redo: Option<EventHandler<()>>,
    #[props(default)] can_undo: Option<bool>,
    #[props(default)] can_redo: Option<bool>,
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
            if let Some(on_undo) = on_undo {
                Button {
                    variant: crate::shell::ui::ButtonVariant::Ghost,
                    class: "px-2 py-1 text-xs font-mono",
                    shortcut: "⌘Z".to_string(),
                    disabled: !can_undo.unwrap_or(true),
                    onclick: move |_| on_undo.call(()),
                    "Undo"
                }
            }
            if let Some(on_redo) = on_redo {
                Button {
                    variant: crate::shell::ui::ButtonVariant::Ghost,
                    class: "px-2 py-1 text-xs font-mono",
                    shortcut: "⌘⇧Z".to_string(),
                    disabled: !can_redo.unwrap_or(true),
                    onclick: move |_| on_redo.call(()),
                    "Redo"
                }
            }
            if let Some(extra) = extra {
                {extra}
            }
        }
    }
}
