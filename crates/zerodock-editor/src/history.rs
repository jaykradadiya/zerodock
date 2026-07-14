//! # Undo & Redo History Module (Command Pattern)
//!
//! Architecture Documentation:
//! Implements strict reversible editing transactions using the Command Pattern. Every buffer mutation
//! is recorded as one or more `EditOperation` instances grouped within an `EditGroup`.
//!
//! Invariants:
//! - Every `EditGroup` contains the exact `before_selection` and `after_selection` state.
//! - Undoing applies inverted operations in reverse order and returns `before_selection`.
//! - Redoing applies forward operations in forward order and returns `after_selection`.
//! - History memory is bounded by `max_depth` (default 1,000 groups).
//!
//! Ownership & Lifetimes:
//! All edit operations store owned `String` fragments for inserted/deleted text.

use crate::buffer::Buffer;
use crate::error::{EditorError, EditorResult};
use crate::selection::SelectionSet;

/// A primitive atomic edit operation at a specific character index.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum EditOperation {
    /// Insertion of text starting at `offset`.
    Insert {
        /// 0-indexed character offset.
        offset: usize,
        /// Text string inserted.
        text: String,
    },
    /// Deletion of text starting at `offset`.
    Delete {
        /// 0-indexed character offset.
        offset: usize,
        /// Text string deleted.
        text: String,
    },
}

impl EditOperation {
    /// Return the inverse operation required to undo this edit.
    pub fn invert(&self) -> Self {
        match self {
            EditOperation::Insert { offset, text } => EditOperation::Delete {
                offset: *offset,
                text: text.clone(),
            },
            EditOperation::Delete { offset, text } => EditOperation::Insert {
                offset: *offset,
                text: text.clone(),
            },
        }
    }

    /// Apply this edit operation to the provided buffer.
    pub fn apply(&self, buffer: &mut Buffer) -> EditorResult<()> {
        match self {
            EditOperation::Insert { offset, text } => buffer.insert(*offset, text),
            EditOperation::Delete { offset, text } => {
                let char_len = text.chars().count();
                buffer.remove(*offset..*offset + char_len)
            }
        }
    }
}

/// A transactional group of operations performed atomically (e.g. multi-cursor edit).
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct EditGroup {
    /// Ordered list of primitive operations.
    pub operations: Vec<EditOperation>,
    /// Selection set before these operations were executed.
    pub before_selection: SelectionSet,
    /// Selection set after these operations were executed.
    pub after_selection: SelectionSet,
}

impl EditGroup {
    /// Construct a new edit group.
    pub fn new(
        operations: Vec<EditOperation>,
        before_selection: SelectionSet,
        after_selection: SelectionSet,
    ) -> Self {
        Self {
            operations,
            before_selection,
            after_selection,
        }
    }

    /// Check if two consecutive single-character insert groups can be compressed/merged into one.
    pub fn can_merge_with(&self, next: &Self) -> bool {
        if self.operations.len() != 1 || next.operations.len() != 1 {
            return false;
        }
        match (&self.operations[0], &next.operations[0]) {
            (
                EditOperation::Insert { offset: off1, text: t1 },
                EditOperation::Insert { offset: off2, text: t2 },
            ) => {
                // Must be adjacent typing and neither text should contain newline
                *off2 == *off1 + t1.chars().count() && !t1.contains('\n') && !t2.contains('\n')
            }
            _ => false,
        }
    }

    /// Merge `next` into `self`.
    pub fn merge(&mut self, next: Self) {
        if let (
            Some(EditOperation::Insert { text: t1, .. }),
            Some(EditOperation::Insert { text: t2, .. }),
        ) = (self.operations.first_mut(), next.operations.first())
        {
            t1.push_str(t2);
            self.after_selection = next.after_selection;
        }
    }
}

/// Bounded undo/redo transaction stack with compression and clean state tracking.
#[derive(Debug, Clone)]
pub struct History {
    undo_stack: Vec<EditGroup>,
    redo_stack: Vec<EditGroup>,
    max_depth: usize,
    save_revision: u64,
    current_revision: u64,
}

impl History {
    /// Construct a new history tracker with specified maximum stack depth.
    pub fn new(max_depth: usize) -> Self {
        Self {
            undo_stack: Vec::new(),
            redo_stack: Vec::new(),
            max_depth: max_depth.max(1),
            save_revision: 0,
            current_revision: 0,
        }
    }

    /// Record a completed edit group, clearing any redo history.
    pub fn push(&mut self, group: EditGroup) {
        if group.operations.is_empty() {
            return;
        }
        self.redo_stack.clear();

        // Check if we can compress single-char typing with previous top
        if let Some(last) = self.undo_stack.last_mut() {
            if last.can_merge_with(&group) {
                last.merge(group);
                self.current_revision = self.current_revision.wrapping_add(1);
                return;
            }
        }

        if self.undo_stack.len() >= self.max_depth {
            self.undo_stack.remove(0);
        }
        self.undo_stack.push(group);
        self.current_revision = self.current_revision.wrapping_add(1);
    }

    /// Undo the most recent edit group, restoring buffer text and returning the prior selection set.
    pub fn undo(&mut self, buffer: &mut Buffer) -> EditorResult<SelectionSet> {
        let group = self
            .undo_stack
            .pop()
            .ok_or(EditorError::NothingToUndo)?;

        // Apply inverted operations in reverse order
        for op in group.operations.iter().rev() {
            op.invert().apply(buffer)?;
        }

        let restored_selection = group.before_selection.clone();
        self.redo_stack.push(group);
        self.current_revision = self.current_revision.wrapping_add(1);

        Ok(restored_selection)
    }

    /// Redo the most recently undone edit group, restoring buffer text and returning the post selection set.
    pub fn redo(&mut self, buffer: &mut Buffer) -> EditorResult<SelectionSet> {
        let group = self
            .redo_stack
            .pop()
            .ok_or(EditorError::NothingToRedo)?;

        for op in &group.operations {
            op.apply(buffer)?;
        }

        let restored_selection = group.after_selection.clone();
        self.undo_stack.push(group);
        self.current_revision = self.current_revision.wrapping_add(1);

        Ok(restored_selection)
    }

    /// Mark the current revision as clean/saved.
    pub fn mark_saved(&mut self) {
        self.save_revision = self.current_revision;
    }

    /// Return true if the document has been modified since `mark_saved`.
    pub fn is_dirty(&self) -> bool {
        self.save_revision != self.current_revision
    }

    /// Return number of available undo steps.
    pub fn undo_count(&self) -> usize {
        self.undo_stack.len()
    }

    /// Return number of available redo steps.
    pub fn redo_count(&self) -> usize {
        self.redo_stack.len()
    }

    /// Clear all undo and redo history.
    pub fn clear(&mut self) {
        self.undo_stack.clear();
        self.redo_stack.clear();
        self.save_revision = self.current_revision;
    }
}

impl Default for History {
    fn default() -> Self {
        Self::new(1000)
    }
}
