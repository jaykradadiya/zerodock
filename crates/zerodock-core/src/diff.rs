use serde_json::Value;

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum DiffLineKind {
    Equal,
    Insert,
    Delete,
}

#[derive(Debug, Clone, PartialEq)]
pub struct DiffLine {
    pub kind: DiffLineKind,
    pub content: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum JsonChangeKind {
    Added,
    Deleted,
    Modified,
}

#[derive(Debug, Clone, PartialEq)]
pub struct JsonChange {
    pub path: String,
    pub kind: JsonChangeKind,
    pub base_value: Option<String>,
    pub target_value: Option<String>,
}

pub fn diff_lines(left: &str, right: &str) -> Vec<DiffLine> {
    let diff = similar::TextDiff::from_lines(left, right);
    let mut lines = Vec::new();
    for change in diff.iter_all_changes() {
        let kind = match change.tag() {
            similar::ChangeTag::Equal => DiffLineKind::Equal,
            similar::ChangeTag::Insert => DiffLineKind::Insert,
            similar::ChangeTag::Delete => DiffLineKind::Delete,
        };
        let mut content = change.value().to_string();
        if !content.ends_with('\n') {
            content.push('\n');
        }
        lines.push(DiffLine { kind, content });
    }
    lines
}

/// Recursively computes semantic JSON structural differences by path ($...)
pub fn align_arrays(b_arr: &[Value], t_arr: &[Value]) -> Vec<(Option<usize>, Option<usize>)> {
    let n = b_arr.len();
    let m = t_arr.len();
    let mut dp = vec![vec![0; m + 1]; n + 1];
    for i in 0..=n {
        dp[i][0] = i * 2;
    }
    for j in 0..=m {
        dp[0][j] = j * 2;
    }
    for i in 1..=n {
        for j in 1..=m {
            let cost_del = dp[i-1][j] + 2;
            let cost_ins = dp[i][j-1] + 2;
            let cost_match = dp[i-1][j-1] + if b_arr[i-1] == t_arr[j-1] {
                0
            } else if b_arr[i-1].is_object() && t_arr[j-1].is_object() {
                1
            } else if b_arr[i-1].is_array() && t_arr[j-1].is_array() {
                1
            } else if std::mem::discriminant(&b_arr[i-1]) == std::mem::discriminant(&t_arr[j-1]) {
                1
            } else {
                4
            };
            dp[i][j] = cost_del.min(cost_ins).min(cost_match);
        }
    }

    let mut i = n;
    let mut j = m;
    let mut ops = Vec::new();
    while i > 0 || j > 0 {
        if i > 0 && j > 0 {
            let cost = if b_arr[i-1] == t_arr[j-1] {
                0
            } else if b_arr[i-1].is_object() && t_arr[j-1].is_object() {
                1
            } else if b_arr[i-1].is_array() && t_arr[j-1].is_array() {
                1
            } else if std::mem::discriminant(&b_arr[i-1]) == std::mem::discriminant(&t_arr[j-1]) {
                1
            } else {
                4
            };
            if dp[i][j] == dp[i-1][j-1] + cost {
                ops.push((Some(i - 1), Some(j - 1)));
                i -= 1;
                j -= 1;
                continue;
            }
        }
        if j > 0 && dp[i][j] == dp[i][j-1] + 2 {
            ops.push((None, Some(j - 1)));
            j -= 1;
        } else if i > 0 && dp[i][j] == dp[i-1][j] + 2 {
            ops.push((Some(i - 1), None));
            i -= 1;
        } else {
            if i > 0 && j > 0 {
                ops.push((Some(i - 1), Some(j - 1)));
                i -= 1;
                j -= 1;
            } else if j > 0 {
                ops.push((None, Some(j - 1)));
                j -= 1;
            } else {
                ops.push((Some(i - 1), None));
                i -= 1;
            }
        }
    }
    ops.reverse();
    ops
}

/// Recursively computes semantic JSON structural differences by path ($...)
pub fn diff_json_value(base: &Value, target: &Value, path: &str, out: &mut Vec<JsonChange>) {
    match (base, target) {
        (Value::Object(b_map), Value::Object(t_map)) => {
            // Check keys in base
            for (key, b_val) in b_map {
                let next_path = if path == "$" {
                    format!("$.{key}")
                } else {
                    format!("{path}.{key}")
                };
                if let Some(t_val) = t_map.get(key) {
                    diff_json_value(b_val, t_val, &next_path, out);
                } else {
                    out.push(JsonChange {
                        path: next_path,
                        kind: JsonChangeKind::Deleted,
                        base_value: Some(format_val(b_val)),
                        target_value: None,
                    });
                }
            }
            // Check keys only in target
            for (key, t_val) in t_map {
                if !b_map.contains_key(key) {
                    let next_path = if path == "$" {
                        format!("$.{key}")
                    } else {
                        format!("{path}.{key}")
                    };
                    out.push(JsonChange {
                        path: next_path,
                        kind: JsonChangeKind::Added,
                        base_value: None,
                        target_value: Some(format_val(t_val)),
                    });
                }
            }
        }
        (Value::Array(b_arr), Value::Array(t_arr)) => {
            let aligned = align_arrays(b_arr, t_arr);
            for (idx, (opt_b, opt_t)) in aligned.into_iter().enumerate() {
                let next_path = format!("{path}[{idx}]");
                match (opt_b, opt_t) {
                    (Some(bi), Some(ti)) => {
                        diff_json_value(&b_arr[bi], &t_arr[ti], &next_path, out);
                    }
                    (Some(bi), None) => {
                        out.push(JsonChange {
                            path: next_path,
                            kind: JsonChangeKind::Deleted,
                            base_value: Some(format_val(&b_arr[bi])),
                            target_value: None,
                        });
                    }
                    (None, Some(ti)) => {
                        out.push(JsonChange {
                            path: next_path,
                            kind: JsonChangeKind::Added,
                            base_value: None,
                            target_value: Some(format_val(&t_arr[ti])),
                        });
                    }
                    (None, None) => {}
                }
            }
        }
        (b, t) => {
            if b != t {
                out.push(JsonChange {
                    path: path.to_string(),
                    kind: JsonChangeKind::Modified,
                    base_value: Some(format_val(b)),
                    target_value: Some(format_val(t)),
                });
            }
        }
    }
}

fn format_val(v: &Value) -> String {
    match v {
        Value::String(s) => format!("\"{s}\""),
        Value::Null => "null".to_string(),
        Value::Bool(b) => b.to_string(),
        Value::Number(n) => n.to_string(),
        Value::Array(a) => format!("[Array ({})]", a.len()),
        Value::Object(o) => format!("[Object ({})]", o.len()),
    }
}

pub fn diff_json(left_str: &str, right_str: &str) -> Result<Vec<JsonChange>, serde_json::Error> {
    let left_val: Value = serde_json::from_str(left_str)?;
    let right_val: Value = serde_json::from_str(right_str)?;
    let mut out = Vec::new();
    diff_json_value(&left_val, &right_val, "$", &mut out);
    out.sort_by(|a, b| a.path.cmp(&b.path));
    Ok(out)
}
