use regex::Regex;

#[derive(Debug, Clone, PartialEq)]
pub struct RegexMatch {
    pub full_match: String,
    pub start: usize,
    pub end: usize,
    pub groups: Vec<String>,
}

pub fn test_regex(pattern: &str, text: &str, flags: &str) -> crate::Result<Vec<RegexMatch>> {
    let mut builder = regex::RegexBuilder::new(pattern);
    if flags.contains('i') {
        builder.case_insensitive(true);
    }
    if flags.contains('m') {
        builder.multi_line(true);
    }
    if flags.contains('s') {
        builder.dot_matches_new_line(true);
    }
    let re = builder.build()?;

    let mut matches = Vec::new();
    for m in re.find_iter(text) {
        let full = m.as_str().to_string();
        // Capture against the full text at the match start so that lookbehind,
        // `^`/`$` anchors, and `\b` resolve correctly. Capturing only the
        // matched substring breaks patterns that depend on surrounding context.
        let caps = re.captures_at(text, m.start());
        let groups = caps
            .map(|c| {
                c.iter()
                    .skip(1)
                    .filter_map(|g| g.map(|mg| mg.as_str().to_string()))
                    .collect()
            })
            .unwrap_or_default();
        matches.push(RegexMatch {
            full_match: full,
            start: m.start(),
            end: m.end(),
            groups,
        });
    }
    Ok(matches)
}

pub fn validate_regex(pattern: &str) -> crate::Result<()> {
    Regex::new(pattern).map(|_| ()).map_err(Into::into)
}
