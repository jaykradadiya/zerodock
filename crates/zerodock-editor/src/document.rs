//! # Core Document & Deterministic Engine Module
//!
//! Architecture Documentation:
//! `Document` encapsulates all editor state for a single open file: buffer, selections, undo/redo history,
//! fold regions, search engine, and decorations.
//!
//! Invariants:
//! - All state transitions occur strictly through `execute_command(&mut self, cmd: Command)`.
//! - Given an identical starting state and identical command, `execute_command` always produces identical resulting state and events.
//! - After any command modifying text or selections, `self.selections` is guaranteed normalized and within bounds.

use std::ops::Range;
use crate::buffer::Buffer;
use crate::command::Command;
use crate::decorations::DecorationManager;
use crate::error::EditorResult;
use crate::folding::FoldManager;
use crate::history::{EditGroup, EditOperation, History};
use crate::search::SearchEngine;
use crate::selection::{Selection, SelectionSet};
use crate::viewport::{RenderCursor, RenderLine, RenderSnapshot, Viewport};

/// Event emitted after executing a command indicating what state changed.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum DocumentEvent {
    /// Buffer text changed within a character span.
    BufferModified {
        /// Range of characters affected.
        char_range: Range<usize>,
        /// Number of characters inserted or remaining.
        new_text_len: usize,
    },
    /// Cursors or selections moved or normalized.
    SelectionsChanged,
    /// Undo or redo history stack changed.
    HistoryChanged,
    /// Fold regions collapsed or expanded.
    FoldStateChanged,
    /// Bookmarks or decorations updated.
    DecorationsChanged,
}

/// Core deterministic editor document.
#[derive(Debug, Clone)]
pub struct Document {
    buffer: Buffer,
    selections: SelectionSet,
    history: History,
    fold_manager: FoldManager,
    #[allow(dead_code)]
    search_engine: SearchEngine,
    decoration_manager: DecorationManager,
}

impl Document {
    /// Construct a new document from initial text.
    pub fn new(text: &str) -> Self {
        Self {
            buffer: Buffer::from_str(text),
            selections: SelectionSet::new_caret(0),
            history: History::new(1000),
            fold_manager: FoldManager::new(),
            search_engine: SearchEngine::new(),
            decoration_manager: DecorationManager::new(),
        }
    }

    /// Read-only access to the text buffer.
    pub fn buffer(&self) -> &Buffer {
        &self.buffer
    }

    /// Read-only access to active selections.
    pub fn selections(&self) -> &SelectionSet {
        &self.selections
    }

    /// Read-only access to undo/redo history.
    pub fn history(&self) -> &History {
        &self.history
    }

    /// Read-only access to code folding manager.
    pub fn fold_manager(&self) -> &FoldManager {
        &self.fold_manager
    }

    /// Mutable access to code folding manager.
    pub fn fold_manager_mut(&mut self) -> &mut FoldManager {
        &mut self.fold_manager
    }

    /// Read-only access to decorations manager.
    pub fn decoration_manager(&self) -> &DecorationManager {
        &self.decoration_manager
    }

    /// Mutable access to decorations manager.
    pub fn decoration_manager_mut(&mut self) -> &mut DecorationManager {
        &mut self.decoration_manager
    }

    /// Generate an immutable, memory-bounded snapshot for rendering visible lines.
    pub fn render_snapshot(&self, viewport: &Viewport) -> EditorResult<RenderSnapshot> {
        let total_lines = self.buffer.line_count();
        let line_range = viewport.line_range(total_lines);

        let mut lines = Vec::with_capacity(line_range.len());
        for line_idx in line_range.clone() {
            let start_char = self.buffer.line_to_char(line_idx)?;
            let text = self.buffer.line_to_string(line_idx)?;
            lines.push(RenderLine {
                line_idx,
                text,
                start_char,
            });
        }

        let mut cursors = Vec::with_capacity(self.selections.as_slice().len());
        for (idx, sel) in self.selections.as_slice().iter().enumerate() {
            let head = sel.head.min(self.buffer.char_len());
            let line = self.buffer.char_to_line(head)?;
            let line_start = self.buffer.line_to_char(line)?;
            cursors.push(RenderCursor {
                line,
                col: head.saturating_sub(line_start),
                is_primary: idx == self.selections.primary_index(),
            });
        }

        let selections: Vec<Range<usize>> = self
            .selections
            .as_slice()
            .iter()
            .map(|s| s.range())
            .collect();

        let visible_char_start = if line_range.start < total_lines {
            self.buffer.line_to_char(line_range.start)?
        } else {
            0
        };
        let visible_char_end = if line_range.end < total_lines {
            self.buffer.line_to_char(line_range.end)?
        } else {
            self.buffer.char_len()
        };
        let visible_span = visible_char_start..visible_char_end;

        let decorations = self
            .decoration_manager
            .find_overlapping(visible_span)
            .into_iter()
            .cloned()
            .collect();

        Ok(RenderSnapshot::new(
            lines,
            cursors,
            selections,
            decorations,
            total_lines,
        ))
    }

    /// Execute a deterministic command against the document state.
    pub fn execute_command(&mut self, cmd: Command) -> EditorResult<Vec<DocumentEvent>> {
        let mut events = Vec::new();

        match cmd {
            Command::MoveLeft { count, select } => {
                let mut updated = Vec::new();
                for sel in self.selections.as_slice() {
                    let new_head = sel.head.saturating_sub(count);
                    let anchor = if select { sel.anchor } else { new_head };
                    updated.push(Selection::new(anchor, new_head));
                }
                self.selections = SelectionSet::from_selections(updated, self.selections.primary_index());
                events.push(DocumentEvent::SelectionsChanged);
            }
            Command::MoveRight { count, select } => {
                let char_len = self.buffer.char_len();
                let mut updated = Vec::new();
                for sel in self.selections.as_slice() {
                    let new_head = (sel.head + count).min(char_len);
                    let anchor = if select { sel.anchor } else { new_head };
                    updated.push(Selection::new(anchor, new_head));
                }
                self.selections = SelectionSet::from_selections(updated, self.selections.primary_index());
                events.push(DocumentEvent::SelectionsChanged);
            }
            Command::MoveUp { count, select } => {
                let mut updated = Vec::new();
                for sel in self.selections.as_slice() {
                    let cur_line = self.buffer.char_to_line(sel.head)?;
                    let cur_line_start = self.buffer.line_to_char(cur_line)?;
                    let col = sel.head.saturating_sub(cur_line_start);
                    let target_line = cur_line.saturating_sub(count);
                    let target_line_start = self.buffer.line_to_char(target_line)?;
                    let target_line_len = self.buffer.line_len_chars(target_line)?.saturating_sub(1);
                    let new_head = target_line_start + col.min(target_line_len);
                    let anchor = if select { sel.anchor } else { new_head };
                    updated.push(Selection::new(anchor, new_head));
                }
                self.selections = SelectionSet::from_selections(updated, self.selections.primary_index());
                events.push(DocumentEvent::SelectionsChanged);
            }
            Command::MoveDown { count, select } => {
                let line_count = self.buffer.line_count();
                let mut updated = Vec::new();
                for sel in self.selections.as_slice() {
                    let cur_line = self.buffer.char_to_line(sel.head)?;
                    let cur_line_start = self.buffer.line_to_char(cur_line)?;
                    let col = sel.head.saturating_sub(cur_line_start);
                    let target_line = (cur_line + count).min(line_count.saturating_sub(1));
                    let target_line_start = self.buffer.line_to_char(target_line)?;
                    let target_line_len = self.buffer.line_len_chars(target_line)?.saturating_sub(1);
                    let new_head = target_line_start + col.min(target_line_len);
                    let anchor = if select { sel.anchor } else { new_head };
                    updated.push(Selection::new(anchor, new_head));
                }
                self.selections = SelectionSet::from_selections(updated, self.selections.primary_index());
                events.push(DocumentEvent::SelectionsChanged);
            }
            Command::MoveToLineStart { select } => {
                let mut updated = Vec::new();
                for sel in self.selections.as_slice() {
                    let line = self.buffer.char_to_line(sel.head)?;
                    let new_head = self.buffer.line_to_char(line)?;
                    let anchor = if select { sel.anchor } else { new_head };
                    updated.push(Selection::new(anchor, new_head));
                }
                self.selections = SelectionSet::from_selections(updated, self.selections.primary_index());
                events.push(DocumentEvent::SelectionsChanged);
            }
            Command::MoveToLineEnd { select } => {
                let mut updated = Vec::new();
                for sel in self.selections.as_slice() {
                    let line = self.buffer.char_to_line(sel.head)?;
                    let line_start = self.buffer.line_to_char(line)?;
                    let line_len = self.buffer.line_len_chars(line)?;
                    // Don't include trailing newline
                    let text = self.buffer.line_to_string(line)?;
                    let trim_len = text.trim_end_matches(['\n', '\r']).chars().count();
                    let new_head = line_start + trim_len.min(line_len);
                    let anchor = if select { sel.anchor } else { new_head };
                    updated.push(Selection::new(anchor, new_head));
                }
                self.selections = SelectionSet::from_selections(updated, self.selections.primary_index());
                events.push(DocumentEvent::SelectionsChanged);
            }
            Command::MoveToBufferStart { select } => {
                let anchor = if select { self.selections.primary().anchor } else { 0 };
                self.selections.set_single(Selection::new(anchor, 0));
                events.push(DocumentEvent::SelectionsChanged);
            }
            Command::MoveToBufferEnd { select } => {
                let end = self.buffer.char_len();
                let anchor = if select { self.selections.primary().anchor } else { end };
                self.selections.set_single(Selection::new(anchor, end));
                events.push(DocumentEvent::SelectionsChanged);
            }
            Command::GoToLine { line } => {
                let target = line.min(self.buffer.line_count().saturating_sub(1));
                let char_pos = self.buffer.line_to_char(target)?;
                self.selections.set_single(Selection::caret(char_pos));
                events.push(DocumentEvent::SelectionsChanged);
            }
            Command::GoToMatchingBracket => {
                let head = self.selections.primary().head;
                if let Some(target) = self.find_matching_bracket(head)? {
                    self.selections.set_single(Selection::caret(target));
                    events.push(DocumentEvent::SelectionsChanged);
                }
            }
            Command::SelectAll => {
                self.selections.set_single(Selection::new(0, self.buffer.char_len()));
                events.push(DocumentEvent::SelectionsChanged);
            }
            Command::SelectWord => {
                let mut updated = Vec::new();
                for sel in self.selections.as_slice() {
                    let (start, end) = self.find_word_bounds(sel.head)?;
                    updated.push(Selection::new(start, end));
                }
                self.selections = SelectionSet::from_selections(updated, self.selections.primary_index());
                events.push(DocumentEvent::SelectionsChanged);
            }
            Command::SelectLine => {
                let mut updated = Vec::new();
                for sel in self.selections.as_slice() {
                    let line = self.buffer.char_to_line(sel.head)?;
                    let start = self.buffer.line_to_char(line)?;
                    let next_line = line + 1;
                    let end = if next_line < self.buffer.line_count() {
                        self.buffer.line_to_char(next_line)?
                    } else {
                        self.buffer.char_len()
                    };
                    updated.push(Selection::new(start, end));
                }
                self.selections = SelectionSet::from_selections(updated, self.selections.primary_index());
                events.push(DocumentEvent::SelectionsChanged);
            }
            Command::SetSelection(sel) => {
                self.selections.set_single(sel);
                events.push(DocumentEvent::SelectionsChanged);
            }
            Command::AddSelection(sel) => {
                self.selections.add(sel);
                events.push(DocumentEvent::SelectionsChanged);
            }
            Command::ClearSecondaryCursors => {
                let primary = *self.selections.primary();
                self.selections.set_single(primary);
                events.push(DocumentEvent::SelectionsChanged);
            }
            Command::InsertText(text) => {
                let before_sel = self.selections.clone();
                let mut ops = Vec::new();
                // Apply insertions from right to left so indices don't shift
                let mut sels = self.selections.as_slice().to_vec();
                sels.sort_by_key(|s| std::cmp::Reverse(s.range().start));

                for sel in &sels {
                    if !sel.is_empty() {
                        let r = sel.range();
                        let deleted = self.buffer.slice_to_string(r.clone())?;
                        let del_op = EditOperation::Delete {
                            offset: r.start,
                            text: deleted,
                        };
                        del_op.apply(&mut self.buffer)?;
                        ops.push(del_op);
                    }
                }
                // Now insert text at each cursor point
                let mut forward_sels = sels;
                forward_sels.sort_by_key(|s| s.range().start);

                let mut cumulative_shift = 0isize;
                let mut new_cursors = Vec::new();
                for sel in &forward_sels {
                    let start = ((sel.range().start as isize) + cumulative_shift) as usize;
                    let ins_op = EditOperation::Insert {
                        offset: start,
                        text: text.clone(),
                    };
                    ins_op.apply(&mut self.buffer)?;
                    ops.push(ins_op);
                    let new_pos = start + text.chars().count();
                    new_cursors.push(Selection::caret(new_pos));
                    let len_diff = (text.chars().count() as isize) - (sel.range().len() as isize);
                    cumulative_shift += len_diff;
                }

                self.selections = SelectionSet::from_selections(new_cursors, 0);
                let group = EditGroup::new(ops, before_sel, self.selections.clone());
                self.history.push(group);

                events.push(DocumentEvent::BufferModified {
                    char_range: 0..self.buffer.char_len(),
                    new_text_len: self.buffer.char_len(),
                });
                events.push(DocumentEvent::SelectionsChanged);
                events.push(DocumentEvent::HistoryChanged);
            }
            Command::InsertCharWithAutoClose(ch) => {
                let close_pair = match ch {
                    '(' => Some(')'),
                    '[' => Some(']'),
                    '{' => Some('}'),
                    '"' => Some('"'),
                    '\'' => Some('\''),
                    _ => None,
                };

                if let Some(closer) = close_pair {
                    let combined = format!("{}{}", ch, closer);
                    self.execute_command(Command::InsertText(combined))?;
                    // Move cursors left 1 character so they sit inside the pair
                    self.execute_command(Command::MoveLeft { count: 1, select: false })?;
                } else {
                    self.execute_command(Command::InsertText(ch.to_string()))?;
                }
                events.push(DocumentEvent::SelectionsChanged);
            }
            Command::DeleteBackward => {
                let before_sel = self.selections.clone();
                let mut ops = Vec::new();
                let mut sels = self.selections.as_slice().to_vec();
                sels.sort_by_key(|s| std::cmp::Reverse(s.range().start));

                for sel in &sels {
                    let del_range = if !sel.is_empty() {
                        sel.range()
                    } else if sel.head > 0 {
                        sel.head - 1..sel.head
                    } else {
                        continue;
                    };

                    let deleted = self.buffer.slice_to_string(del_range.clone())?;
                    let op = EditOperation::Delete {
                        offset: del_range.start,
                        text: deleted,
                    };
                    op.apply(&mut self.buffer)?;
                    ops.push(op);
                }

                if !ops.is_empty() {
                    // Recompute cursors
                    let mut new_sels = Vec::new();
                    for op in &ops {
                        if let EditOperation::Delete { offset, .. } = op {
                            new_sels.push(Selection::caret(*offset));
                        }
                    }
                    self.selections = SelectionSet::from_selections(new_sels, 0);
                    self.history.push(EditGroup::new(ops, before_sel, self.selections.clone()));
                    events.push(DocumentEvent::BufferModified {
                        char_range: 0..self.buffer.char_len(),
                        new_text_len: self.buffer.char_len(),
                    });
                    events.push(DocumentEvent::SelectionsChanged);
                    events.push(DocumentEvent::HistoryChanged);
                }
            }
            Command::DeleteForward => {
                let before_sel = self.selections.clone();
                let mut ops = Vec::new();
                let mut sels = self.selections.as_slice().to_vec();
                sels.sort_by_key(|s| std::cmp::Reverse(s.range().start));

                for sel in &sels {
                    let del_range = if !sel.is_empty() {
                        sel.range()
                    } else if sel.head < self.buffer.char_len() {
                        sel.head..sel.head + 1
                    } else {
                        continue;
                    };

                    let deleted = self.buffer.slice_to_string(del_range.clone())?;
                    let op = EditOperation::Delete {
                        offset: del_range.start,
                        text: deleted,
                    };
                    op.apply(&mut self.buffer)?;
                    ops.push(op);
                }

                if !ops.is_empty() {
                    let mut new_sels = Vec::new();
                    for op in &ops {
                        if let EditOperation::Delete { offset, .. } = op {
                            new_sels.push(Selection::caret(*offset));
                        }
                    }
                    self.selections = SelectionSet::from_selections(new_sels, 0);
                    self.history.push(EditGroup::new(ops, before_sel, self.selections.clone()));
                    events.push(DocumentEvent::BufferModified {
                        char_range: 0..self.buffer.char_len(),
                        new_text_len: self.buffer.char_len(),
                    });
                    events.push(DocumentEvent::SelectionsChanged);
                    events.push(DocumentEvent::HistoryChanged);
                }
            }
            Command::DeleteLine => {
                self.execute_command(Command::SelectLine)?;
                self.execute_command(Command::InsertText(String::new()))?;
            }
            Command::DuplicateLine => {
                let primary = *self.selections.primary();
                let line = self.buffer.char_to_line(primary.head)?;
                let line_text = self.buffer.line_to_string(line)?;
                let start_char = self.buffer.line_to_char(line)?;
                let end_char = start_char + line_text.chars().count();
                let insert_at = end_char;

                let before_sel = self.selections.clone();
                let ins_op = EditOperation::Insert {
                    offset: insert_at,
                    text: line_text.clone(),
                };
                ins_op.apply(&mut self.buffer)?;
                self.selections.set_single(Selection::caret(primary.head + line_text.chars().count()));
                self.history.push(EditGroup::new(vec![ins_op], before_sel, self.selections.clone()));
                events.push(DocumentEvent::BufferModified {
                    char_range: insert_at..insert_at + line_text.chars().count(),
                    new_text_len: self.buffer.char_len(),
                });
                events.push(DocumentEvent::SelectionsChanged);
                events.push(DocumentEvent::HistoryChanged);
            }
            Command::MoveLineUp => {
                let primary = *self.selections.primary();
                let line = self.buffer.char_to_line(primary.head)?;
                if line > 0 {
                    let prev_line = line - 1;
                    let cur_text = self.buffer.line_to_string(line)?;
                    let prev_text = self.buffer.line_to_string(prev_line)?;
                    let prev_start = self.buffer.line_to_char(prev_line)?;
                    let combined_len = cur_text.chars().count() + prev_text.chars().count();

                    let before_sel = self.selections.clone();
                    let del_op = EditOperation::Delete {
                        offset: prev_start,
                        text: format!("{}{}", prev_text, cur_text),
                    };
                    del_op.apply(&mut self.buffer)?;
                    let ins_op = EditOperation::Insert {
                        offset: prev_start,
                        text: format!("{}{}", cur_text, prev_text),
                    };
                    ins_op.apply(&mut self.buffer)?;

                    self.selections.set_single(Selection::caret(primary.head.saturating_sub(prev_text.chars().count())));
                    self.history.push(EditGroup::new(vec![del_op, ins_op], before_sel, self.selections.clone()));
                    events.push(DocumentEvent::BufferModified {
                        char_range: prev_start..prev_start + combined_len,
                        new_text_len: self.buffer.char_len(),
                    });
                    events.push(DocumentEvent::SelectionsChanged);
                    events.push(DocumentEvent::HistoryChanged);
                }
            }
            Command::MoveLineDown => {
                let primary = *self.selections.primary();
                let line = self.buffer.char_to_line(primary.head)?;
                if line + 1 < self.buffer.line_count() {
                    let next_line = line + 1;
                    let cur_text = self.buffer.line_to_string(line)?;
                    let next_text = self.buffer.line_to_string(next_line)?;
                    let cur_start = self.buffer.line_to_char(line)?;
                    let combined_len = cur_text.chars().count() + next_text.chars().count();

                    let before_sel = self.selections.clone();
                    let del_op = EditOperation::Delete {
                        offset: cur_start,
                        text: format!("{}{}", cur_text, next_text),
                    };
                    del_op.apply(&mut self.buffer)?;
                    let ins_op = EditOperation::Insert {
                        offset: cur_start,
                        text: format!("{}{}", next_text, cur_text),
                    };
                    ins_op.apply(&mut self.buffer)?;

                    self.selections.set_single(Selection::caret(primary.head + next_text.chars().count()));
                    self.history.push(EditGroup::new(vec![del_op, ins_op], before_sel, self.selections.clone()));
                    events.push(DocumentEvent::BufferModified {
                        char_range: cur_start..cur_start + combined_len,
                        new_text_len: self.buffer.char_len(),
                    });
                    events.push(DocumentEvent::SelectionsChanged);
                    events.push(DocumentEvent::HistoryChanged);
                }
            }
            Command::JoinLines => {
                let primary = *self.selections.primary();
                let line = self.buffer.char_to_line(primary.head)?;
                if line + 1 < self.buffer.line_count() {
                    let next_start = self.buffer.line_to_char(line + 1)?;
                    // Delete newline character(s) before next_start
                    let del_start = if next_start >= 2 && self.buffer.slice_to_string(next_start - 2..next_start)? == "\r\n" {
                        next_start - 2
                    } else {
                        next_start - 1
                    };
                    let deleted = self.buffer.slice_to_string(del_start..next_start)?;
                    let before_sel = self.selections.clone();
                    let op = EditOperation::Delete {
                        offset: del_start,
                        text: deleted,
                    };
                    op.apply(&mut self.buffer)?;
                    self.history.push(EditGroup::new(vec![op], before_sel, self.selections.clone()));
                    events.push(DocumentEvent::BufferModified {
                        char_range: del_start..next_start,
                        new_text_len: self.buffer.char_len(),
                    });
                    events.push(DocumentEvent::HistoryChanged);
                }
            }
            Command::Indent => {
                let before_sel = self.selections.clone();
                let mut lines_to_indent = Vec::new();
                for sel in self.selections.as_slice() {
                    let first_l = self.buffer.char_to_line(sel.range().start)?;
                    let last_l = self.buffer.char_to_line(sel.range().end.saturating_sub(1))?;
                    for l in first_l..=last_l {
                        lines_to_indent.push(l);
                    }
                }
                lines_to_indent.sort_unstable();
                lines_to_indent.dedup();

                let mut ops = Vec::new();
                for l in lines_to_indent {
                    let start = self.buffer.line_to_char(l)?;
                    let ins_op = EditOperation::Insert {
                        offset: start,
                        text: "    ".to_string(),
                    };
                    ins_op.apply(&mut self.buffer)?;
                    ops.push(ins_op);
                }
                self.history.push(EditGroup::new(ops, before_sel, self.selections.clone()));
                events.push(DocumentEvent::BufferModified {
                    char_range: 0..self.buffer.char_len(),
                    new_text_len: self.buffer.char_len(),
                });
                events.push(DocumentEvent::HistoryChanged);
            }
            Command::Outdent => {
                let before_sel = self.selections.clone();
                let mut lines = Vec::new();
                for sel in self.selections.as_slice() {
                    let first_l = self.buffer.char_to_line(sel.range().start)?;
                    let last_l = self.buffer.char_to_line(sel.range().end.saturating_sub(1))?;
                    for l in first_l..=last_l {
                        lines.push(l);
                    }
                }
                lines.sort_unstable();
                lines.dedup();

                let mut ops = Vec::new();
                for l in lines {
                    let start = self.buffer.line_to_char(l)?;
                    let prefix = self.buffer.slice_to_string(start..start + 4.min(self.buffer.char_len() - start))?;
                    let spaces = prefix.chars().take_while(|c| *c == ' ').count().min(4);
                    if spaces > 0 {
                        let del_op = EditOperation::Delete {
                            offset: start,
                            text: " ".repeat(spaces),
                        };
                        del_op.apply(&mut self.buffer)?;
                        ops.push(del_op);
                    }
                }
                if !ops.is_empty() {
                    self.history.push(EditGroup::new(ops, before_sel, self.selections.clone()));
                    events.push(DocumentEvent::BufferModified {
                        char_range: 0..self.buffer.char_len(),
                        new_text_len: self.buffer.char_len(),
                    });
                    events.push(DocumentEvent::HistoryChanged);
                }
            }
            Command::CommentToggle { prefix } => {
                let before_sel = self.selections.clone();
                let mut lines = Vec::new();
                for sel in self.selections.as_slice() {
                    let first_l = self.buffer.char_to_line(sel.range().start)?;
                    let last_l = self.buffer.char_to_line(sel.range().end.saturating_sub(1))?;
                    for l in first_l..=last_l {
                        lines.push(l);
                    }
                }
                lines.sort_unstable();
                lines.dedup();

                let mut ops = Vec::new();
                for l in lines {
                    let start = self.buffer.line_to_char(l)?;
                    let line_str = self.buffer.line_to_string(l)?;
                    let trimmed = line_str.trim_start();
                    let leading = line_str.len() - trimmed.len();
                    if trimmed.starts_with(&prefix) {
                        let del_offset = start + leading;
                        let del_op = EditOperation::Delete {
                            offset: del_offset,
                            text: prefix.clone(),
                        };
                        del_op.apply(&mut self.buffer)?;
                        ops.push(del_op);
                    } else {
                        let ins_op = EditOperation::Insert {
                            offset: start,
                            text: format!("{} ", prefix),
                        };
                        ins_op.apply(&mut self.buffer)?;
                        ops.push(ins_op);
                    }
                }
                self.history.push(EditGroup::new(ops, before_sel, self.selections.clone()));
                events.push(DocumentEvent::BufferModified {
                    char_range: 0..self.buffer.char_len(),
                    new_text_len: self.buffer.char_len(),
                });
                events.push(DocumentEvent::HistoryChanged);
            }
            Command::SurroundSelection { open, close } => {
                let mut sels = self.selections.as_slice().to_vec();
                sels.sort_by_key(|s| std::cmp::Reverse(s.range().start));
                for sel in sels {
                    if !sel.is_empty() {
                        let r = sel.range();
                        self.execute_command(Command::SetSelection(Selection::caret(r.end)))?;
                        self.execute_command(Command::InsertText(close.clone()))?;
                        self.execute_command(Command::SetSelection(Selection::caret(r.start)))?;
                        self.execute_command(Command::InsertText(open.clone()))?;
                    }
                }
            }
            Command::Undo => {
                if let Ok(restored_sels) = self.history.undo(&mut self.buffer) {
                    self.selections = restored_sels;
                    events.push(DocumentEvent::BufferModified {
                        char_range: 0..self.buffer.char_len(),
                        new_text_len: self.buffer.char_len(),
                    });
                    events.push(DocumentEvent::SelectionsChanged);
                    events.push(DocumentEvent::HistoryChanged);
                }
            }
            Command::Redo => {
                if let Ok(restored_sels) = self.history.redo(&mut self.buffer) {
                    self.selections = restored_sels;
                    events.push(DocumentEvent::BufferModified {
                        char_range: 0..self.buffer.char_len(),
                        new_text_len: self.buffer.char_len(),
                    });
                    events.push(DocumentEvent::SelectionsChanged);
                    events.push(DocumentEvent::HistoryChanged);
                }
            }
            Command::ToggleFold => {
                let line = self.buffer.char_to_line(self.selections.primary().head)?;
                if self.fold_manager.toggle_at_line(line) {
                    events.push(DocumentEvent::FoldStateChanged);
                }
            }
            Command::FoldAll => {
                self.fold_manager.fold_all();
                events.push(DocumentEvent::FoldStateChanged);
            }
            Command::UnfoldAll => {
                self.fold_manager.unfold_all();
                events.push(DocumentEvent::FoldStateChanged);
            }
            Command::ToggleBookmark => {
                let line = self.buffer.char_to_line(self.selections.primary().head)?;
                let line_start = self.buffer.line_to_char(line)?;
                let line_end = line_start + self.buffer.line_len_chars(line)?;
                self.decoration_manager.toggle_bookmark(line, line_start..line_end);
                events.push(DocumentEvent::DecorationsChanged);
            }
            Command::NextBookmark => {
                let current_line = self.buffer.char_to_line(self.selections.primary().head)?;
                let lines = self.decoration_manager.bookmarked_lines();
                if let Some(&next_line) = lines.iter().find(|&&l| l > current_line).or_else(|| lines.first()) {
                    self.execute_command(Command::GoToLine { line: next_line })?;
                }
            }
            Command::PrevBookmark => {
                let current_line = self.buffer.char_to_line(self.selections.primary().head)?;
                let lines = self.decoration_manager.bookmarked_lines();
                if let Some(&prev_line) = lines.iter().rev().find(|&&l| l < current_line).or_else(|| lines.last()) {
                    self.execute_command(Command::GoToLine { line: prev_line })?;
                }
            }
        }

        Ok(events)
    }

    fn find_word_bounds(&self, pos: usize) -> EditorResult<(usize, usize)> {
        let text = self.buffer.slice_to_string(0..self.buffer.char_len())?;
        let chars: Vec<char> = text.chars().collect();
        if chars.is_empty() {
            return Ok((0, 0));
        }
        let p = pos.min(chars.len().saturating_sub(1));
        if !chars[p].is_alphanumeric() && chars[p] != '_' {
            return Ok((p, p + 1));
        }
        let mut start = p;
        while start > 0 && (chars[start - 1].is_alphanumeric() || chars[start - 1] == '_') {
            start -= 1;
        }
        let mut end = p;
        while end < chars.len() && (chars[end].is_alphanumeric() || chars[end] == '_') {
            end += 1;
        }
        Ok((start, end))
    }

    fn find_matching_bracket(&self, pos: usize) -> EditorResult<Option<usize>> {
        let text = self.buffer.slice_to_string(0..self.buffer.char_len())?;
        let chars: Vec<char> = text.chars().collect();
        if pos >= chars.len() {
            return Ok(None);
        }
        let current = chars[pos];
        let pair = match current {
            '(' => (1isize, ')'),
            '[' => (1isize, ']'),
            '{' => (1isize, '}'),
            ')' => (-1isize, '('),
            ']' => (-1isize, '['),
            '}' => (-1isize, '{'),
            _ => return Ok(None),
        };

        let mut depth = 0isize;
        if pair.0 > 0 {
            for i in pos..chars.len() {
                if chars[i] == current {
                    depth += 1;
                } else if chars[i] == pair.1 {
                    depth -= 1;
                    if depth == 0 {
                        return Ok(Some(i));
                    }
                }
            }
        } else {
            for i in (0..=pos).rev() {
                if chars[i] == current {
                    depth += 1;
                } else if chars[i] == pair.1 {
                    depth -= 1;
                    if depth == 0 {
                        return Ok(Some(i));
                    }
                }
            }
        }
        Ok(None)
    }
}
