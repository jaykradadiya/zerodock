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

    html
}

fn append_styled(out: &mut String, style: Style, text: &str) {
    let escaped = html_escape(text);
    if style.foreground.r == 0 && style.foreground.g == 0 && style.foreground.b == 0 && style.font_style.bits() == 0 {
        out.push_str(&escaped);
        return;
    }
    let fg = style.foreground;
    out.push_str(&format!(
        "<span style=\"color:#{:02x}{:02x}{:02x}\">",
        fg.r, fg.g, fg.b
    ));
    out.push_str(&escaped);
    out.push_str("</span>");
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
        let html = highlight_to_html(r#"{"a":1}"#, EditorLanguage::Json);
        assert!(html.contains("span"));
    }

    #[test]
    fn line_count_empty_is_one() {
        assert_eq!(line_count(""), 1);
    }
}
