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
