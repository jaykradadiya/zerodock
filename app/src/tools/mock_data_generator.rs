use crate::shell::export::ExportButton;
use crate::shell::layout::{CodePanel, StandaloneTool, ToolBody, ToolToolbar};

use crate::shell::ui::{Button, Select};
use crate::state::{use_app_state, use_primary_action, ToastKind};
use dioxus::prelude::*;
use zerodock_core::{default_fields, generate_mock_rows, MockField, MockFieldType};

#[component]
pub fn MockDataGenerator() -> Element {
    rsx! {
        StandaloneTool {
            title: "Mock Data Generator",
            description: "Generate realistic mock JSON using the fake crate",
            MockDataGeneratorContent {}
        }
    }
}

#[component]
pub fn MockDataGeneratorContent() -> Element {
    let mut row_count = use_signal(|| 10usize);
    let mut output = use_signal(String::new);
    let mut fields = use_signal(default_fields);
    let mut state = use_app_state();
    let mut toast_state = state.clone();

    use_primary_action(move || {
        match generate_mock_rows(&fields.read(), *row_count.read()) {
            Ok(json) => output.set(json),
            Err(e) => toast_state.toast(e.to_string(), ToastKind::Error),
        }
    });

    let field_type_options = [
        ("name", "Name"),
        ("email", "Email"),
        ("id", "Id"),
        ("number", "Number"),
        ("boolean", "Boolean"),
        ("date", "Date"),
        ("url", "Url"),
        ("text", "Text"),
    ];

    rsx! {
        ToolBody {
            ToolToolbar {
                span { class: "text-sm text-[var(--zd-text-secondary)] zd-mono-label", "Rows" }
                input {
                    r#type: "number",
                    class: "w-20 px-2 py-1.5 rounded-lg border border-[var(--zd-border)] bg-[var(--zd-surface)] text-sm focus-ring",
                    value: "{row_count}",
                    min: "1",
                    max: "5000",
                    oninput: move |e: Event<FormData>| {
                        if let Ok(n) = e.value().parse::<usize>() {
                            row_count.set(n.min(5000).max(1));
                        }
                    },
                }
                Button {
                    onclick: move |_| {
                        let next = fields.read().len() + 1;
                        fields.write().push(MockField {
                            name: format!("field_{next}"),
                            field_type: MockFieldType::Text,
                        });
                    },
                    "Add field"
                }
                Button {
                    onclick: move |_| {
                        match generate_mock_rows(&fields.read(), *row_count.read()) {
                            Ok(json) => output.set(json),
                            Err(e) => state.toast(e.to_string(), ToastKind::Error),
                        }
                    },
                    "Generate"
                }
            }
            div {
                class: "px-3 py-2 border-b border-[var(--zd-border)] bg-[var(--zd-surface)] space-y-2 shrink-0 max-h-40 overflow-y-auto custom-scrollbar",
                for (i, field) in fields.read().iter().enumerate() {
                    {
                        let type_str = mock_field_type_str(field.field_type);
                        rsx! {
                            div {
                                class: "flex flex-wrap items-center gap-2",
                                input {
                                    class: "flex-1 min-w-[120px] px-2 py-1 rounded-lg border border-[var(--zd-border)] bg-[var(--zd-surface-raised)] text-sm font-mono",
                                    value: "{field.name}",
                                    oninput: move |e: Event<FormData>| {
                                        fields.write()[i].name = e.value();
                                    },
                                }
                                Select {
                                    value: type_str.to_string(),
                                    onchange: EventHandler::new(move |e: Event<FormData>| {
                                        fields.write()[i].field_type = parse_field_type(&e.value());
                                    }),
                                    options: field_type_options.to_vec(),
                                }
                                button {
                                    class: "toolbar-btn text-[var(--zd-error)]",
                                    onclick: move |_| {
                                        fields.write().remove(i);
                                    },
                                    "Remove"
                                }
                            }
                        }
                    }
                }
            }
            CodePanel {
                title: "JSON Output".to_string(),
                value: output.read().clone(),
                oninput: None,
                read_only: true,
                placeholder: "Click Generate to create mock data...",
                show_empty: true,
                language: crate::shell::code_editor::CodeLanguage::Json,
                header_actions: rsx! {
                    ExportButton {
                        filename: "mock-data.json",
                        content: output.read().clone(),
                        label: "Download",
                    }
                },
            }
        }
    }
}

fn mock_field_type_str(t: MockFieldType) -> &'static str {
    match t {
        MockFieldType::Name => "name",
        MockFieldType::Email => "email",
        MockFieldType::Id => "id",
        MockFieldType::Number => "number",
        MockFieldType::Boolean => "boolean",
        MockFieldType::Date => "date",
        MockFieldType::Url => "url",
        MockFieldType::Text => "text",
    }
}

fn parse_field_type(s: &str) -> MockFieldType {
    match s {
        "name" => MockFieldType::Name,
        "email" => MockFieldType::Email,
        "id" => MockFieldType::Id,
        "number" => MockFieldType::Number,
        "boolean" => MockFieldType::Boolean,
        "date" => MockFieldType::Date,
        "url" => MockFieldType::Url,
        _ => MockFieldType::Text,
    }
}
