//! # Code Folding & Visible Line Mapping Module
//!
//! Architecture Documentation:
//! Tracks collapsible syntax/indentation regions and maintains deterministic mappings between raw buffer
//! lines and visible viewport lines.
//!
//! Invariants:
//! - A folded region hides lines strictly greater than `start_line` up to and including `end_line`.
//! - Visible line count is always `<= buffer.line_count()`.

/// A collapsible range of lines within the buffer.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct FoldRegion {
    /// 0-indexed starting line (remains visible when collapsed).
    pub start_line: usize,
    /// 0-indexed ending line (inclusive, hidden when collapsed).
    pub end_line: usize,
    /// Whether this region is currently collapsed.
    pub collapsed: bool,
}

impl FoldRegion {
    /// Construct a new fold region.
    pub fn new(start_line: usize, end_line: usize, collapsed: bool) -> Self {
        Self {
            start_line,
            end_line,
            collapsed,
        }
    }

    /// Return true if `line` is hidden inside this region when collapsed.
    pub fn hides_line(&self, line: usize) -> bool {
        self.collapsed && line > self.start_line && line <= self.end_line
    }
}

/// Manages active fold regions and computes line translations.
#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct FoldManager {
    regions: Vec<FoldRegion>,
}

impl FoldManager {
    /// Create a new empty fold manager.
    pub fn new() -> Self {
        Self {
            regions: Vec::new(),
        }
    }

    /// Set the complete list of collapsible regions.
    pub fn set_regions(&mut self, regions: Vec<FoldRegion>) {
        self.regions = regions;
    }

    /// Toggle the collapsed state of any fold region starting at or containing `line`.
    /// Returns true if a region state was changed.
    pub fn toggle_at_line(&mut self, line: usize) -> bool {
        for region in &mut self.regions {
            if region.start_line == line || (line >= region.start_line && line <= region.end_line) {
                region.collapsed = !region.collapsed;
                return true;
            }
        }
        false
    }

    /// Collapse all registered fold regions.
    pub fn fold_all(&mut self) {
        for region in &mut self.regions {
            region.collapsed = true;
        }
    }

    /// Expand all registered fold regions.
    pub fn unfold_all(&mut self) {
        for region in &mut self.regions {
            region.collapsed = false;
        }
    }

    /// Check if a raw buffer line index is currently hidden by any collapsed region.
    pub fn is_line_hidden(&self, line: usize) -> bool {
        self.regions.iter().any(|r| r.hides_line(line))
    }

    /// Return the total number of visible lines given the total lines in the buffer.
    pub fn visible_line_count(&self, total_buffer_lines: usize) -> usize {
        let mut count = 0usize;
        for line in 0..total_buffer_lines {
            if !self.is_line_hidden(line) {
                count += 1;
            }
        }
        count
    }

    /// Map a raw buffer line index to its visible display line index.
    /// Returns `None` if the line is currently hidden.
    pub fn buffer_to_visible_line(&self, buffer_line: usize) -> Option<usize> {
        if self.is_line_hidden(buffer_line) {
            return None;
        }
        let mut visible = 0usize;
        for l in 0..buffer_line {
            if !self.is_line_hidden(l) {
                visible += 1;
            }
        }
        Some(visible)
    }

    /// Map a visible display line index back to the raw buffer line index.
    pub fn visible_to_buffer_line(&self, visible_line: usize, total_buffer_lines: usize) -> Option<usize> {
        let mut seen = 0usize;
        for line in 0..total_buffer_lines {
            if !self.is_line_hidden(line) {
                if seen == visible_line {
                    return Some(line);
                }
                seen += 1;
            }
        }
        None
    }
}
