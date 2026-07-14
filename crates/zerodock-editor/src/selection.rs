//! # Multi-Cursor & Selection Module
//!
//! Architecture Documentation:
//! Manages individual selections (`Selection`), multi-cursor collections (`SelectionSet`), and block/rectangular selections (`RectangularSelection`).
//!
//! Invariants:
//! - A `SelectionSet` is never empty; it always contains at least one primary selection.
//! - Selections within a `SelectionSet` are strictly sorted by character range and never overlap.
//! - Whenever selections are modified or added, `normalize()` merges overlapping or touching selections while preserving the primary selection reference.
//!
//! Ownership & Lifetimes:
//! All selection structures are `'static` value types.

use std::ops::Range;
use crate::buffer::Buffer;

/// A directional text selection defined by an anchor (start of selection) and head (active cursor position).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Selection {
    /// Character offset where the selection anchor was placed.
    pub anchor: usize,
    /// Character offset where the active cursor head is placed.
    pub head: usize,
}

impl Selection {
    /// Create a directional selection from anchor to head.
    pub fn new(anchor: usize, head: usize) -> Self {
        Self { anchor, head }
    }

    /// Create a zero-width caret selection at `pos`.
    pub fn caret(pos: usize) -> Self {
        Self {
            anchor: pos,
            head: pos,
        }
    }

    /// Return true if the selection has zero width (`anchor == head`).
    pub fn is_empty(&self) -> bool {
        self.anchor == self.head
    }

    /// Return the ordered character range `start..end`.
    pub fn range(&self) -> Range<usize> {
        let start = self.anchor.min(self.head);
        let end = self.anchor.max(self.head);
        start..end
    }

    /// Return true if two selections overlap or touch (adjacent).
    pub fn overlaps_or_adjacent(&self, other: &Selection) -> bool {
        let r1 = self.range();
        let r2 = other.range();
        r1.start <= r2.end && r2.start <= r1.end
    }

    /// Merge two overlapping or adjacent selections into a single selection spanning both.
    /// The merged selection places `head` at the rightmost edge if `self.head >= self.anchor`, else leftmost.
    pub fn merge(&self, other: &Selection) -> Selection {
        let r1 = self.range();
        let r2 = other.range();
        let min_start = r1.start.min(r2.start);
        let max_end = r1.end.max(r2.end);
        if self.head >= self.anchor {
            Selection::new(min_start, max_end)
        } else {
            Selection::new(max_end, min_start)
        }
    }
}

/// Normalized collection of non-overlapping selections with an identified primary cursor.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SelectionSet {
    selections: Vec<Selection>,
    primary_index: usize,
}

impl SelectionSet {
    /// Construct a new `SelectionSet` containing a single caret selection at position 0.
    pub fn new_caret(pos: usize) -> Self {
        Self {
            selections: vec![Selection::caret(pos)],
            primary_index: 0,
        }
    }

    /// Construct a `SelectionSet` from a list of selections, normalizing overlaps and setting `primary_index`.
    pub fn from_selections(selections: Vec<Selection>, primary_index: usize) -> Self {
        let is_empty = selections.is_empty();
        let len = selections.len();
        let mut set = Self {
            selections: if is_empty {
                vec![Selection::caret(0)]
            } else {
                selections
            },
            primary_index: if is_empty {
                0
            } else {
                primary_index.min(len.saturating_sub(1))
            },
        };
        set.normalize();
        set
    }

    /// Return a slice of all active selections sorted by character position.
    pub fn as_slice(&self) -> &[Selection] {
        &self.selections
    }

    /// Return a reference to the primary selection.
    pub fn primary(&self) -> &Selection {
        &self.selections[self.primary_index]
    }

    /// Return the index of the primary selection within `as_slice()`.
    pub fn primary_index(&self) -> usize {
        self.primary_index
    }

    /// Set a single primary selection, discarding all secondary cursors.
    pub fn set_single(&mut self, selection: Selection) {
        self.selections.clear();
        self.selections.push(selection);
        self.primary_index = 0;
    }

    /// Add a secondary selection and immediately normalize the set.
    pub fn add(&mut self, selection: Selection) {
        self.selections.push(selection);
        self.normalize();
    }

    /// Ensure all selections are sorted and disjoint, merging any overlaps while tracking primary cursor.
    pub fn normalize(&mut self) {
        if self.selections.is_empty() {
            self.selections.push(Selection::caret(0));
            self.primary_index = 0;
            return;
        }

        // Remember the primary selection before sorting/merging.
        let primary_sel = self.selections[self.primary_index];

        // Sort by range start, then range end.
        self.selections.sort_by_key(|sel| (sel.range().start, sel.range().end));

        let mut merged: Vec<Selection> = Vec::with_capacity(self.selections.len());
        let mut new_primary = 0usize;

        for sel in self.selections.drain(..) {
            if let Some(last) = merged.last_mut() {
                if last.overlaps_or_adjacent(&sel) {
                    *last = last.merge(&sel);
                    continue;
                }
            }
            merged.push(sel);
        }

        // Find which merged selection contains the original primary cursor head
        for (idx, sel) in merged.iter().enumerate() {
            let r = sel.range();
            if primary_sel.head >= r.start && primary_sel.head <= r.end {
                new_primary = idx;
                break;
            }
        }

        self.selections = merged;
        self.primary_index = new_primary.min(self.selections.len().saturating_sub(1));
    }
}

impl Default for SelectionSet {
    fn default() -> Self {
        Self::new_caret(0)
    }
}

/// Specification for a rectangular/column block selection across lines.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct RectangularSelection {
    /// Starting 0-indexed line.
    pub start_line: usize,
    /// Starting 0-indexed column character offset on line.
    pub start_col: usize,
    /// Ending 0-indexed line.
    pub end_line: usize,
    /// Ending 0-indexed column character offset on line.
    pub end_col: usize,
}

impl RectangularSelection {
    /// Convert this rectangular region into a `SelectionSet` with one `Selection` per line.
    pub fn to_selections(&self, buffer: &Buffer) -> SelectionSet {
        let first_line = self.start_line.min(self.end_line);
        let last_line = self.start_line.max(self.end_line).min(buffer.line_count().saturating_sub(1));
        let left_col = self.start_col.min(self.end_col);
        let right_col = self.start_col.max(self.end_col);

        let mut selections = Vec::new();
        for line_idx in first_line..=last_line {
            if let Ok(line_start_char) = buffer.line_to_char(line_idx) {
                let line_len = buffer.line_len_chars(line_idx).unwrap_or(0);
                // Strip newline from column clamping if line ends with newline
                let effective_len = if line_len > 0 { line_len } else { 0 };
                let anchor = line_start_char + left_col.min(effective_len);
                let head = line_start_char + right_col.min(effective_len);
                selections.push(Selection::new(anchor, head));
            }
        }
        if selections.is_empty() {
            SelectionSet::new_caret(0)
        } else {
            SelectionSet::from_selections(selections, 0)
        }
    }
}
