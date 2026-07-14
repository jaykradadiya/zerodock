//! # Editor Error Definitions
//!
//! Architecture Documentation:
//! Defines strongly-typed error conditions for all operations within the pure editor engine (`zerodock-editor`).
//!
//! Ownership & Lifetimes:
//! All error types are `'static` owned values with no borrowed references, ensuring trivial propagation across thread or async boundaries.

use thiserror::Error;

/// Error variants produced by operations within the `zerodock-editor` engine.
#[derive(Debug, Error, Clone, PartialEq, Eq)]
pub enum EditorError {
    /// Attempted to reference a character index that exceeds the total characters in the buffer.
    #[error("Character index out of bounds: requested {requested}, total {len}")]
    CharIndexOutOfBounds {
        /// The requested character offset.
        requested: usize,
        /// Total number of characters in the buffer.
        len: usize,
    },

    /// Attempted to reference a line index that exceeds the total lines in the buffer.
    #[error("Line index out of bounds: requested {requested}, total lines {total_lines}")]
    LineIndexOutOfBounds {
        /// The requested 0-indexed line.
        requested: usize,
        /// Total number of lines in the buffer.
        total_lines: usize,
    },

    /// Attempted to reference a byte index that exceeds the total bytes in the buffer.
    #[error("Byte index out of bounds: requested {requested}, total bytes {len}")]
    ByteIndexOutOfBounds {
        /// The requested byte offset.
        requested: usize,
        /// Total number of bytes in the buffer.
        len: usize,
    },

    /// Attempted an operation requiring a non-empty selection when no range was selected.
    #[error("Operation requires a non-empty selection")]
    EmptySelection,

    /// Regular expression compilation failed during search.
    #[error("Invalid regular expression pattern: {message}")]
    InvalidRegex {
        /// Explanation of why the regex failed to compile.
        message: String,
    },

    /// Attempted to execute an undo command when the undo history stack is empty.
    #[error("Nothing to undo")]
    NothingToUndo,

    /// Attempted to execute a redo command when the redo history stack is empty.
    #[error("Nothing to redo")]
    NothingToRedo,

    /// An internal invariant was violated during multi-cursor normalization or history restoration.
    #[error("Internal editor engine invariant violated: {message}")]
    InvariantViolation {
        /// Detailed explanation of the violated invariant.
        message: String,
    },
}

/// Convenient result alias for operations returning an `EditorError`.
pub type EditorResult<T> = Result<T, EditorError>;
