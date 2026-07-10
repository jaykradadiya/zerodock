use crate::shell::export::ExportButton;
use crate::shell::layout::{CodePanel, StandaloneTool, ToolBody, ToolToolbar};
use crate::shell::pipeline::{use_pipeline_input, SendToButton};
use crate::shell::ui::{Badge, BadgeVariant, Button, OutputPanel, Select, TabGroup, TabVariant};
use crate::state::{use_app_state, use_primary_action, ToastKind};
use dioxus::prelude::*;
use zerodock_platform::{HttpRequest, PlatformServices};

#[component]
pub fn ApiTester() -> Element {
    let platform = use_context::<PlatformServices>();
    let cors = platform.http.cors_restricted();
    rsx! {
        StandaloneTool {
            title: "API Tester",
            description: if cors {
                "Test HTTP APIs (browser CORS applies — use desktop for unrestricted access)".to_string()
            } else {
                "Test HTTP APIs with native reqwest — no CORS restrictions".to_string()
            },
            ApiTesterContent {}
        }
    }
}

#[component]
pub fn ApiTesterContent() -> Element {
    let platform = use_context::<PlatformServices>();
    let state = use_app_state();
    let cors = platform.http.cors_restricted();

    let mut method = use_signal(|| "GET".to_string());
    let mut url = use_signal(|| "https://httpbin.org/get".to_string());
    let mut body = use_signal(String::new);
    let mut headers_raw = use_signal(|| "Content-Type: application/json".to_string());
    let mut response = use_signal(|| None::<zerodock_platform::HttpResponse>);
    let mut loading = use_signal(|| false);
    let mut send_tick = use_signal(|| 0u64);
    let mut response_tab = use_signal(|| "body".to_string());

    use_pipeline_input("api-tester", body);

    use_effect(move || {
        let tick = *send_tick.read();
        if tick == 0 {
            return;
        }
        loading.set(true);
        let platform = platform.clone();
        let method = method.read().clone();
        let url = url.read().clone();
        let body_val = body.read().clone();
        let headers_raw = headers_raw.read().clone();
        let mut state = state.clone();
        spawn(async move {
            let headers: Vec<(String, String)> = headers_raw
                .lines()
                .filter_map(|line| {
                    let line = line.trim();
                    if line.is_empty() {
                        return None;
                    }
                    let (k, v) = line.split_once(':')?;
                    Some((k.trim().to_string(), v.trim().to_string()))
                })
                .collect();
            let req = HttpRequest {
                method,
                url,
                headers,
                body: if body_val.is_empty() { None } else { Some(body_val) },
            };
            match platform.http.send(req).await {
                Ok(resp) => {
                    response.set(Some(resp));
                }
                Err(e) => state.toast(e.to_string(), ToastKind::Error),
            }
            loading.set(false);
        });
    });

    use_primary_action(move || {
        let current = *send_tick.read();
        send_tick.set(current + 1);
    });

    let show_body = !matches!(method.read().as_str(), "GET" | "HEAD");
    let resp = response.read().clone();
    let resp_body = resp.as_ref().map(|r| r.body.clone()).unwrap_or_default();
    let resp_headers = resp
        .as_ref()
        .map(|r| {
            r.headers
                .iter()
                .map(|(k, v)| format!("{k}: {v}"))
                .collect::<Vec<_>>()
                .join("\n")
        })
        .unwrap_or_default();
    let resp_timing = resp
        .as_ref()
        .map(|r| format!("Status: {}\nDuration: {}ms", r.status, r.duration_ms))
        .unwrap_or_default();

    rsx! {
        ToolBody {
            if cors {
                div {
                    class: "mx-3 mt-3 px-4 py-3 rounded-xl border border-[var(--zd-accent)]/30 bg-[var(--zd-accent-soft)] text-sm text-[var(--zd-text-secondary)] shrink-0",
                    Badge { variant: BadgeVariant::Accent, "CORS" }
                    span { class: "ml-2", "Browser restrictions apply — use the desktop app for unrestricted API testing." }
                }
            }
            ToolToolbar {
                Select {
                    value: method.read().clone(),
                    onchange: EventHandler::new(move |e: Event<FormData>| method.set(e.value())),
                    options: vec![
                        ("GET", "GET"),
                        ("POST", "POST"),
                        ("PUT", "PUT"),
                        ("PATCH", "PATCH"),
                        ("DELETE", "DELETE"),
                        ("HEAD", "HEAD"),
                    ],
                }
                input {
                    class: "flex-1 min-w-0 px-3 py-1.5 rounded-lg border border-[var(--zd-border)] bg-[var(--zd-surface)] text-sm font-mono text-[var(--zd-text-primary)] focus-ring",
                    value: "{url}",
                    placeholder: "https://api.example.com",
                    oninput: move |e: Event<FormData>| url.set(e.value()),
                }
                Button {
                    disabled: *loading.read(),
                    onclick: move |_| {
                        let current = *send_tick.read();
                        send_tick.set(current + 1);
                    },
                    if *loading.read() { "Sending…" } else { "Send" }
                }
            }
            div {
                class: "grid grid-cols-1 lg:grid-cols-2 zd-tool-fill min-h-0 flex-1",
                div {
                    class: "flex flex-col min-h-0 border-b lg:border-b-0 lg:border-r border-[var(--zd-border)]",
                    CodePanel {
                        title: "Request Headers".to_string(),
                        value: headers_raw.read().clone(),
                        oninput: Some(EventHandler::new(move |e: Event<FormData>| headers_raw.set(e.value()))),
                        on_edit: Some(EventHandler::new(move |v: String| headers_raw.set(v))),
                        placeholder: "Header: value",
                        language: crate::shell::code_editor::CodeLanguage::Plain,
                        aria_label: "Request headers editor",
                    }
                    if show_body {
                        CodePanel {
                            title: "Request Body".to_string(),
                            value: body.read().clone(),
                            oninput: Some(EventHandler::new(move |e: Event<FormData>| body.set(e.value()))),
                            on_edit: Some(EventHandler::new(move |v: String| body.set(v))),
                            placeholder: "JSON body (optional)...",
                            language: crate::shell::code_editor::CodeLanguage::Json,
                            header_actions: rsx! {
                                SendToButton { source_tool_id: "api-tester", content: body.read().clone() }
                            },
                        }
                    }
                }
                div {
                    class: "flex flex-col min-h-0",
                    TabGroup {
                        tabs: vec![("body", "Body"), ("headers", "Headers"), ("timing", "Timing")],
                        active: response_tab.read().clone(),
                        on_change: EventHandler::new(move |t| response_tab.set(t)),
                        variant: TabVariant::Hub,
                    }
                    match response_tab.read().as_str() {
                        "headers" => rsx! {
                            OutputPanel {
                                title: "Response Headers".to_string(),
                                value: resp_headers.clone(),
                                header_extra: rsx! {
                                    ExportButton {
                                        filename: "response-headers.txt",
                                        content: resp_headers.clone(),
                                        label: "Download",
                                    }
                                },
                            }
                        },
                        "timing" => rsx! {
                            OutputPanel {
                                title: "Timing".to_string(),
                                value: resp_timing,
                            }
                        },
                        _ => rsx! {
                            CodePanel {
                                title: "Response Body".to_string(),
                                value: resp_body.clone(),
                                oninput: None,
                                read_only: true,
                                language: crate::shell::code_editor::CodeLanguage::Json,
                                header_actions: rsx! {
                                    ExportButton {
                                        filename: "response.json",
                                        content: resp_body.clone(),
                                        label: "Download",
                                    }
                                    SendToButton { source_tool_id: "api-tester", content: resp_body.clone() }
                                },
                            }
                        },
                    }
                }
            }
        }
    }
}
