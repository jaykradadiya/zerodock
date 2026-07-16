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
    ToolDef { id: "json-toolkit", name: "JSON & Data Studio", category: "Data", route: "/json-toolkit", description: "Format, repair, convert YAML & Types, and query live JMESPath.", tier: ToolTier::Featured, hidden_from_browse: false, hub_parent: None, hub_tab: None },
    ToolDef { id: "encode-decode", name: "Inspect & Codec Studio", category: "Encoding", route: "/encode-decode", description: "Base64, URL encoding/decoding, and JWT token inspection.", tier: ToolTier::Featured, hidden_from_browse: false, hub_parent: None, hub_tab: None },
    ToolDef { id: "security", name: "Hash & Crypto Studio", category: "Security", route: "/security", description: "Cryptographic hash generation (MD5, SHA-1, SHA-256, SHA-512).", tier: ToolTier::Featured, hidden_from_browse: false, hub_parent: None, hub_tab: None },
    ToolDef { id: "diff-checker", name: "Text Diff Checker", category: "Text", route: "/diff-checker", description: "Compare text side-by-side.", tier: ToolTier::Featured, hidden_from_browse: false, hub_parent: None, hub_tab: None },
    ToolDef { id: "epoch-converter", name: "Epoch Converter", category: "Converters", route: "/epoch-converter", description: "Convert Unix timestamps.", tier: ToolTier::Featured, hidden_from_browse: false, hub_parent: None, hub_tab: None },
    ToolDef { id: "regex-tester", name: "Regex Tester", category: "Text", route: "/regex-tester", description: "Test regular expressions.", tier: ToolTier::Featured, hidden_from_browse: false, hub_parent: None, hub_tab: None },
];

pub fn find_tool(id: &str) -> Option<&'static ToolDef> {
    TOOLS.iter().find(|t| t.id == id)
}

pub fn browse_tools() -> impl Iterator<Item = &'static ToolDef> {
    TOOLS.iter().filter(|t| !t.hidden_from_browse)
}

#[allow(dead_code)]
pub fn all_tools() -> impl Iterator<Item = &'static ToolDef> {
    TOOLS.iter()
}

#[allow(dead_code)]
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

#[allow(dead_code)]
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
    }
    results
}
