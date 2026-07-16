use crate::shell::export::ExportButton;
use crate::shell::layout::{CodePanel, StandaloneTool, ToolBody, ToolToolbar};

use crate::shell::ui::{Badge, BadgeVariant, Button, ButtonVariant, OutputPanel, Select, TabGroup, TabVariant};
use crate::state::{use_app_state, use_primary_action, ToastKind};
use dioxus::prelude::*;
use zerodock_core::{curl_to_code, parse_curl, CurlRequest, CurlTarget};
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
            ApiTesterContent { initial_tab: "api".to_string() }
        }
    }
}

#[derive(Clone, PartialEq)]
pub struct EnvProfile {
    pub name: String,
    pub vars: Vec<(String, String)>,
}

fn substitute_env_vars(text: &str, vars: &[(String, String)]) -> String {
    let mut out = text.to_string();
    for (key, val) in vars {
        let pattern = format!("{{{{{key}}}}}");
        out = out.replace(&pattern, val);
    }
    out
}

#[component]
pub fn ApiTesterContent(initial_tab: String) -> Element {
    let platform = use_context::<PlatformServices>();
    let mut state = use_app_state();
    let cors = platform.http.cors_restricted();

    let mut method = use_signal(|| "GET".to_string());
    let mut url = use_signal(|| "https://httpbin.org/get".to_string());
    let mut body = use_signal(String::new);
    let mut headers_raw = use_signal(|| "Content-Type: application/json".to_string());
    let mut response = use_signal(|| None::<zerodock_platform::HttpResponse>);
    let mut loading = use_signal(|| false);
    let mut send_tick = use_signal(|| 0u64);
    let mut response_tab = use_signal(|| "body".to_string());
    let initial_curl = use_hook(|| {
        let c = state.tool_states.read().get("api-tester").cloned();
        if c.is_some() {
            state.tool_states.write().remove("api-tester");
        }
        c
    });
    let initial_curl_cloned = initial_curl.clone();
    let initial_tab_cloned = initial_tab.clone();
    let mut import_curl_open = use_signal(move || {
        initial_curl_cloned.is_some() || initial_tab_cloned == "curl"
    });
    let initial_tab_for_sig = initial_tab.clone();
    let mut initial_tab_sig = use_signal(move || initial_tab_for_sig.clone());
    if *initial_tab_sig.read() != initial_tab {
        initial_tab_sig.set(initial_tab.clone());
        if initial_tab == "curl" {
            import_curl_open.set(true);
        } else {
            import_curl_open.set(false);
        }
    }
    let mut import_curl_text = use_signal(|| initial_curl.clone().unwrap_or_default());
    let mut code_target = use_signal(|| "javascript".to_string());

    let mut env_profiles = use_signal(|| vec![
        EnvProfile {
            name: "Staging".to_string(),
            vars: vec![
                ("BASE_URL".to_string(), "https://httpbin.org".to_string()),
                ("API_KEY".to_string(), "bearer_token_staging_abc123".to_string()),
            ],
        },
        EnvProfile {
            name: "Local Dev".to_string(),
            vars: vec![
                ("BASE_URL".to_string(), "http://localhost:8080".to_string()),
                ("API_KEY".to_string(), "dev_local_secret".to_string()),
            ],
        },
        EnvProfile {
            name: "Production".to_string(),
            vars: vec![
                ("BASE_URL".to_string(), "https://api.production.com".to_string()),
                ("API_KEY".to_string(), "live_secret_key_xyz".to_string()),
            ],
        },
    ]);
    let mut active_env_idx = use_signal(|| 0usize);
    let mut show_env_drawer = use_signal(|| false);
    let mut new_var_key = use_signal(String::new);
    let mut new_var_val = use_signal(String::new);
    let mut new_profile_name = use_signal(String::new);

    let state_for_effect = state.clone();
    use_effect(move || {
        let tick = *send_tick.read();
        if tick == 0 {
            return;
        }
        loading.set(true);
        let platform = platform.clone();
        let method = method.read().clone();
        let raw_url = url.read().clone();
        let raw_body = body.read().clone();
        let raw_headers = headers_raw.read().clone();
        let active_vars = env_profiles.read().get(*active_env_idx.read()).map(|p| p.vars.clone()).unwrap_or_default();
        let sub_url = substitute_env_vars(&raw_url, &active_vars);
        let sub_headers_raw = substitute_env_vars(&raw_headers, &active_vars);
        let sub_body = substitute_env_vars(&raw_body, &active_vars);
        let mut state = state_for_effect.clone();
        spawn(async move {
            let headers: Vec<(String, String)> = sub_headers_raw
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
                url: sub_url,
                headers,
                body: if sub_body.is_empty() { None } else { Some(sub_body) },
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
                button {
                    class: "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--zd-border)] bg-[var(--zd-surface-raised)] hover:border-[var(--zd-primary)] text-xs font-mono text-[var(--zd-text-primary)] transition-colors shrink-0",
                    onclick: move |_| {
                        let val = *show_env_drawer.read();
                        show_env_drawer.set(!val);
                    },
                    span { class: "text-[var(--zd-primary)] font-bold", "🌍 Env:" }
                    span { class: "font-semibold",
                        "{env_profiles.read().get(*active_env_idx.read()).map(|p| p.name.as_str()).unwrap_or(\"Default\")}"
                    }
                    span { class: "text-[10px] opacity-70 ml-0.5", "▾" }
                }
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
                    variant: ButtonVariant::Secondary,
                    onclick: move |_| {
                        let val = *import_curl_open.read();
                        import_curl_open.set(!val);
                    },
                    "Import cURL"
                }
                Button {
                    shortcut: "⌘↵".to_string(),
                    disabled: *loading.read(),
                    onclick: move |_| {
                        let current = *send_tick.read();
                        send_tick.set(current + 1);
                    },
                    if *loading.read() { "Sending…" } else { "Send" }
                }
            }
            if *show_env_drawer.read() {
                div {
                    class: "mx-3 mt-2 p-4 rounded-xl border border-[var(--zd-border)] bg-[var(--zd-surface-raised)] shadow-lg flex flex-col gap-3 shrink-0 animate-fade-in",
                    div {
                        class: "flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--zd-border)] pb-2.5",
                        div { class: "flex items-center gap-2",
                            span { class: "text-sm font-bold font-mono text-[var(--zd-primary)]", "🌍 Environment Profiles" }
                            span { class: "text-xs text-[var(--zd-text-muted)]", "(Interpolate {{VAR}} anywhere in URL, Headers, or Body)" }
                        }
                        button {
                            class: "text-xs text-[var(--zd-text-secondary)] hover:text-[var(--zd-text-primary)] px-1",
                            onclick: move |_| show_env_drawer.set(false),
                            "Close [×]"
                        }
                    }
                    div {
                        class: "flex flex-wrap items-center gap-2",
                        for (idx, p) in env_profiles.read().iter().enumerate() {
                            {
                                let is_active = idx == *active_env_idx.read();
                                let btn_cls = if is_active {
                                    "px-3 py-1 rounded-md text-xs font-mono font-semibold bg-[var(--zd-primary)] text-[var(--zd-primary-fg)] shadow"
                                } else {
                                    "px-3 py-1 rounded-md text-xs font-mono bg-[var(--zd-surface)] border border-[var(--zd-border)] text-[var(--zd-text-secondary)] hover:text-[var(--zd-text-primary)]"
                                };
                                rsx! {
                                    button {
                                        class: "{btn_cls}",
                                        onclick: move |_| active_env_idx.set(idx),
                                        "{p.name}"
                                    }
                                }
                            }
                        }
                        div { class: "flex items-center gap-1 ml-auto",
                            input {
                                class: "w-28 px-2 py-1 text-xs font-mono rounded border border-[var(--zd-border)] bg-[var(--zd-surface)] text-[var(--zd-text-primary)] placeholder-[var(--zd-text-muted)]",
                                placeholder: "New env name…",
                                value: "{new_profile_name}",
                                oninput: move |e: Event<FormData>| new_profile_name.set(e.value()),
                            }
                            button {
                                class: "px-2.5 py-1 rounded text-xs font-semibold bg-[var(--zd-surface-soft)] border border-[var(--zd-border)] hover:border-[var(--zd-primary)] text-[var(--zd-text-primary)]",
                                onclick: move |_| {
                                    let n = new_profile_name.read().trim().to_string();
                                    if !n.is_empty() {
                                        let mut list = env_profiles.read().clone();
                                        list.push(EnvProfile { name: n, vars: vec![] });
                                        active_env_idx.set(list.len() - 1);
                                        env_profiles.set(list);
                                        new_profile_name.set(String::new());
                                    }
                                },
                                "+ Profile"
                            }
                        }
                    }
                    if let Some(profile) = env_profiles.read().get(*active_env_idx.read()).cloned() {
                        div {
                            class: "flex flex-col gap-1.5 max-h-40 overflow-y-auto pr-1",
                            if profile.vars.is_empty() {
                                span { class: "text-xs font-mono text-[var(--zd-text-muted)] py-2", "No variables in this environment. Add one below!" }
                            } else {
                                for (v_idx, (k, v)) in profile.vars.iter().enumerate() {
                                    div {
                                        class: "flex items-center justify-between gap-2 px-2.5 py-1.5 rounded bg-[var(--zd-surface)] border border-[var(--zd-border)] text-xs font-mono",
                                        div { class: "flex items-center gap-2 min-w-0",
                                            span { class: "font-bold text-[var(--zd-accent)]", "{{{{{k}}}}}" }
                                            span { class: "text-[var(--zd-text-muted)]", "=" }
                                            span { class: "text-[var(--zd-text-primary)] truncate", "{v}" }
                                        }
                                        button {
                                            class: "text-[var(--zd-text-muted)] hover:text-red-400 font-bold px-1",
                                            onclick: move |_| {
                                                let mut list = env_profiles.read().clone();
                                                if let Some(p) = list.get_mut(*active_env_idx.read()) {
                                                    p.vars.remove(v_idx);
                                                }
                                                env_profiles.set(list);
                                            },
                                            "×"
                                        }
                                    }
                                }
                            }
                        }
                    }
                    div {
                        class: "flex items-center gap-2 pt-2 border-t border-[var(--zd-border)]",
                        input {
                            class: "w-32 px-2 py-1 text-xs font-mono rounded border border-[var(--zd-border)] bg-[var(--zd-surface)] text-[var(--zd-text-primary)] placeholder-[var(--zd-text-muted)]",
                            placeholder: "Key (BASE_URL)",
                            value: "{new_var_key}",
                            oninput: move |e: Event<FormData>| new_var_key.set(e.value()),
                        }
                        input {
                            class: "flex-1 px-2 py-1 text-xs font-mono rounded border border-[var(--zd-border)] bg-[var(--zd-surface)] text-[var(--zd-text-primary)] placeholder-[var(--zd-text-muted)]",
                            placeholder: "Value (https://api.example.com)",
                            value: "{new_var_val}",
                            oninput: move |e: Event<FormData>| new_var_val.set(e.value()),
                        }
                        button {
                            class: "px-3 py-1 rounded bg-[var(--zd-primary)] text-[var(--zd-primary-fg)] text-xs font-semibold hover:bg-[var(--zd-primary-hover)] shrink-0",
                            onclick: move |_| {
                                let k = new_var_key.read().trim().to_string();
                                let v = new_var_val.read().trim().to_string();
                                if !k.is_empty() {
                                    let mut list = env_profiles.read().clone();
                                    if let Some(p) = list.get_mut(*active_env_idx.read()) {
                                        p.vars.retain(|(ek, _)| ek != &k);
                                        p.vars.push((k, v));
                                    }
                                    env_profiles.set(list);
                                    new_var_key.set(String::new());
                                    new_var_val.set(String::new());
                                }
                            },
                            "+ Add Var"
                        }
                    }
                }
            }
            if *import_curl_open.read() {
                div {
                    class: "mx-3 mt-2 p-4 rounded-xl border border-[var(--zd-border)] bg-[var(--zd-surface-raised)] shadow-lg flex flex-col gap-3 shrink-0",
                    div {
                        class: "flex items-center justify-between",
                        span { class: "text-sm font-semibold text-[var(--zd-text-primary)]", "Paste cURL Command" }
                        button {
                            class: "text-xs text-[var(--zd-text-secondary)] hover:text-[var(--zd-text-primary)] focus-ring",
                            onclick: move |_| import_curl_open.set(false),
                            "Close"
                        }
                    }
                    textarea {
                        class: "w-full h-24 p-3 rounded-lg border border-[var(--zd-border)] bg-[var(--zd-surface)] text-xs font-mono text-[var(--zd-text-primary)] focus-ring resize-none",
                        placeholder: "curl -X POST https://api.example.com/v1/data -H \"Authorization: Bearer token\" -d '{{\"key\":\"value\"}}'",
                        value: import_curl_text.read().clone(),
                        oninput: move |e: Event<FormData>| import_curl_text.set(e.value()),
                    }
                    div {
                        class: "flex justify-end gap-2",
                        Button {
                            variant: ButtonVariant::Secondary,
                            onclick: move |_| import_curl_open.set(false),
                            "Cancel"
                        }
                        Button {
                            variant: ButtonVariant::Primary,
                            onclick: move |_| {
                                let input = import_curl_text.read().clone();
                                if input.trim().is_empty() {
                                    return;
                                }
                                let parsed = parse_curl(&input);
                                if parsed.url.is_empty() {
                                    state.clone().toast("Could not parse URL from cURL command".to_string(), ToastKind::Error);
                                } else {
                                    method.set(parsed.method);
                                    url.set(parsed.url);
                                    let h_str = parsed.headers.iter().map(|(k, v)| format!("{k}: {v}")).collect::<Vec<_>>().join("\n");
                                    headers_raw.set(h_str);
                                    if let Some(b) = parsed.body {
                                        body.set(b);
                                    }
                                    import_curl_open.set(false);
                                    import_curl_text.set(String::new());
                                    state.clone().toast("cURL command imported successfully!".to_string(), ToastKind::Success);
                                }
                            },
                            "Apply to Request"
                        }
                    }
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
                        }
                    }
                }
                div {
                    class: "flex flex-col min-h-0",
                    TabGroup {
                        tabs: vec![("body", "Body"), ("headers", "Headers"), ("timing", "Timing"), ("code", "Code Snippets")],
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
                        "code" => {
                            let active_vars = env_profiles.read().get(*active_env_idx.read()).map(|p| p.vars.clone()).unwrap_or_default();
                            let current_method = method.read().clone();
                            let current_url = substitute_env_vars(&url.read(), &active_vars);
                            let current_body = substitute_env_vars(&body.read(), &active_vars);
                            let headers_raw_sub = substitute_env_vars(&headers_raw.read(), &active_vars);
                            let headers_list: Vec<(String, String)> = headers_raw_sub
                                .lines()
                                .filter_map(|line| {
                                    let line = line.trim();
                                    if line.is_empty() { return None; }
                                    let (k, v) = line.split_once(':')?;
                                    Some((k.trim().to_string(), v.trim().to_string()))
                                })
                                .collect();
                            let req = CurlRequest {
                                method: current_method,
                                url: if current_url.is_empty() { "https://api.example.com".to_string() } else { current_url },
                                headers: headers_list,
                                body: if current_body.is_empty() { None } else { Some(current_body) },
                            };
                            let target = match code_target.read().as_str() {
                                "python" => CurlTarget::Python,
                                "go" => CurlTarget::Go,
                                "rust" => CurlTarget::Rust,
                                _ => CurlTarget::JavaScript,
                            };
                            let snippet = curl_to_code(&req, target);

                            rsx! {
                                div {
                                    class: "flex flex-col h-full min-h-0 flex-1",
                                    div {
                                        class: "px-3 py-2 border-b border-[var(--zd-border)] flex items-center justify-between bg-[var(--zd-surface-soft)] shrink-0",
                                        span { class: "text-xs font-semibold text-[var(--zd-text-secondary)]", "Target Language" }
                                        TabGroup {
                                            tabs: vec![
                                                ("javascript", "JavaScript"),
                                                ("python", "Python"),
                                                ("go", "Go"),
                                                ("rust", "Rust"),
                                            ],
                                            active: code_target.read().clone(),
                                            on_change: EventHandler::new(move |l| code_target.set(l)),
                                            variant: TabVariant::Toolbar,
                                        }
                                    }
                                    div {
                                        class: "flex-1 min-h-0",
                                        CodePanel {
                                            title: "Generated Code".to_string(),
                                            value: snippet.clone(),
                                            oninput: None,
                                            read_only: true,
                                            language: crate::shell::code_editor::CodeLanguage::Plain,
                                            header_actions: rsx! {
                                                ExportButton {
                                                    filename: format!("snippet.{}", match code_target.read().as_str() {
                                                        "python" => "py",
                                                        "go" => "go",
                                                        "rust" => "rs",
                                                        _ => "js",
                                                    }),
                                                    content: snippet.clone(),
                                                    label: "Download",
                                                }
                                            },
                                        }
                                    }
                                }
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
                                },
                            }
                        },
                    }
                }
            }
        }
    }
}
