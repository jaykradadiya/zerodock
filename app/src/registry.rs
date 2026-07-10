use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ToolTier {
    Featured,
    Standard,
}

#[derive(Debug, Clone, PartialEq)]
pub struct ToolDef {
    pub id: &'static str,
    pub name: &'static str,
    pub category: &'static str,
    pub route: &'static str,
    pub description: &'static str,
    pub tier: ToolTier,
    pub hidden_from_browse: bool,
    pub hub_parent: Option<&'static str>,
    pub hub_tab: Option<&'static str>,
}

pub const TOOLS: &[ToolDef] = &[
    ToolDef { id: "json-toolkit", name: "JSON Toolkit", category: "Data", route: "/json-toolkit", description: "Format, validate, and explore JSON.", tier: ToolTier::Featured, hidden_from_browse: false, hub_parent: None, hub_tab: None },
    ToolDef { id: "http", name: "HTTP Workshop", category: "Network", route: "/http", description: "Test REST APIs and convert cURL.", tier: ToolTier::Featured, hidden_from_browse: false, hub_parent: None, hub_tab: None },
    ToolDef { id: "encode-decode", name: "Encode / Decode", category: "Encoding", route: "/encode-decode", description: "Base64 and URL encoding.", tier: ToolTier::Featured, hidden_from_browse: false, hub_parent: None, hub_tab: None },
    ToolDef { id: "security", name: "Security Suite", category: "Security", route: "/security", description: "Hash, JWT, and RSA tools.", tier: ToolTier::Featured, hidden_from_browse: false, hub_parent: None, hub_tab: None },
    ToolDef { id: "diff-checker", name: "Text Diff Checker", category: "Text", route: "/diff-checker", description: "Compare text side-by-side.", tier: ToolTier::Featured, hidden_from_browse: false, hub_parent: None, hub_tab: None },
    ToolDef { id: "epoch-converter", name: "Epoch Converter", category: "Converters", route: "/epoch-converter", description: "Convert Unix timestamps.", tier: ToolTier::Featured, hidden_from_browse: false, hub_parent: None, hub_tab: None },
    ToolDef { id: "regex-tester", name: "Regex Tester", category: "Text", route: "/regex-tester", description: "Test regular expressions.", tier: ToolTier::Featured, hidden_from_browse: false, hub_parent: None, hub_tab: None },
    ToolDef { id: "mock-data-generator", name: "Mock Data Generator", category: "Generators", route: "/mock-data-generator", description: "Generate mock JSON data.", tier: ToolTier::Standard, hidden_from_browse: false, hub_parent: None, hub_tab: None },
    ToolDef { id: "token-counter", name: "LLM Token Counter", category: "Text", route: "/token-counter", description: "Count GPT tokens.", tier: ToolTier::Standard, hidden_from_browse: false, hub_parent: None, hub_tab: None },
    ToolDef { id: "yaml-json-converter", name: "YAML ↔ JSON", category: "Data", route: "/yaml-json-converter", description: "Convert YAML and JSON.", tier: ToolTier::Standard, hidden_from_browse: true, hub_parent: Some("json-toolkit"), hub_tab: Some("yaml") },
    ToolDef { id: "json-type-converter", name: "JSON to Types", category: "Data", route: "/json-type-converter", description: "Generate types from JSON.", tier: ToolTier::Standard, hidden_from_browse: true, hub_parent: Some("json-toolkit"), hub_tab: Some("types") },
    ToolDef { id: "json-path", name: "JSON Path", category: "Data", route: "/json-path", description: "Query JSON with JMESPath.", tier: ToolTier::Standard, hidden_from_browse: true, hub_parent: Some("json-toolkit"), hub_tab: Some("path") },
    ToolDef { id: "api-tester", name: "API Tester", category: "Network", route: "/api-tester", description: "HTTP API testing.", tier: ToolTier::Standard, hidden_from_browse: true, hub_parent: Some("http"), hub_tab: Some("api") },
    ToolDef { id: "curl-converter", name: "cURL Converter", category: "Network", route: "/curl-converter", description: "Convert cURL to code.", tier: ToolTier::Standard, hidden_from_browse: true, hub_parent: Some("http"), hub_tab: Some("curl") },
    ToolDef { id: "base64-codec", name: "Base64 Codec", category: "Encoding", route: "/base64-codec", description: "Base64 encode/decode.", tier: ToolTier::Standard, hidden_from_browse: true, hub_parent: Some("encode-decode"), hub_tab: Some("base64") },
    ToolDef { id: "url-encoder", name: "URL Encoder", category: "Encoding", route: "/url-encoder", description: "URL encode/decode.", tier: ToolTier::Standard, hidden_from_browse: true, hub_parent: Some("encode-decode"), hub_tab: Some("url") },
    ToolDef { id: "hash-generator", name: "Hash Generator", category: "Security", route: "/hash-generator", description: "Cryptographic hashes.", tier: ToolTier::Standard, hidden_from_browse: true, hub_parent: Some("security"), hub_tab: Some("hash") },
    ToolDef { id: "jwt-decoder", name: "JWT Decoder", category: "Security", route: "/jwt-decoder", description: "Decode JWT tokens.", tier: ToolTier::Standard, hidden_from_browse: true, hub_parent: Some("security"), hub_tab: Some("jwt") },
    ToolDef { id: "rsa-generator", name: "RSA Generator", category: "Security", route: "/rsa-generator", description: "Generate RSA keys.", tier: ToolTier::Standard, hidden_from_browse: true, hub_parent: Some("security"), hub_tab: Some("rsa") },
];

pub fn find_tool(id: &str) -> Option<&'static ToolDef> {
    TOOLS.iter().find(|t| t.id == id)
}

pub fn browse_tools() -> impl Iterator<Item = &'static ToolDef> {
    TOOLS.iter().filter(|t| !t.hidden_from_browse)
}

pub fn all_tools() -> impl Iterator<Item = &'static ToolDef> {
    TOOLS.iter()
}

pub fn find_tool_by_route(route: &str) -> Option<&'static ToolDef> {
    TOOLS.iter().find(|t| t.route == route)
}

pub fn tool_for_hub_tab(hub_id: &str, tab: &str) -> Option<&'static ToolDef> {
    TOOLS.iter().find(|t| {
        t.hub_parent == Some(hub_id) && t.hub_tab == Some(tab)
    })
}

pub fn hub_tab_label(hub_id: &str, tab: &str) -> Option<(&'static str, &'static str)> {
    tool_for_hub_tab(hub_id, tab).map(|t| (t.name, t.description))
}

pub const CATEGORIES: &[&str] = &[
    "Data",
    "Network",
    "Encoding",
    "Security",
    "Text",
    "Converters",
    "Generators",
];

pub fn hub_children(hub_id: &str) -> Vec<&'static ToolDef> {
    TOOLS
        .iter()
        .filter(|t| t.hub_parent == Some(hub_id))
        .collect()
}

pub fn tools_in_category(category: &str) -> Vec<&'static ToolDef> {
    browse_tools()
        .filter(|t| t.category == category)
        .collect()
}

pub fn search_tools(query: &str) -> Vec<(&'static ToolDef, Option<&'static str>)> {
    let q = query.to_lowercase();
    if q.is_empty() {
        return browse_tools().map(|t| (t, None)).collect();
    }
    let mut results = Vec::new();
    for tool in browse_tools() {
        if tool.name.to_lowercase().contains(&q)
            || tool.category.to_lowercase().contains(&q)
            || tool.description.to_lowercase().contains(&q)
        {
            results.push((tool, None));
        }
        for child in hub_children(tool.id) {
            if child.name.to_lowercase().contains(&q)
                || child.description.to_lowercase().contains(&q)
            {
                results.push((child, Some(tool.name)));
            }
        }
    }
    results
}
