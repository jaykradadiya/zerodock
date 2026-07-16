use syntect::easy::HighlightLines;
use syntect::highlighting::{Style, ThemeSet};
use syntect::parsing::SyntaxSet;
use syntect::util::LinesWithEndings;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum EditorLanguage {
    Plain,
    Json,
    Yaml,
    Shell,
}

impl EditorLanguage {
    pub fn syntect_name(self) -> &'static str {
        match self {
            Self::Plain => "Plain Text",
            Self::Json => "JSON",
            Self::Yaml => "YAML",
            Self::Shell => "Bash",
        }
    }
}

fn syntax_set() -> &'static SyntaxSet {
    static SET: std::sync::OnceLock<SyntaxSet> = std::sync::OnceLock::new();
    SET.get_or_init(SyntaxSet::load_defaults_newlines)
}

fn theme_set() -> &'static ThemeSet {
    static SET: std::sync::OnceLock<ThemeSet> = std::sync::OnceLock::new();
    SET.get_or_init(ThemeSet::load_defaults)
}

/// Highlight source to HTML spans for overlay rendering.
pub fn highlight_to_html(source: &str, language: EditorLanguage) -> String {
    if source.is_empty() {
        return String::new();
    }
    // For large files (>300KB), skip expensive syntect highlighting to prevent UI hang
    if source.len() > 300_000 {
        return html_escape(source);
    }

    // JSON's grammar lets us reliably distinguish property names from string
    // values, unlike the generic scopes supplied by the bundled theme.
    if language == EditorLanguage::Json {
        return highlight_json(source);
    }

    let ps = syntax_set();
    let ts = theme_set();
    let syntax = ps
        .find_syntax_by_name(language.syntect_name())
        .or_else(|| ps.find_syntax_by_extension("json"))
        .unwrap_or_else(|| ps.find_syntax_plain_text());
    let theme = &ts.themes["base16-ocean.dark"];

    let mut highlighter = HighlightLines::new(syntax, theme);
    let mut html = String::with_capacity(source.len() + source.len() / 4);

    for line in LinesWithEndings::from(source) {
        let regions = match highlighter.highlight_line(line, ps) {
            Ok(r) => r,
            Err(_) => {
                // Don't drop the line: append it raw-escaped so the overlay
                // stays aligned with the textarea instead of silently skipping.
                html.push_str(&html_escape(line));
                continue;
            }
        };
        for (style, text) in regions {
            append_styled(&mut html, style, text);
        }
    }

    if source.ends_with('\n') {
        html.push_str("\u{200b}");
    }

    html
}

fn highlight_json(source: &str) -> String {
    let mut out = String::with_capacity(source.len() + source.len() / 3);
    let bytes = source.as_bytes();
    let mut index = 0;

    while index < bytes.len() {
        match bytes[index] {
            b'"' => {
                let start = index;
                index += 1;
                let mut escaped = false;
                while index < bytes.len() {
                    match bytes[index] {
                        b'\\' if !escaped => escaped = true,
                        b'"' if !escaped => { index += 1; break; }
                        _ => escaped = false,
                    }
                    index += 1;
                }
                let mut after = index;
                while after < bytes.len() && bytes[after].is_ascii_whitespace() { after += 1; }
                let class = if bytes.get(after) == Some(&b':') {
                    "zd-code-token-key"
                } else {
                    "zd-code-token-string"
                };
                append_classed(&mut out, class, &source[start..index]);
            }
            b'-' | b'0'..=b'9' => {
                let start = index;
                index += 1;
                while index < bytes.len()
                    && matches!(bytes[index], b'0'..=b'9' | b'.' | b'e' | b'E' | b'+' | b'-')
                { index += 1; }
                append_classed(&mut out, "zd-code-token-number", &source[start..index]);
            }
            _ if source[index..].starts_with("true") => {
                append_classed(&mut out, "zd-code-token-literal", "true"); index += 4;
            }
            _ if source[index..].starts_with("false") => {
                append_classed(&mut out, "zd-code-token-literal", "false"); index += 5;
            }
            _ if source[index..].starts_with("null") => {
                append_classed(&mut out, "zd-code-token-literal", "null"); index += 4;
            }
            _ => {
                let ch = source[index..].chars().next().expect("valid UTF-8 source");
                out.push_str(&html_escape(&source[index..index + ch.len_utf8()]));
                index += ch.len_utf8();
            }
        }
    }
    out
}

fn append_classed(out: &mut String, class: &str, text: &str) {
    out.push_str("<span class=\"");
    out.push_str(class);
    out.push_str("\">");
    out.push_str(&html_escape(text));
    out.push_str("</span>");
}

fn append_styled(out: &mut String, style: Style, text: &str) {
    let escaped = html_escape(text);
    if style.foreground.r == 0 && style.foreground.g == 0 && style.foreground.b == 0 && style.font_style.bits() == 0 {
        out.push_str(&escaped);
        return;
    }
    // Syntect's bundled theme is dark-only. Emitting its RGB values inline made
    // the editor retain low-contrast dark-theme ink after switching to light
    // mode. Keep Syntect for tokenization, but expose its palette as CSS classes
    // so the active application theme owns the final color.
    let class = token_class(style);
    append_classed(out, class, text);
}

fn token_class(style: Style) -> &'static str {
    let color = style.foreground;
    match (color.r, color.g, color.b) {
        // base16-ocean.dark accent palette used by Syntect
        (0xa3, 0xbe, 0x8c) => "zd-code-token-string",
        (0xd0, 0x87, 0x70) => "zd-code-token-number",
        (0xbf, 0x61, 0x6a) => "zd-code-token-error",
        (0xeb, 0xcb, 0x8b) => "zd-code-token-warning",
        (0x96, 0xb5, 0xb4) => "zd-code-token-info",
        (0x8f, 0xa1, 0xb3) => "zd-code-token-key",
        (0xb4, 0x8e, 0xad) => "zd-code-token-meta",
        // Base foregrounds remain readable app text rather than inheriting
        // the pale foreground of the dark Syntect theme.
        _ => "zd-code-token-default",
    }
}

fn html_escape(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    for ch in s.chars() {
        match ch {
            '&' => out.push_str("&amp;"),
            '<' => out.push_str("&lt;"),
            '>' => out.push_str("&gt;"),
            '"' => out.push_str("&quot;"),
            '\'' => out.push_str("&#39;"),
            _ => out.push(ch),
        }
    }
    out
}

/// Line count for gutter.
pub fn line_count(source: &str) -> usize {
    if source.is_empty() {
        1
    } else {
        source.split('\n').count()
    }
}

/// Find start -> end line numbers (1-indexed) for collapsible blocks ({...} and [...]).
pub fn find_collapsible_blocks(source: &str) -> std::collections::HashMap<usize, usize> {
    let mut blocks = std::collections::HashMap::new();
    let mut stack: Vec<(char, usize)> = Vec::new();
    let mut in_string = false;
    let mut escape = false;

    for (line_idx, line) in source.split('\n').enumerate() {
        let line_num = line_idx + 1;
        for ch in line.chars() {
            if escape {
                escape = false;
                continue;
            }
            if ch == '\\' && in_string {
                escape = true;
                continue;
            }
            if ch == '"' {
                in_string = !in_string;
                continue;
            }
            if in_string {
                continue;
            }
            match ch {
                '{' | '[' => stack.push((ch, line_num)),
                '}' => {
                    if let Some(idx) = stack.iter().rposition(|&(c, _)| c == '{') {
                        let (_, start_line) = stack.remove(idx);
                        if line_num > start_line {
                            blocks
                                .entry(start_line)
                                .and_modify(|e: &mut usize| *e = (*e).max(line_num))
                                .or_insert(line_num);
                        }
                    }
                }
                ']' => {
                    if let Some(idx) = stack.iter().rposition(|&(c, _)| c == '[') {
                        let (_, start_line) = stack.remove(idx);
                        if line_num > start_line {
                            blocks
                                .entry(start_line)
                                .and_modify(|e: &mut usize| *e = (*e).max(line_num))
                                .or_insert(line_num);
                        }
                    }
                }
                _ => {}
            }
        }
    }
    blocks
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn highlights_json_braces() {
        let html = highlight_to_html(r#"{"a":"value","count":1,"ok":true,"none":null}"#, EditorLanguage::Json);
        assert!(html.contains("zd-code-token-key"));
        assert!(html.contains("zd-code-token-string"));
        assert!(html.contains("zd-code-token-number"));
        assert!(html.contains("zd-code-token-literal"));
        assert!(!html.contains("style=\"color:"));
    }

    #[test]
    fn line_count_empty_is_one() {
        assert_eq!(line_count(""), 1);
    }

    #[test]
    fn line_count_counts_all_split_lines() {
        assert_eq!(line_count("hello\nworld\n"), 3);
    }
}
