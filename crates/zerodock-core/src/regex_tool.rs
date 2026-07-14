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

#[derive(Debug, Clone, PartialEq)]
pub struct RegexAstNode {
    pub depth: usize,
    pub snippet: String,
    pub explanation: String,
}

pub fn explain_regex_ast(pattern: &str) -> crate::Result<Vec<RegexAstNode>> {
    use regex_syntax::ast::parse::Parser;
    let mut parser = Parser::new();
    let ast = parser.parse(pattern).map_err(|e| crate::error::CoreError::Message(format!("Regex AST parse error: {}", e)))?;
    let mut nodes = Vec::new();
    walk_ast(&ast, pattern, 0, &mut nodes);
    Ok(nodes)
}

fn span_slice<'a>(pattern: &'a str, span: &regex_syntax::ast::Span) -> &'a str {
    let start = span.start.offset;
    let end = span.end.offset;
    if start <= end && end <= pattern.len() {
        &pattern[start..end]
    } else {
        pattern
    }
}

fn walk_ast(ast: &regex_syntax::ast::Ast, pattern: &str, depth: usize, out: &mut Vec<RegexAstNode>) {
    use regex_syntax::ast::*;
    match ast {
        Ast::Empty(_) => {}
        Ast::Flags(f) => {
            out.push(RegexAstNode {
                depth,
                snippet: span_slice(pattern, &f.span).to_string(),
                explanation: format!("Set inline flags: {:?}", f.flags),
            });
        }
        Ast::Literal(lit) => {
            let ch = lit.c;
            let expl = match ch {
                ' ' => "Literal space character".to_string(),
                '\t' => "Literal tab character".to_string(),
                '\n' => "Literal newline character".to_string(),
                '\r' => "Literal carriage return".to_string(),
                _ => format!("Literal character '{}'", ch),
            };
            out.push(RegexAstNode {
                depth,
                snippet: lit.c.to_string(),
                explanation: expl,
            });
        }
        Ast::Dot(_) => {
            out.push(RegexAstNode {
                depth,
                snippet: ".".to_string(),
                explanation: "Any single character (except newline unless 's' flag is set)".to_string(),
            });
        }
        Ast::Assertion(a) => {
            let (snip, expl) = match &a.kind {
                AssertionKind::StartLine => ("^", "Start of line (or start of string)"),
                AssertionKind::EndLine => ("$", "End of line (or end of string)"),
                AssertionKind::StartText => ("\\A", "Start of string"),
                AssertionKind::EndText => ("\\z", "End of string"),
                AssertionKind::WordBoundary => ("\\b", "Word boundary (transition between word/non-word)"),
                AssertionKind::NotWordBoundary => ("\\B", "Not a word boundary"),
                _ => ("?", "Zero-width assertion"),
            };
            out.push(RegexAstNode {
                depth,
                snippet: snip.to_string(),
                explanation: expl.to_string(),
            });
        }
        Ast::ClassUnicode(cls) => {
            let kind = match &cls.kind {
                ClassUnicodeKind::OneLetter(c) => format!("\\p{{{}}}", c),
                ClassUnicodeKind::Named(n) => format!("\\p{{{}}}", n),
                ClassUnicodeKind::NamedValue { name, value, .. } => format!("\\p{}={}{}", name, value, ""),
            };
            let expl = if cls.negated {
                format!("Unicode property (negated): {}", kind)
            } else {
                format!("Unicode property: {}", kind)
            };
            out.push(RegexAstNode {
                depth,
                snippet: kind,
                explanation: expl,
            });
        }
        Ast::ClassPerl(cls) => {
            let (snip, expl) = match cls.kind {
                ClassPerlKind::Digit => (if cls.negated { "\\D" } else { "\\d" }, if cls.negated { "Any non-digit character" } else { "Any digit (0-9)" }),
                ClassPerlKind::Space => (if cls.negated { "\\S" } else { "\\s" }, if cls.negated { "Any non-whitespace character" } else { "Any whitespace character" }),
                ClassPerlKind::Word => (if cls.negated { "\\W" } else { "\\w" }, if cls.negated { "Any non-word character" } else { "Any word character (letter, digit, or underscore)" }),
            };
            out.push(RegexAstNode {
                depth,
                snippet: snip.to_string(),
                explanation: expl.to_string(),
            });
        }
        Ast::ClassBracketed(cls) => {
            let snip = if cls.negated { "[^...]" } else { "[...]" };
            let expl = if cls.negated { "Any character NOT in the following set:" } else { "Any single character matching one of the following:" };
            out.push(RegexAstNode {
                depth,
                snippet: snip.to_string(),
                explanation: expl.to_string(),
            });
            walk_class_set(&cls.kind, pattern, depth + 1, out);
        }
        Ast::Repetition(rep) => {
            let (op_snip, op_expl) = match &rep.op.kind {
                RepetitionKind::ZeroOrOne => ("?".to_string(), "Optional (zero or one time)".to_string()),
                RepetitionKind::ZeroOrMore => ("*".to_string(), "Zero or more times".to_string()),
                RepetitionKind::OneOrMore => ("+".to_string(), "One or more times".to_string()),
                RepetitionKind::Range(RepetitionRange::Exactly(n)) => (format!("{{{n}}}"), format!("Exactly {n} time(s)")),
                RepetitionKind::Range(RepetitionRange::AtLeast(n)) => (format!("{{{n},}}"), format!("At least {n} time(s)")),
                RepetitionKind::Range(RepetitionRange::Bounded(n, m)) => (format!("{{{n},{m}}}"), format!("Between {n} and {m} times")),
            };
            let greedy_str = if rep.greedy { " (greedy)" } else { " (lazy)" };
            out.push(RegexAstNode {
                depth,
                snippet: op_snip,
                explanation: format!("Repeat the following item: {}{}", op_expl, greedy_str),
            });
            walk_ast(&rep.ast, pattern, depth + 1, out);
        }
        Ast::Group(grp) => {
            let (snip, expl) = match &grp.kind {
                GroupKind::CaptureIndex(idx) => (format!("(Group #{idx})"), format!("Capturing group #{idx}")),
                GroupKind::CaptureName { name, .. } => (format!("(?P<{}>...)", name.name), format!("Named capturing group '{}'", name.name)),
                GroupKind::NonCapturing(_) => ("(?:...)".to_string(), "Non-capturing group".to_string()),
            };
            out.push(RegexAstNode {
                depth,
                snippet: snip,
                explanation: expl,
            });
            walk_ast(&grp.ast, pattern, depth + 1, out);
        }
        Ast::Concat(concat) => {
            for child in &concat.asts {
                walk_ast(child, pattern, depth, out);
            }
        }
        Ast::Alternation(alt) => {
            out.push(RegexAstNode {
                depth,
                snippet: "|".to_string(),
                explanation: "Alternation: match ONE of the following branches:".to_string(),
            });
            for (idx, branch) in alt.asts.iter().enumerate() {
                out.push(RegexAstNode {
                    depth: depth + 1,
                    snippet: format!("Branch #{}", idx + 1),
                    explanation: format!("Option {}:", idx + 1),
                });
                walk_ast(branch, pattern, depth + 2, out);
            }
        }
    }
}

fn walk_class_set(set: &regex_syntax::ast::ClassSet, pattern: &str, depth: usize, out: &mut Vec<RegexAstNode>) {
    use regex_syntax::ast::*;
    match set {
        ClassSet::Item(item) => walk_class_set_item(item, pattern, depth, out),
        ClassSet::BinaryOp(op) => {
            out.push(RegexAstNode {
                depth,
                snippet: match op.kind {
                    ClassSetBinaryOpKind::Intersection => "&&".to_string(),
                    ClassSetBinaryOpKind::Difference => "--".to_string(),
                    ClassSetBinaryOpKind::SymmetricDifference => "~~".to_string(),
                },
                explanation: "Character class binary operation".to_string(),
            });
            walk_class_set(&op.lhs, pattern, depth + 1, out);
            walk_class_set(&op.rhs, pattern, depth + 1, out);
        }
    }
}

fn walk_class_set_item(item: &regex_syntax::ast::ClassSetItem, pattern: &str, depth: usize, out: &mut Vec<RegexAstNode>) {
    use regex_syntax::ast::*;
    match item {
        ClassSetItem::Empty(_) => {}
        ClassSetItem::Literal(lit) => {
            out.push(RegexAstNode {
                depth,
                snippet: lit.c.to_string(),
                explanation: format!("Literal character '{}'", lit.c),
            });
        }
        ClassSetItem::Range(r) => {
            out.push(RegexAstNode {
                depth,
                snippet: format!("{}-{}", r.start.c, r.end.c),
                explanation: format!("Character range from '{}' to '{}'", r.start.c, r.end.c),
            });
        }
        ClassSetItem::Ascii(ascii) => {
            out.push(RegexAstNode {
                depth,
                snippet: format!("[:{:?}:]", ascii.kind),
                explanation: format!("ASCII character class: {:?}", ascii.kind),
            });
        }
        ClassSetItem::Unicode(cls) => {
            let kind = match &cls.kind {
                ClassUnicodeKind::OneLetter(c) => format!("\\p{{{}}}", c),
                ClassUnicodeKind::Named(n) => format!("\\p{{{}}}", n),
                ClassUnicodeKind::NamedValue { name, value, .. } => format!("\\p{}={}{}", name, value, ""),
            };
            out.push(RegexAstNode {
                depth,
                snippet: kind,
                explanation: "Unicode property inside character class".to_string(),
            });
        }
        ClassSetItem::Perl(cls) => {
            let (snip, expl) = match cls.kind {
                ClassPerlKind::Digit => (if cls.negated { "\\D" } else { "\\d" }, if cls.negated { "Any non-digit character" } else { "Any digit (0-9)" }),
                ClassPerlKind::Space => (if cls.negated { "\\S" } else { "\\s" }, if cls.negated { "Any non-whitespace character" } else { "Any whitespace character" }),
                ClassPerlKind::Word => (if cls.negated { "\\W" } else { "\\w" }, if cls.negated { "Any non-word character" } else { "Any word character (letter, digit, or underscore)" }),
            };
            out.push(RegexAstNode {
                depth,
                snippet: snip.to_string(),
                explanation: expl.to_string(),
            });
        }
        ClassSetItem::Bracketed(cls) => {
            walk_class_set(&cls.kind, pattern, depth, out);
        }
        ClassSetItem::Union(union) => {
            for child in &union.items {
                walk_class_set_item(child, pattern, depth, out);
            }
        }
    }
}
