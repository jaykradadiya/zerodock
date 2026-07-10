#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CurlTarget {
    JavaScript,
    Python,
    Go,
    Rust,
}

pub fn parse_curl(curl: &str) -> CurlRequest {
    let mut req = CurlRequest::default();
    let tokens = tokenize_curl(curl);
    let mut i = 0;
    while i < tokens.len() {
        match tokens[i].as_str() {
            "curl" => i += 1,
            "-X" | "--request" => {
                if i + 1 < tokens.len() {
                    req.method = tokens[i + 1].to_uppercase();
                    i += 2;
                } else {
                    i += 1;
                }
            }
            "-H" | "--header" => {
                if i + 1 < tokens.len() {
                    if let Some((k, v)) = tokens[i + 1].split_once(':') {
                        req.headers.push((k.trim().to_string(), v.trim().to_string()));
                    }
                    i += 2;
                } else {
                    i += 1;
                }
            }
            "-d" | "--data" | "--data-raw" | "--data-binary" => {
                if i + 1 < tokens.len() {
                    req.body = Some(tokens[i + 1].clone());
                    if req.method == "GET" {
                        req.method = "POST".into();
                    }
                    i += 2;
                } else {
                    i += 1;
                }
            }
            _ => {
                let t = &tokens[i];
                if t.starts_with("http://") || t.starts_with("https://") {
                    req.url = t.trim_matches(['\'', '"']).to_string();
                }
                i += 1;
            }
        }
    }
    req
}

#[derive(Debug, Clone)]
pub struct CurlRequest {
    pub method: String,
    pub url: String,
    pub headers: Vec<(String, String)>,
    pub body: Option<String>,
}

impl Default for CurlRequest {
    fn default() -> Self {
        Self {
            method: "GET".into(),
            url: String::new(),
            headers: vec![],
            body: None,
        }
    }
}

pub fn curl_to_code(req: &CurlRequest, target: CurlTarget) -> String {
    let is_json = req
        .headers
        .iter()
        .any(|(k, v)| k.eq_ignore_ascii_case("content-type") && v.to_ascii_lowercase().contains("json"));
    let body_json = req.body.as_deref().and_then(|b| serde_json::from_str::<serde_json::Value>(b).ok());

    match target {
        CurlTarget::JavaScript => {
            let mut s = format!("const response = await fetch('{}', {{\n  method: '{}'", req.url, req.method);
            if !req.headers.is_empty() {
                s.push_str(",\n  headers: {\n");
                for (k, v) in &req.headers {
                    s.push_str(&format!("    '{}': '{}',\n", js_escape(k), js_escape(v)));
                }
                s.push_str("  }");
            }
            if let Some(body) = &req.body {
                if is_json {
                    if let Some(val) = &body_json {
                        s.push_str(&format!(",\n  body: JSON.stringify({})", serde_json::to_string(val).unwrap_or_else(|_| body.clone())));
                    } else {
                        s.push_str(&format!(",\n  body: JSON.stringify({})", js_escape(body)));
                    }
                } else {
                    s.push_str(&format!(",\n  body: '{}'", js_escape(body)));
                }
            }
            s.push_str("\n});\nconst data = await response.json();");
            s
        }
        CurlTarget::Python => {
            let mut s = format!("import requests\n\nresponse = requests.{}('{}'", req.method.to_lowercase(), req.url);
            if !req.headers.is_empty() {
                s.push_str(", headers={\n");
                for (k, v) in &req.headers {
                    s.push_str(&format!("    '{}': '{}',\n", py_escape(k), py_escape(v)));
                }
                s.push('}');
            }
            if let Some(body) = &req.body {
                if is_json && body_json.is_some() {
                    s.push_str(&format!(", json=json.loads({})", py_string_literal(body)));
                } else {
                    s.push_str(&format!(", data={}", py_string_literal(body)));
                }
            }
            s.push_str(")\nprint(response.json())");
            s
        }
        CurlTarget::Go => {
            let mut s = format!(
                "package main\n\nimport (\n\t\"bytes\"\n\t\"fmt\"\n\t\"net/http\"\n)\n\nfunc main() {{\n\tbody := []byte(`{}`)\n\treq, _ := http.NewRequest(\"{}\", \"{}\", bytes.NewBuffer(body))\n",
                req.body.as_deref().unwrap_or(""),
                req.method,
                req.url
            );
            for (k, v) in &req.headers {
                s.push_str(&format!("\treq.Header.Set(\"{}\", \"{}\")\n", k, v));
            }
            s.push_str("\tclient := &http.Client{}\n\tresp, _ := client.Do(req)\n\tdefer resp.Body.Close()\n\tfmt.Println(resp.Status)\n}");
            s
        }
        CurlTarget::Rust => {
            let mut s = format!(
                "use reqwest;\n\n#[tokio::main]\nasync fn main() -> Result<(), reqwest::Error> {{\n    let client = reqwest::Client::new();\n    let response = client\n        .request(reqwest::Method::{}, \"{}\")",
                req.method.to_uppercase(),
                req.url
            );
            if let Some(body) = &req.body {
                s.push_str(&format!("\n        .body(r#\"{body}\"#.to_string())"));
            }
            s.push_str("\n        .send()\n        .await?;\n    println!(\"{{:?}}\", response.text().await?);\n    Ok(())\n}");
            s
        }
    }
}

fn js_escape(s: &str) -> String {
    let mut out = String::with_capacity(s.len() + 2);
    for ch in s.chars() {
        match ch {
            '\\' => out.push_str("\\\\"),
            '\'' => out.push_str("\\'"),
            '\n' => out.push_str("\\n"),
            '\r' => out.push_str("\\r"),
            '\t' => out.push_str("\\t"),
            c => out.push(c),
        }
    }
    out
}

fn py_escape(s: &str) -> String {
    let mut out = String::with_capacity(s.len() + 2);
    for ch in s.chars() {
        match ch {
            '\\' => out.push_str("\\\\"),
            '\'' => out.push_str("\\'"),
            '\n' => out.push_str("\\n"),
            '\r' => out.push_str("\\r"),
            '\t' => out.push_str("\\t"),
            c => out.push(c),
        }
    }
    out
}

fn py_string_literal(s: &str) -> String {
    format!("'{}'", py_escape(s))
}

fn tokenize_curl(input: &str) -> Vec<String> {
    let mut tokens = Vec::new();
    let mut current = String::new();
    let mut in_quote: Option<char> = None;
    for ch in input.chars() {
        match (in_quote, ch) {
            (Some(q), c) if c == q => {
                in_quote = None;
                tokens.push(current.clone());
                current.clear();
            }
            (None, '\'') | (None, '"') => {
                if !current.is_empty() {
                    tokens.push(current.trim().to_string());
                    current.clear();
                }
                in_quote = Some(ch);
            }
            (None, ' ') | (None, '\n') | (None, '\t') => {
                if !current.is_empty() {
                    tokens.push(current.trim().to_string());
                    current.clear();
                }
            }
            (_, c) => current.push(c),
        }
    }
    if !current.is_empty() {
        tokens.push(current.trim().to_string());
    }
    tokens
}
