use serde_json::Value;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TargetLang {
    TypeScript,
    Go,
    Rust,
    Zod,
    Pydantic,
    Schema,
}

pub fn convert_json_to_types(json: &str, lang: TargetLang) -> crate::Result<String> {
    let value: Value = serde_json::from_str(json.trim())?;
    Ok(match lang {
        TargetLang::TypeScript => json_to_typescript(&value, "RootObject"),
        TargetLang::Go => json_to_go(&value, "RootObject"),
        TargetLang::Rust => json_to_rust(&value, "RootObject"),
        TargetLang::Zod => json_to_zod(&value, "RootObject"),
        TargetLang::Pydantic => json_to_pydantic(&value, "RootObject"),
        TargetLang::Schema => json_to_schema(&value),
    })
}

fn to_pascal_case(s: &str) -> String {
    let cleaned: String = s
        .chars()
        .map(|c| if c.is_alphanumeric() || c == '_' { c } else { '_' })
        .collect();
    let name = if cleaned.chars().next().is_some_and(|c| c.is_ascii_digit()) {
        format!("_{cleaned}")
    } else {
        cleaned
    };
    name.split('_')
        .filter(|w| !w.is_empty())
        .map(|w| {
            let mut c = w.chars();
            match c.next() {
                None => String::new(),
                Some(f) => f.to_uppercase().collect::<String>() + c.as_str(),
            }
        })
        .collect::<String>()
}

fn to_snake_case(s: &str) -> String {
    let pascal = to_pascal_case(s);
    let mut out = String::new();
    for (i, c) in pascal.chars().enumerate() {
        if c.is_uppercase() && i > 0 {
            out.push('_');
        }
        out.push(c.to_ascii_lowercase());
    }
    if out.chars().next().is_some_and(|c| c.is_ascii_digit()) {
        format!("r#_{out}")
    } else {
        out
    }
}

pub fn json_to_typescript(value: &Value, name: &str) -> String {
    let mut interfaces = Vec::new();
    generate_ts_interface(value, name, &mut interfaces);
    interfaces.join("\n\n")
}

fn generate_ts_interface(value: &Value, name: &str, out: &mut Vec<String>) -> String {
    let iname = to_pascal_case(name);
    match value {
        Value::Object(map) => {
            let mut fields = String::new();
            for (k, v) in map {
                let ft = ts_field_type(v, k, out);
                let key = if k.chars().all(|c| c.is_alphanumeric() || c == '_' || c == '$')
                    && !k.chars().next().is_some_and(|c| c.is_ascii_digit())
                {
                    k.clone()
                } else {
                    format!("\"{k}\"")
                };
                fields.push_str(&format!("  {key}: {ft};\n"));
            }
            let iface = format!("export interface {iname} {{\n{fields}}}");
            if !out.contains(&iface) {
                out.push(iface);
            }
            iname
        }
        Value::Array(arr) => {
            if let Some(first) = arr.first() {
                let inner = generate_ts_interface(first, &format!("{name}Item"), out);
                format!("{inner}[]")
            } else {
                "any[]".into()
            }
        }
        Value::Null => "any".into(),
        Value::Bool(_) => "boolean".into(),
        Value::Number(_) => "number".into(),
        Value::String(_) => "string".into(),
    }
}

fn ts_field_type(value: &Value, key: &str, out: &mut Vec<String>) -> String {
    match value {
        Value::Object(_) => generate_ts_interface(value, key, out),
        Value::Array(arr) => {
            if let Some(first) = arr.first() {
                if first.is_object() {
                    let nested = generate_ts_interface(first, &format!("{}Item", to_pascal_case(key)), out);
                    format!("{nested}[]")
                } else {
                    format!("{}[]", ts_primitive(first))
                }
            } else {
                "any[]".into()
            }
        }
        _ => ts_primitive(value),
    }
}

fn ts_primitive(v: &Value) -> String {
    match v {
        Value::Null => "any".into(),
        Value::Bool(_) => "boolean".into(),
        Value::Number(_) => "number".into(),
        Value::String(_) => "string".into(),
        _ => "any".into(),
    }
}

pub fn json_to_go(value: &Value, name: &str) -> String {
    let mut structs = Vec::new();
    generate_go_struct(value, name, &mut structs);
    structs.join("\n\n")
}

fn generate_go_struct(value: &Value, name: &str, out: &mut Vec<String>) -> String {
    let sname = to_pascal_case(name);
    if let Value::Object(map) = value {
        let mut fields = String::new();
        for (k, v) in map {
            let ft = go_field_type(v, k, out);
            fields.push_str(&format!("\t{} {} `json:\"{}\"`\n", to_pascal_case(k), ft, k));
        }
        let s = format!("type {sname} struct {{\n{fields}}}");
        if !out.contains(&s) {
            out.push(s);
        }
        sname
    } else {
        "interface{}".into()
    }
}

fn go_field_type(value: &Value, key: &str, out: &mut Vec<String>) -> String {
    match value {
        Value::Object(_) => generate_go_struct(value, key, out),
        Value::Array(arr) => {
            if let Some(first) = arr.first() {
                format!("[]{}", go_field_type(first, key, out))
            } else {
                "[]interface{}".into()
            }
        }
        Value::Null => "interface{}".into(),
        Value::Bool(_) => "bool".into(),
        Value::Number(_) => "float64".into(),
        Value::String(_) => "string".into(),
    }
}

pub fn json_to_rust(value: &Value, name: &str) -> String {
    let mut structs = Vec::new();
    generate_rust_struct(value, name, &mut structs);
    format!(
        "use serde::{{Deserialize, Serialize}};\n\n{}",
        structs.join("\n\n")
    )
}

fn generate_rust_struct(value: &Value, name: &str, out: &mut Vec<String>) -> String {
    let sname = to_pascal_case(name);
    if let Value::Object(map) = value {
        let mut fields = String::new();
        for (k, v) in map {
            let ft = rust_field_type(v, k, out);
            fields.push_str(&format!("    #[serde(rename = \"{k}\")]\n    pub {}: {ft},\n", to_snake_case(k)));
        }
        let s = format!("#[derive(Serialize, Deserialize, Debug)]\npub struct {sname} {{\n{fields}}}");
        if !out.contains(&s) {
            out.push(s);
        }
        sname
    } else {
        "serde_json::Value".into()
    }
}

fn rust_field_type(value: &Value, key: &str, out: &mut Vec<String>) -> String {
    match value {
        Value::Object(_) => generate_rust_struct(value, key, out),
        Value::Array(arr) => {
            if let Some(first) = arr.first() {
                format!("Vec<{}>", rust_field_type(first, key, out))
            } else {
                "Vec<serde_json::Value>".into()
            }
        }
        Value::Null => "Option<serde_json::Value>".into(),
        Value::Bool(_) => "bool".into(),
        Value::Number(_) => "f64".into(),
        Value::String(_) => "String".into(),
    }
}

pub fn json_to_schema(value: &Value) -> String {
    let schema = schema_for_value(value);
    serde_json::to_string_pretty(&schema).unwrap_or_default()
}

fn schema_for_value(value: &Value) -> serde_json::Value {
    match value {
        Value::Null => serde_json::json!({ "type": "null" }),
        Value::Bool(_) => serde_json::json!({ "type": "boolean" }),
        Value::Number(_) => serde_json::json!({ "type": "number" }),
        Value::String(_) => serde_json::json!({ "type": "string" }),
        Value::Array(arr) => {
            let items = arr.first().map(schema_for_value).unwrap_or(serde_json::json!({}));
            serde_json::json!({ "type": "array", "items": items })
        }
        Value::Object(map) => {
            let props: serde_json::Map<String, Value> = map
                .iter()
                .map(|(k, v)| (k.clone(), schema_for_value(v)))
                .collect();
            let required: Vec<&str> = map.keys().map(|s| s.as_str()).collect();
            serde_json::json!({
                "$schema": "http://json-schema.org/draft-07/schema#",
                "type": "object",
                "properties": props,
                "required": required
            })
        }
    }
}

pub fn json_to_zod(value: &Value, name: &str) -> String {
    let mut schemas = Vec::new();
    generate_zod_schema(value, name, &mut schemas);
    let mut out = String::from("import { z } from \"zod\";\n\n");
    for schema in schemas.iter().rev() {
        out.push_str(schema);
        out.push_str("\n\n");
    }
    out.trim_end().to_string()
}

fn generate_zod_schema(value: &Value, name: &str, out: &mut Vec<String>) -> String {
    let pascal = to_pascal_case(name);
    let schema_name = format!("{}Schema", pascal);
    match value {
        Value::Object(map) => {
            let mut lines = Vec::new();
            lines.push(format!("export const {schema_name} = z.object({{"));
            for (k, v) in map {
                let ft = zod_field_type(v, k, out);
                lines.push(format!("    {k}: {ft},"));
            }
            lines.push("});".into());
            lines.push(format!("export type {pascal} = z.infer<typeof {schema_name}>;"));
            out.push(lines.join("\n"));
            schema_name
        }
        Value::Array(arr) => {
            if let Some(first) = arr.first() {
                format!("z.array({})", zod_field_type(first, name, out))
            } else {
                "z.array(z.any())".into()
            }
        }
        _ => zod_field_type(value, name, out),
    }
}

fn zod_field_type(value: &Value, key: &str, out: &mut Vec<String>) -> String {
    match value {
        Value::Object(_) => generate_zod_schema(value, key, out),
        Value::Array(arr) => {
            if let Some(first) = arr.first() {
                format!("z.array({})", zod_field_type(first, key, out))
            } else {
                "z.array(z.any())".into()
            }
        }
        Value::Null => "z.null()".into(),
        Value::Bool(_) => "z.boolean()".into(),
        Value::Number(_) => "z.number()".into(),
        Value::String(_) => "z.string()".into(),
    }
}

pub fn json_to_pydantic(value: &Value, name: &str) -> String {
    let mut models = Vec::new();
    generate_pydantic_model(value, name, &mut models);
    let mut out = String::from("from typing import List, Optional, Any, Dict\nfrom pydantic import BaseModel, Field\n\n");
    for model in models.iter().rev() {
        out.push_str(model);
        out.push_str("\n\n");
    }
    out.trim_end().to_string()
}

fn generate_pydantic_model(value: &Value, name: &str, out: &mut Vec<String>) -> String {
    let pascal = to_pascal_case(name);
    let model_name = if pascal.ends_with("Model") { pascal.clone() } else { format!("{pascal}Model") };
    match value {
        Value::Object(map) => {
            let mut lines = Vec::new();
            lines.push(format!("class {model_name}(BaseModel):"));
            if map.is_empty() {
                lines.push("    pass".into());
            } else {
                for (k, v) in map {
                    let ft = pydantic_field_type(v, k, out);
                    lines.push(format!("    {k}: {ft}"));
                }
            }
            out.push(lines.join("\n"));
            model_name
        }
        Value::Array(arr) => {
            if let Some(first) = arr.first() {
                format!("List[{}]", pydantic_field_type(first, name, out))
            } else {
                "List[Any]".into()
            }
        }
        _ => pydantic_field_type(value, name, out),
    }
}

fn pydantic_field_type(value: &Value, key: &str, out: &mut Vec<String>) -> String {
    match value {
        Value::Object(_) => generate_pydantic_model(value, key, out),
        Value::Array(arr) => {
            if let Some(first) = arr.first() {
                format!("List[{}]", pydantic_field_type(first, key, out))
            } else {
                "List[Any]".into()
            }
        }
        Value::Null => "Optional[Any]".into(),
        Value::Bool(_) => "bool".into(),
        Value::Number(_) => "float".into(),
        Value::String(_) => "str".into(),
    }
}
