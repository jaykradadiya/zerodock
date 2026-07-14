use crate::shell::code_editor::CodeLanguage;
use crate::shell::layout::{CodePanel, ResponsiveSplitPanels, StandaloneTool, ToolBody};
use crate::shell::ui::{Button, ButtonVariant, CopyButton};
use crate::state::use_app_state;
use dioxus::prelude::*;
use zerodock_core::{epoch_to_human, epoch_to_timezones, now_epoch, parse_to_epoch};

/// Named timezone options for the dropdown.
const TZ_OPTIONS: &[(&str, &str)] = &[
    ("UTC", "UTC / GMT"),
    ("America/New_York", "US Eastern (New York)"),
    ("America/Chicago", "US Central (Chicago)"),
    ("America/Denver", "US Mountain (Denver)"),
    ("America/Los_Angeles", "US Pacific (Los Angeles)"),
    ("Europe/London", "Europe (London)"),
    ("Europe/Paris", "Europe (Paris)"),
    ("Asia/Kolkata", "India (Kolkata)"),
    ("Asia/Tokyo", "Japan (Tokyo)"),
    ("Asia/Singapore", "Singapore"),
    ("Asia/Dubai", "Gulf (Dubai)"),
    ("Australia/Sydney", "Australia (Sydney)"),
];

#[component]
pub fn EpochConverter() -> Element {
    rsx! {
        StandaloneTool {
            title: "Epoch Timestamp Converter",
            description: "Parse Unix timestamps to human times and construct epochs in local or UTC.",
            EpochConverterContent {}
        }
    }
}

#[component]
pub fn EpochConverterContent() -> Element {
    let mut state = use_app_state();

    // Smart paste support
    let mut epoch_input = use_signal(|| {
        let pasted = state.tool_states.read().get("epoch-converter").cloned();
        if pasted.is_some() {
            state.tool_states.write().remove("epoch-converter");
        }
        pasted.unwrap_or_else(|| now_epoch().to_string())
    });
    let mut date_input = use_signal(|| {
        #[cfg(target_arch = "wasm32")]
        {
            let d = js_sys::Date::new_0();
            let pad = |n: u32| if n < 10 { format!("0{n}") } else { n.to_string() };
            format!("{}-{}-{} {}:{}:{}",
                d.get_full_year(),
                pad(d.get_month() as u32 + 1),
                pad(d.get_date() as u32),
                pad(d.get_hours() as u32),
                pad(d.get_minutes() as u32),
                pad(d.get_seconds() as u32),
            )
        }
        #[cfg(not(target_arch = "wasm32"))]
        {
            chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string()
        }
    });
    let mut target_tz = use_signal(|| "America/New_York".to_string());
    let mut bulk_epochs = use_signal(String::new);

    // Live clock ticker
    let mut clock_paused = use_signal(|| false);
    let mut current_time_ms = use_signal(|| {
        #[cfg(target_arch = "wasm32")]
        { js_sys::Date::now() as i64 }
        #[cfg(not(target_arch = "wasm32"))]
        { chrono::Utc::now().timestamp_millis() }
    });

    use_future(move || async move {
        loop {
            gloo_timers::future::TimeoutFuture::new(50).await;
            if !*clock_paused.read() {
                #[cfg(target_arch = "wasm32")]
                { current_time_ms.set(js_sys::Date::now() as i64); }
                #[cfg(not(target_arch = "wasm32"))]
                { current_time_ms.set(chrono::Utc::now().timestamp_millis()); }
            }
        }
    });

    let current_secs = use_memo(move || *current_time_ms.read() / 1000);
    let current_ms = use_memo(move || *current_time_ms.read());

    // Epoch → Date conversion
    let from_epoch = use_memo(move || {
        epoch_input.read().trim().parse::<i64>().ok().map(|n| {
            // Auto-detect ms vs s
            if epoch_input.read().trim().len() > 10 { epoch_to_human(n / 1000) } else { epoch_to_human(n) }
        })
    });

    let epoch_error = use_memo(move || {
        let s = epoch_input.read().clone();
        if s.trim().is_empty() { return None; }
        if s.trim().parse::<i64>().is_err() {
            Some("Invalid timestamp value. Please enter a valid number.".to_string())
        } else { None }
    });

    // Target TZ formatted time for the epoch input
    let target_tz_display = use_memo(move || {
        let s = epoch_input.read().clone();
        let tz_name = target_tz.read().clone();
        let n = s.trim().parse::<i64>().ok();
        match n {
            Some(ts) => {
                let secs = if s.trim().len() > 10 { ts / 1000 } else { ts };
                let rows = epoch_to_timezones(secs);
                // Find matching TZ in our predefined list
                let tz_short = match tz_name.as_str() {
                    "UTC" => "UTC",
                    "America/New_York" => "EST",
                    "America/Chicago" => "CST",
                    "America/Denver" => "MST",
                    "America/Los_Angeles" => "PST",
                    "Europe/London" => "GMT",
                    "Europe/Paris" => "CET",
                    "Asia/Kolkata" => "IST",
                    "Asia/Tokyo" => "JST",
                    "Asia/Singapore" => "SGT",
                    "Australia/Sydney" => "AEST",
                    _ => "UTC",
                };
                rows.iter()
                    .find(|r| r.name == tz_short)
                    .map(|r| r.formatted.clone())
                    .unwrap_or_default()
            }
            None => String::new(),
        }
    });

    let relative_time = use_memo(move || {
        from_epoch.read().as_ref().map(|c| c.relative.clone()).unwrap_or_default()
    });

    // Date → Epoch conversion
    let from_date = use_memo(move || {
        let s = date_input.read().clone();
        if s.trim().is_empty() { return None; }
        parse_to_epoch(&s).ok().map(epoch_to_human)
    });
    let date_error = use_memo(move || {
        let s = date_input.read().clone();
        if s.trim().is_empty() { return None; }
        if parse_to_epoch(&s).is_err() {
            Some("Could not parse date string. Try YYYY-MM-DD HH:mm:ss or ISO/RFC format.".to_string())
        } else { None }
    });

    // Bulk converter
    let bulk_output = use_memo(move || {
        let mut lines = Vec::new();
        for (i, line) in bulk_epochs.read().lines().enumerate() {
            let trimmed = line.trim();
            if trimmed.is_empty() { continue; }
            match trimmed.parse::<i64>() {
                Ok(epoch) => {
                    let h = epoch_to_human(epoch);
                    lines.push(format!("{epoch}\t{}\t{}", h.utc, h.local));
                }
                Err(_) => lines.push(format!("Line {}: invalid timestamp", i + 1)),
            }
        }
        lines.join("\n")
    });

    // Find the current target TZ label
    let tz_label = TZ_OPTIONS.iter()
        .find(|(v, _)| *v == target_tz.read().as_str())
        .map(|(_, l)| *l)
        .unwrap_or("UTC / GMT");

    rsx! {
        ToolBody {
            // ═══════════════════════════════════════════════════════════════
            //  Target Timezone Selector Bar
            // ═══════════════════════════════════════════════════════════════
            div {
                class: "w-full bg-[var(--zd-surface-raised)] border-b border-[var(--zd-border)] px-4 py-2.5 flex items-center justify-between gap-3 shrink-0",
                div { class: "flex items-center gap-2 shrink-0",
                    span { class: "text-sm", "🌍" }
                    span { class: "text-[10px] font-bold uppercase tracking-wider text-[var(--zd-text-muted)] hidden sm:inline", "Target TZ" }
                }
                select {
                    class: "w-48 sm:w-56 px-3 py-1.5 text-xs bg-[var(--zd-surface-raised)] border border-[var(--zd-border)] rounded-lg text-[var(--zd-text-primary)] outline-none focus:border-[var(--zd-primary)] transition-all font-semibold cursor-pointer font-mono",
                    value: "{target_tz}",
                    onchange: move |e: Event<FormData>| target_tz.set(e.value()),
                    for (val , label) in TZ_OPTIONS.iter() {
                        option { value: *val, "{label}" }
                    }
                }
            }

            div { class: "w-full flex flex-col gap-6 p-4 sm:p-6 overflow-y-auto custom-scrollbar",

                // ═══════════════════════════════════════════════════════════
                //  Current Unix Timestamp — Big hero card
                // ═══════════════════════════════════════════════════════════
                div {
                    class: "w-full rounded-2xl border border-[var(--zd-border)] bg-gradient-to-br from-[var(--zd-surface-raised)] to-[var(--zd-surface)] p-5 shadow-[var(--zd-shadow-lg)]",
                    div { class: "flex items-center justify-between gap-4 mb-2",
                        span { class: "text-xs font-bold uppercase tracking-wider text-[var(--zd-primary)]", "Current Unix Timestamp" }
                        div { class: "flex items-center gap-2 shrink-0",
                            Button {
                                variant: if *clock_paused.read() { ButtonVariant::Secondary } else { ButtonVariant::Primary },
                                class: "px-3 py-1.5 rounded-lg text-xs font-semibold",
                                onclick: move |_| { let cur = *clock_paused.read(); clock_paused.set(!cur); },
                                if *clock_paused.read() { "▶ Resume" } else { "⏸ Freeze" }
                            }
                            CopyButton { text: current_secs.read().to_string(), label: "Copy s" }
                            CopyButton { text: current_ms.read().to_string(), label: "Copy ms" }
                        }
                    }
                    div { class: "flex items-baseline gap-2 font-mono tabular-nums",
                        span { class: "text-2xl md:text-3xl font-extrabold text-[var(--zd-text-primary)] tracking-tight", "{current_secs}" }
                        span { class: "text-sm text-[var(--zd-text-muted)]", "s" }
                        span { class: "text-[var(--zd-text-muted)] text-sm mx-1", "|" }
                        span { class: "text-2xl md:text-3xl font-extrabold text-[var(--zd-accent)] tracking-tight", "{current_ms}" }
                        span { class: "text-sm text-[var(--zd-text-muted)]", "ms" }
                    }
                    p { class: "text-[10px] text-[var(--zd-text-muted)] mt-1.5", "Ticking in real-time. Freeze or copy values above." }
                }

                // ═══════════════════════════════════════════════════════════
                //  Two-column: Epoch→Date  |  Date→Epoch
                // ═══════════════════════════════════════════════════════════
                div {
                    class: "grid grid-cols-1 md:grid-cols-2 gap-6 w-full",

                    // ─── LEFT CARD: Epoch to Date Time ─────────────────────
                    div {
                        class: "bg-[var(--zd-surface)] border border-[var(--zd-border)] rounded-2xl p-6 shadow-[var(--zd-shadow-md)] flex flex-col gap-4",
                        h3 { class: "text-lg font-bold text-[var(--zd-text-primary)] flex items-center gap-2",
                            span { class: "text-[var(--zd-primary)]", "📅" }
                            "Epoch to Date Time"
                        }
                        div { class: "flex flex-col gap-2",
                            label { class: "text-xs font-semibold text-[var(--zd-text-secondary)]", "Enter Timestamp (Seconds or Milliseconds)" }
                            div { class: "flex gap-2",
                                input {
                                    r#type: "text",
                                    value: "{epoch_input}",
                                    oninput: move |e: Event<FormData>| epoch_input.set(e.value()),
                                    class: "flex-1 px-4 py-2.5 text-sm bg-[var(--zd-surface-raised)] border border-[var(--zd-border)] rounded-xl text-[var(--zd-text-primary)] outline-none focus:border-[var(--zd-primary)] focus:ring-2 focus:ring-[var(--zd-primary-soft)] transition-all font-mono",
                                    placeholder: "e.g. 1781523600",
                                }
                                button {
                                    class: "px-3 py-2.5 bg-[var(--zd-surface-raised)] border border-[var(--zd-border)] hover:border-[var(--zd-primary)] hover:text-[var(--zd-primary)] rounded-xl transition-all text-sm",
                                    title: "Load current epoch",
                                    onclick: move |_| epoch_input.set(now_epoch().to_string()),
                                    "🔄"
                                }
                            }
                        }
                        if let Some(err) = epoch_error.read().as_ref() {
                            div { class: "text-xs text-red-500 font-medium", "{err}" }
                        }
                        if let Some(c) = from_epoch.read().as_ref() {
                            div { class: "flex flex-col gap-3 mt-2",
                                // UTC / GMT Time
                                ResultRow { label: "UTC / GMT Time", value: c.utc.clone(), copyable: true }
                                // Local
                                ResultRow { label: "Local Timezone", value: c.local.clone(), copyable: true }
                                // Target TZ
                                if !target_tz_display.read().is_empty() {
                                    div {
                                        class: "bg-[var(--zd-surface-raised)] rounded-xl p-3 border-l-2 border-l-[var(--zd-accent)]",
                                        p { class: "text-[10px] font-bold uppercase tracking-wider text-[var(--zd-text-muted)] mb-1",
                                            "Target Timezone ({tz_label})"
                                        }
                                        p { class: "text-sm font-semibold text-[var(--zd-text-primary)] font-mono", "{target_tz_display}" }
                                    }
                                }
                                // ISO 8601
                                ResultRow { label: "ISO 8601 String", value: c.iso8601.clone(), copyable: true }
                                // Relative
                                div {
                                    class: "bg-[var(--zd-surface-raised)] rounded-xl p-3",
                                    p { class: "text-[10px] font-bold uppercase tracking-wider text-[var(--zd-text-muted)] mb-1", "Relative Time" }
                                    p { class: "text-sm font-semibold text-[var(--zd-primary)] font-mono", "{relative_time}" }
                                }
                            }
                        }
                    }

                    // ─── RIGHT CARD: Date Time to Epoch ───────────────────
                    div {
                        class: "bg-[var(--zd-surface)] border border-[var(--zd-border)] rounded-2xl p-6 shadow-[var(--zd-shadow-md)] flex flex-col gap-4",
                        h3 { class: "text-lg font-bold text-[var(--zd-text-primary)] flex items-center gap-2",
                            span { class: "text-[var(--zd-primary)]", "⏱" }
                            "Date Time to Epoch"
                        }
                        div { class: "flex flex-col gap-2",
                            label { class: "text-xs font-semibold text-[var(--zd-text-secondary)]", "Enter Date / Time String (Pastable)" }
                            div { class: "flex gap-2",
                                input {
                                    r#type: "text",
                                    value: "{date_input}",
                                    oninput: move |e: Event<FormData>| date_input.set(e.value()),
                                    class: "flex-1 px-4 py-2.5 text-sm bg-[var(--zd-surface-raised)] border border-[var(--zd-border)] rounded-xl text-[var(--zd-text-primary)] outline-none focus:border-[var(--zd-primary)] focus:ring-2 focus:ring-[var(--zd-primary-soft)] transition-all font-mono",
                                    placeholder: "e.g. 2026-06-15 12:40:00 or ISO/RFC string",
                                }
                                // Native datetime-local picker — styled as icon button
                                div { class: "relative shrink-0",
                                    input {
                                        r#type: "datetime-local",
                                        class: "absolute inset-0 w-full h-full opacity-0 cursor-pointer",
                                        onchange: move |e: Event<FormData>| {
                                            let v = e.value();
                                            if !v.is_empty() {
                                                date_input.set(v.replace('T', " "));
                                            }
                                        },
                                    }
                                    div {
                                        class: "px-3 py-2.5 bg-[var(--zd-surface-raised)] border border-[var(--zd-border)] hover:border-[var(--zd-primary)] hover:text-[var(--zd-primary)] rounded-xl transition-all text-sm pointer-events-none flex items-center justify-center",
                                        "📅"
                                    }
                                }
                                // Load-now button
                                button {
                                    class: "px-3 py-2.5 bg-[var(--zd-surface-raised)] border border-[var(--zd-border)] hover:border-[var(--zd-primary)] hover:text-[var(--zd-primary)] rounded-xl transition-all text-sm shrink-0",
                                    title: "Load current date/time",
                                    onclick: move |_| {
                                        #[cfg(target_arch = "wasm32")]
                                        {
                                            let d = js_sys::Date::new_0();
                                            let pad = |n: u32| if n < 10 { format!("0{n}") } else { n.to_string() };
                                            let now = format!("{}-{}-{} {}:{}:{}",
                                                d.get_full_year(),
                                                pad(d.get_month() as u32 + 1),
                                                pad(d.get_date() as u32),
                                                pad(d.get_hours() as u32),
                                                pad(d.get_minutes() as u32),
                                                pad(d.get_seconds() as u32),
                                            );
                                            date_input.set(now);
                                        }
                                        #[cfg(not(target_arch = "wasm32"))]
                                        {
                                            date_input.set(chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string());
                                        }
                                    },
                                    "🔄"
                                }
                            }
                        }
                        if let Some(err) = date_error.read().as_ref() {
                            div { class: "text-xs text-red-500 font-medium p-3 bg-red-500/10 rounded-xl border border-red-500/20 mt-2", "{err}" }
                        }
                        if date_input.read().trim().is_empty() {
                            div { class: "text-center text-xs text-[var(--zd-text-muted)] py-8 bg-[var(--zd-surface-raised)]/30 rounded-xl border border-dashed border-[var(--zd-border)] mt-2",
                                "Enter or paste a valid date/time above."
                            }
                        }
                        if let Some(c) = from_date.read().as_ref() {
                            div { class: "flex flex-col gap-3 mt-2.5",
                                ResultRow { label: "Epoch Seconds (Unix)", value: c.epoch_seconds.to_string(), copyable: true }
                                div {
                                    class: "bg-[var(--zd-surface-raised)] rounded-xl p-3",
                                    p { class: "text-[10px] font-bold uppercase tracking-wider text-[var(--zd-text-muted)] mb-1", "Epoch Milliseconds" }
                                    p { class: "text-sm font-semibold text-[var(--zd-accent)] font-mono", "{c.epoch_millis}" }
                                }
                            }
                        }
                    }
                }
            }

            // ═══════════════════════════════════════════════════════════════
            //  Bulk Converter (bottom)
            // ═══════════════════════════════════════════════════════════════
            ResponsiveSplitPanels {
                input_label: "Bulk epochs",
                output_label: "Converted",
                input_panel: rsx! {
                    CodePanel {
                        title: "Epochs (one per line)".to_string(),
                        value: bulk_epochs.read().clone(),
                        oninput: Some(EventHandler::new(move |e: Event<FormData>| bulk_epochs.set(e.value()))),
                        on_edit: Some(EventHandler::new(move |v: String| bulk_epochs.set(v))),
                        placeholder: "1704067200\n1704153600",
                        language: CodeLanguage::Plain,
                    }
                },
                output_panel: rsx! {
                    CodePanel {
                        title: "UTC / Local".to_string(),
                        value: bulk_output.read().clone(),
                        oninput: None,
                        read_only: true,
                        show_empty: true,
                        placeholder: "Converted dates appear here",
                        language: CodeLanguage::Plain,
                    }
                },
            }
        }
    }
}

/// A single result row matching the reference design's `StatRow` component.
#[component]
fn ResultRow(label: &'static str, value: String, copyable: bool) -> Element {
    rsx! {
        div {
            class: "bg-[var(--zd-surface-raised)] rounded-xl p-3 flex items-center justify-between gap-2",
            div { class: "min-w-0",
                p { class: "text-[10px] font-bold uppercase tracking-wider text-[var(--zd-text-muted)] mb-1", "{label}" }
                p { class: "text-sm font-semibold text-[var(--zd-text-primary)] font-mono truncate", "{value}" }
            }
            if copyable {
                CopyButton { text: value.clone(), label: "Copy" }
            }
        }
    }
}
