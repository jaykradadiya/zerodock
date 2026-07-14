//! # Editor Commands Module
//!
//! Architecture Documentation:
//! Defines the complete enum of commands (`Command`) accepted by the deterministic editor engine (`Document::execute_command`).
//!
//! Invariants:
//! - All commands are self-contained value objects that fully specify an editing action or navigation request.
//! - Executing any command is deterministic: given identical `Document` state and identical `Command`, the resulting state is guaranteed identical.
//!
//! Ownership & Lifetimes:
//! Commands own any strings or parameters they carry (`String`, `usize`, etc.).

use crate::selection::Selection;

/// Complete catalog of commands supported by the `zerodock-editor` engine.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Command {
    // --- Navigation Commands ---
    /// Move cursors left by `count` characters. If `select` is true, extend selection anchor.
    MoveLeft {
        /// Number of characters to move.
        count: usize,
        /// Extend selection range instead of collapsing to caret.
        select: bool,
    },
    /// Move cursors right by `count` characters.
    MoveRight {
        /// Number of characters to move.
        count: usize,
        /// Extend selection range.
        select: bool,
    },
    /// Move cursors up by `count` lines.
    MoveUp {
        /// Number of lines to move.
        count: usize,
        /// Extend selection range.
        select: bool,
    },
    /// Move cursors down by `count` lines.
    MoveDown {
        /// Number of lines to move.
        count: usize,
        /// Extend selection range.
        select: bool,
    },
    /// Move cursors to the start of their current line.
    MoveToLineStart {
        /// Extend selection range.
        select: bool,
    },
    /// Move cursors to the end of their current line.
    MoveToLineEnd {
        /// Extend selection range.
        select: bool,
    },
    /// Move cursors to the start of the entire buffer.
    MoveToBufferStart {
        /// Extend selection range.
        select: bool,
    },
    /// Move cursors to the end of the entire buffer.
    MoveToBufferEnd {
        /// Extend selection range.
        select: bool,
    },
    /// Jump directly to a 0-indexed line number.
    GoToLine {
        /// Target 0-indexed line number.
        line: usize,
    },
    /// Jump to matching bracket if cursor is adjacent to one.
    GoToMatchingBracket,

    // --- Selection Commands ---
    /// Select the entire buffer (`0..char_len`).
    SelectAll,
    /// Select the word surrounding each cursor.
    SelectWord,
    /// Select the entire line surrounding each cursor.
    SelectLine,
    /// Set a single explicit selection range.
    SetSelection(Selection),
    /// Add an additional secondary cursor/selection.
    AddSelection(Selection),
    /// Clear all secondary cursors, keeping only the primary selection.
    ClearSecondaryCursors,

    // --- Editing Commands ---
    /// Insert arbitrary text string at all active cursor positions (replacing selections).
    InsertText(String),
    /// Insert a single character with auto-closing bracket/quote rules if applicable.
    InsertCharWithAutoClose(char),
    /// Delete one character before each cursor (Backspace), or delete active selections.
    DeleteBackward,
    /// Delete one character after each cursor (Delete), or delete active selections.
    DeleteForward,
    /// Delete the entire line(s) spanned by each cursor.
    DeleteLine,
    /// Duplicate the line(s) spanned by each cursor.
    DuplicateLine,
    /// Move the line(s) spanned by each cursor up one line.
    MoveLineUp,
    /// Move the line(s) spanned by each cursor down one line.
    MoveLineDown,
    /// Join the current line with the next line for each cursor.
    JoinLines,
    /// Indent the selected line(s) by inserting leading spaces or tab.
    Indent,
    /// Outdent the selected line(s) by removing leading spaces or tab.
    Outdent,
    /// Toggle line comments on selected line(s).
    CommentToggle {
        /// Comment syntax prefix (e.g. `"//"` or `"#"`).
        prefix: String,
    },
    /// Surround active selection ranges with a prefix and suffix pair (e.g. `"("`, `")"`).
    SurroundSelection {
        /// Opening string.
        open: String,
        /// Closing string.
        close: String,
    },

    // --- History Commands ---
    /// Undo the most recent edit group.
    Undo,
    /// Redo the most recently undone edit group.
    Redo,

    // --- Folding Commands ---
    /// Toggle code fold state on the line containing the primary cursor.
    ToggleFold,
    /// Fold all collapsible regions in the document.
    FoldAll,
    /// Unfold all regions in the document.
    UnfoldAll,

    // --- Bookmark Commands ---
    /// Toggle a bookmark on the line containing the primary cursor.
    ToggleBookmark,
    /// Jump to the next bookmark in the buffer.
    NextBookmark,
    /// Jump to the previous bookmark in the buffer.
    PrevBookmark,
}
