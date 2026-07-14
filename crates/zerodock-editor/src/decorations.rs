//! # Diagnostics, Highlights & Decorations Module
//!
//! Architecture Documentation:
//! Manages rich decorations such as compiler diagnostics, bookmarks, search match highlights,
//! inline parameter hints, and code lenses across the buffer.
//!
//! Invariants:
//! - All decoration spans reference character indices within buffer limits.
//! - Queries for overlapping decorations return items strictly intersecting the requested span.

use std::ops::Range;

/// Severity level for code diagnostics.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub enum DiagnosticSeverity {
    /// Fatal error or syntax violation.
    Error,
    /// Compiler or linter warning.
    Warning,
    /// Informational message.
    Information,
    /// Stylistic or hint feedback.
    Hint,
}

/// Category of decoration attached to a character range or line.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum DecorationKind {
    /// Diagnostic underline or gutter highlight.
    Diagnostic(DiagnosticSeverity),
    /// Search result highlight.
    SearchMatch,
    /// Line bookmark indicator.
    Bookmark {
        /// 0-indexed line where bookmark is attached.
        line: usize,
    },
    /// Virtual inline hint label.
    InlineHint {
        /// Display text.
        label: String,
    },
    /// Actionable code lens above a function/symbol.
    CodeLens {
        /// Display text.
        title: String,
        /// Command identifier executed when clicked.
        command_id: String,
    },
}

/// An active decoration span within the document buffer.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Decoration {
    /// Character range spanned by this decoration.
    pub span: Range<usize>,
    /// Specific decoration payload.
    pub kind: DecorationKind,
    /// Optional tooltip message.
    pub message: Option<String>,
}

impl Decoration {
    /// Construct a new decoration.
    pub fn new(span: Range<usize>, kind: DecorationKind, message: Option<String>) -> Self {
        Self {
            span,
            kind,
            message,
        }
    }

    /// Check if this decoration overlaps the given range.
    pub fn overlaps(&self, range: &Range<usize>) -> bool {
        self.span.start < range.end && range.start < self.span.end
    }
}

/// Container for all active decorations within a document.
#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct DecorationManager {
    decorations: Vec<Decoration>,
}

impl DecorationManager {
    /// Construct an empty decoration manager.
    pub fn new() -> Self {
        Self {
            decorations: Vec::new(),
        }
    }

    /// Add a decoration to the document.
    pub fn add(&mut self, decoration: Decoration) {
        self.decorations.push(decoration);
    }

    /// Clear all active decorations of a specific kind predicate.
    pub fn clear_search_matches(&mut self) {
        self.decorations.retain(|d| !matches!(d.kind, DecorationKind::SearchMatch));
    }

    /// Clear all active diagnostics.
    pub fn clear_diagnostics(&mut self) {
        self.decorations.retain(|d| !matches!(d.kind, DecorationKind::Diagnostic(_)));
    }

    /// Return all decorations overlapping a specific character span.
    pub fn find_overlapping(&self, span: Range<usize>) -> Vec<&Decoration> {
        self.decorations
            .iter()
            .filter(|d| d.overlaps(&span))
            .collect()
    }

    /// Toggle a line bookmark decoration on a given line and character range.
    pub fn toggle_bookmark(&mut self, line: usize, line_span: Range<usize>) -> bool {
        if let Some(pos) = self
            .decorations
            .iter()
            .position(|d| matches!(d.kind, DecorationKind::Bookmark { line: l } if l == line))
        {
            self.decorations.remove(pos);
            false
        } else {
            self.decorations.push(Decoration::new(
                line_span,
                DecorationKind::Bookmark { line },
                None,
            ));
            true
        }
    }

    /// Return all bookmarked line numbers sorted in ascending order.
    pub fn bookmarked_lines(&self) -> Vec<usize> {
        let mut lines: Vec<usize> = self
            .decorations
            .iter()
            .filter_map(|d| match d.kind {
                DecorationKind::Bookmark { line } => Some(line),
                _ => None,
            })
            .collect();
        lines.sort_unstable();
        lines.dedup();
        lines
    }

    /// Return full slice of all decorations.
    pub fn as_slice(&self) -> &[Decoration] {
        &self.decorations
    }
}
