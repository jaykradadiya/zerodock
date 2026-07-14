//! # Viewport & Incremental Rendering Snapshot Module
//!
//! Architecture Documentation:
//! Separates editing logic from layout and painting. The `Viewport` specifies the visible window and overscan margin.
//! `RenderSnapshot` extracts only the visible lines, cursor screen coordinates, selections, and overlapping decorations,
//! ensuring memory efficiency even for gigabyte-sized documents.
//!
//! Invariants:
//! - Only lines within `[first_line - overscan, first_line + visible_line_count + overscan]` are extracted.
//! - No full-buffer cloning occurs during snapshot generation.

use std::ops::Range;
use crate::decorations::Decoration;

/// Defines the visible viewing area within a document.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Viewport {
    /// 0-indexed top visible line.
    pub first_line: usize,
    /// Number of lines that fit vertically inside the UI viewport.
    pub visible_line_count: usize,
    /// Number of overscan lines rendered above and below the visible viewport for smooth scrolling.
    pub overscan: usize,
    /// Horizontal scroll offset.
    pub scroll_x: usize,
}

impl Viewport {
    /// Construct a new viewport configuration.
    pub fn new(first_line: usize, visible_line_count: usize, overscan: usize) -> Self {
        Self {
            first_line,
            visible_line_count,
            overscan,
            scroll_x: 0,
        }
    }

    /// Compute the clamped range of 0-indexed buffer lines to render.
    pub fn line_range(&self, total_lines: usize) -> Range<usize> {
        if total_lines == 0 {
            return 0..0;
        }
        let start = self.first_line.saturating_sub(self.overscan);
        let end = (self.first_line + self.visible_line_count + self.overscan).min(total_lines);
        start..end
    }
}

impl Default for Viewport {
    fn default() -> Self {
        Self::new(0, 40, 5)
    }
}

/// A single rendered line within a snapshot.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RenderLine {
    /// 0-indexed line number in the raw buffer.
    pub line_idx: usize,
    /// Line text string.
    pub text: String,
    /// Character offset where this line starts in the buffer.
    pub start_char: usize,
}

/// Coordinates for rendering a cursor indicator.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct RenderCursor {
    /// 0-indexed line number.
    pub line: usize,
    /// 0-indexed character column on the line.
    pub col: usize,
    /// Whether this cursor represents the primary selection head.
    pub is_primary: bool,
}

/// Immutable, deterministic snapshot of visible editor state for UI painting.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RenderSnapshot {
    /// Lines extracted within the viewport range.
    pub lines: Vec<RenderLine>,
    /// Screen-coordinate cursors active within or outside viewport.
    pub cursors: Vec<RenderCursor>,
    /// Active selection ranges in character coordinates.
    pub selections: Vec<Range<usize>>,
    /// Active decorations overlapping the rendered line range.
    pub decorations: Vec<Decoration>,
    /// Total lines in the document buffer.
    pub total_lines: usize,
}

impl RenderSnapshot {
    /// Construct a new render snapshot.
    pub fn new(
        lines: Vec<RenderLine>,
        cursors: Vec<RenderCursor>,
        selections: Vec<Range<usize>>,
        decorations: Vec<Decoration>,
        total_lines: usize,
    ) -> Self {
        Self {
            lines,
            cursors,
            selections,
            decorations,
            total_lines,
        }
    }
}
