use chrono::{DateTime, Datelike, Local, TimeZone, Utc};
use chrono_tz::Tz;

#[derive(Debug, Clone, PartialEq)]
pub struct EpochConversion {
    pub epoch_seconds: i64,
    pub epoch_millis: i64,
    pub utc: String,
    pub local: String,
    pub relative: String,
    pub iso8601: String,
    pub rfc2822: String,
    pub day_of_week: String,
    pub week_number: u32,
}

/// A single named timezone row for the timezone table.
#[derive(Debug, Clone, PartialEq)]
pub struct TzRow {
    pub name: &'static str,
    pub label: &'static str,
    pub formatted: String,
}

/// Well-known fixed timezone list used in the converter table.
const TZ_LIST: &[(&str, &str, Tz)] = &[
    ("UTC", "UTC+0", chrono_tz::UTC),
    ("EST", "UTC-5", chrono_tz::US::Eastern),
    ("CST", "UTC-6", chrono_tz::US::Central),
    ("MST", "UTC-7", chrono_tz::US::Mountain),
    ("PST", "UTC-8", chrono_tz::US::Pacific),
    ("BRT", "UTC-3", chrono_tz::America::Sao_Paulo),
    ("GMT", "UTC+0", chrono_tz::Europe::London),
    ("CET", "UTC+1", chrono_tz::Europe::Paris),
    ("MSK", "UTC+3", chrono_tz::Europe::Moscow),
    ("IST", "UTC+5:30", chrono_tz::Asia::Kolkata),
    ("SGT", "UTC+8", chrono_tz::Asia::Singapore),
    ("JST", "UTC+9", chrono_tz::Asia::Tokyo),
    ("AEST", "UTC+10", chrono_tz::Australia::Sydney),
    ("NZST", "UTC+12", chrono_tz::Pacific::Auckland),
];

pub fn now_epoch() -> i64 {
    Utc::now().timestamp()
}

/// Convert an epoch to timezone table rows for well-known timezones.
pub fn epoch_to_timezones(secs: i64) -> Vec<TzRow> {
    let dt = Utc.timestamp_opt(secs, 0).single().unwrap_or_else(Utc::now);
    TZ_LIST
        .iter()
        .map(|(name, label, tz)| {
            let local = dt.with_timezone(tz);
            TzRow {
                name,
                label,
                formatted: local.format("%Y-%m-%d %H:%M:%S").to_string(),
            }
        })
        .collect()
}

pub fn epoch_to_human(secs: i64) -> EpochConversion {
    let dt = Utc.timestamp_opt(secs, 0).single().unwrap_or_else(Utc::now);
    let local: DateTime<Local> = dt.with_timezone(&Local);
    let now = Utc::now();
    let diff = now.signed_duration_since(dt);
    let in_future = diff.num_seconds() < 0;
    let relative = if diff.num_seconds().abs() < 60 {
        "just now".to_string()
    } else if diff.num_minutes().abs() < 60 {
        let n = diff.num_minutes().abs();
        if in_future {
            format!("in {n} minute{}", if n == 1 { "" } else { "s" })
        } else {
            format!("{n} minute{} ago", if n == 1 { "" } else { "s" })
        }
    } else if diff.num_hours().abs() < 24 {
        let n = diff.num_hours().abs();
        if in_future {
            format!("in {n} hour{}", if n == 1 { "" } else { "s" })
        } else {
            format!("{n} hour{} ago", if n == 1 { "" } else { "s" })
        }
    } else {
        let n = diff.num_days().abs();
        if in_future {
            format!("in {n} day{}", if n == 1 { "" } else { "s" })
        } else {
            format!("{n} day{} ago", if n == 1 { "" } else { "s" })
        }
    };

    EpochConversion {
        epoch_seconds: secs,
        epoch_millis: secs.checked_mul(1000).unwrap_or(secs),
        utc: dt.format("%Y-%m-%d %H:%M:%S UTC").to_string(),
        local: local.format("%Y-%m-%d %H:%M:%S %Z").to_string(),
        relative,
        iso8601: dt.format("%Y-%m-%dT%H:%M:%SZ").to_string(),
        rfc2822: dt.format("%a, %d %b %Y %H:%M:%S +0000").to_string(),
        day_of_week: dt.format("%A").to_string(),
        week_number: dt.iso_week().week(),
    }
}

pub fn parse_to_epoch(input: &str) -> crate::Result<i64> {
    let trimmed = input.trim();
    if let Ok(n) = trimmed.parse::<i64>() {
        // Detect milliseconds by digit count on the *trimmed* value so that
        // leading/trailing whitespace does not skew the heuristic.
        if trimmed.len() > 10 {
            return Ok(n / 1000);
        }
        return Ok(n);
    }
    let formats = [
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%d",
    ];
    for fmt in formats {
        if let Ok(dt) = chrono::NaiveDateTime::parse_from_str(trimmed, fmt) {
            return Ok(dt.and_utc().timestamp());
        }
        if let Ok(d) = chrono::NaiveDate::parse_from_str(trimmed, fmt) {
            return Ok(d.and_hms_opt(0, 0, 0).unwrap().and_utc().timestamp());
        }
    }
    Err(crate::CoreError::Message("Could not parse date".into()))
}

