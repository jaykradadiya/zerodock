pub fn format_json(input: &str, indent: usize) -> crate::Result<String> {
    format_json_opts(input, indent, false)
}

pub fn format_json_opts(input: &str, indent: usize, sort_keys: bool) -> crate::Result<String> {
    let mut value: serde_json::Value = serde_json::from_str(input)?;
    if sort_keys {
        value = sort_json_value(value);
    }
    // serde_json's pretty printer always uses 2-space indentation. Re-indent
    // by transforming only the *leading* whitespace of each line so that
    // spaces appearing inside JSON string values are never touched.
    let pretty = serde_json::to_string_pretty(&value)?;
    if indent == 2 {
        return Ok(pretty);
    }
    let indent_str = if indent == 0 { "\t".to_string() } else { " ".repeat(indent) };
    let mut out = String::with_capacity(pretty.len());
    for line in pretty.split_inclusive('\n') {
        let (newline, body) = match line.strip_suffix('\n') {
            Some(rest) => ("\n", rest),
            None => ("", line),
        };
        let leading_len = body.bytes().take_while(|b| *b == b' ').count();
        let level = leading_len / 2;
        let rem = leading_len % 2;
        out.push_str(&indent_str.repeat(level));
        if rem > 0 {
            out.push(' ');
        }
        out.push_str(&body[leading_len..]);
        out.push_str(newline);
    }
    Ok(out)
}

fn sort_json_value(value: serde_json::Value) -> serde_json::Value {
    match value {
        serde_json::Value::Object(map) => {
            let mut keys: Vec<_> = map.keys().cloned().collect();
            keys.sort();
            let mut sorted = serde_json::Map::new();
            for key in keys {
                if let Some(v) = map.get(&key) {
                    sorted.insert(key, sort_json_value(v.clone()));
                }
            }
            serde_json::Value::Object(sorted)
        }
        serde_json::Value::Array(arr) => {
            serde_json::Value::Array(arr.into_iter().map(sort_json_value).collect())
        }
        other => other,
    }
}

pub fn minify_json(input: &str) -> crate::Result<String> {
    let value: serde_json::Value = serde_json::from_str(input)?;
    Ok(serde_json::to_string(&value)?)
}

pub fn repair_json(input: &str) -> crate::Result<String> {
    jsonrepair_rs::jsonrepair(input).map_err(|e| crate::CoreError::Message(e.to_string()))
}

pub fn validate_json_schema(json: &str, schema: &str) -> crate::Result<Vec<String>> {
    #[cfg(feature = "native")]
    {
        let instance: serde_json::Value = serde_json::from_str(json)?;
        let schema_val: serde_json::Value = serde_json::from_str(schema)?;
        let compiled = jsonschema::validator_for(&schema_val)
            .map_err(|e| crate::CoreError::Message(e.to_string()))?;
        let errors: Vec<String> = compiled
            .iter_errors(&instance)
            .map(|e| e.to_string())
            .collect();
        Ok(errors)
    }
    #[cfg(not(feature = "native"))]
    {
        let _ = (json, schema);
        Err(crate::CoreError::Message(
            "JSON Schema validation requires the native/desktop build".into(),
        ))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn format_preserves_spaces_inside_strings() {
        let input = r#"{"msg":"hello  world"}"#;
        let out = format_json_opts(input, 4, false).unwrap();
        assert!(
            out.contains(r#""hello  world""#),
            "string contents must not be re-indented, got: {out}"
        );
    }

    #[test]
    fn format_indent_four_uses_four_spaces() {
        let input = r#"{"a":1}"#;
        let out = format_json_opts(input, 4, false).unwrap();
        assert!(out.contains("\n    \"a\""), "expected 4-space indent, got: {out}");
    }

    #[test]
    fn format_indent_zero_uses_tabs() {
        let input = r#"{"a":1}"#;
        let out = format_json_opts(input, 0, false).unwrap();
        assert!(out.contains("\n\t\"a\""), "expected tab indent, got: {out}");
    }
}
