//! # Text Buffer Module
//!
//! Architecture Documentation:
//! The `Buffer` struct wraps `ropey::Rope`, providing deterministic, O(log n) text mutations
//! and fast conversions between character indices, byte offsets, UTF-16 code units, and line numbers.
//!
//! Invariants:
//! - Character indices are always valid Unicode scalar value boundaries within `0..=char_len()`.
//! - Line indices are 0-indexed within `0..line_count()`.
//! - All mutating operations (`insert`, `remove`) are O(log n) and preserve valid UTF-8 and rope balance.
//!
//! Ownership & Lifetimes:
//! `Buffer` owns the underlying `ropey::Rope` tree. String slices produced by `slice()` copy only the requested range.

use std::ops::Range;
use ropey::Rope;
use crate::error::{EditorError, EditorResult};

/// Detected line ending convention for the buffer.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum LineEnding {
    /// Unix line ending (`\n`).
    Lf,
    /// Windows line ending (`\r\n`).
    CrLf,
}

/// Core text buffer backed by `ropey::Rope`.
#[derive(Debug, Clone)]
pub struct Buffer {
    rope: Rope,
    line_ending: LineEnding,
}

impl Buffer {
    /// Create a new empty buffer with LF line endings.
    ///
    /// # Complexity
    /// O(1) time and space.
    pub fn new() -> Self {
        Self {
            rope: Rope::new(),
            line_ending: LineEnding::Lf,
        }
    }

    /// Construct a buffer from an initial text slice, automatically detecting line endings.
    ///
    /// # Complexity
    /// O(n) where n is the length of `text` in bytes.
    pub fn from_str(text: &str) -> Self {
        let line_ending = if text.contains("\r\n") {
            LineEnding::CrLf
        } else {
            LineEnding::Lf
        };
        Self {
            rope: Rope::from_str(text),
            line_ending,
        }
    }

    /// Return the total number of Unicode scalar values (characters) in the buffer.
    ///
    /// # Complexity
    /// O(1).
    pub fn char_len(&self) -> usize {
        self.rope.len_chars()
    }

    /// Return the total number of bytes in the buffer.
    ///
    /// # Complexity
    /// O(1).
    pub fn byte_len(&self) -> usize {
        self.rope.len_bytes()
    }

    /// Return the total number of lines in the buffer (always at least 1).
    ///
    /// # Complexity
    /// O(1).
    pub fn line_count(&self) -> usize {
        self.rope.len_lines()
    }

    /// Return the detected line ending convention.
    pub fn line_ending(&self) -> LineEnding {
        self.line_ending
    }

    /// Convert a 0-indexed character offset to its 0-indexed line number.
    ///
    /// # Complexity
    /// O(log n) where n is buffer size.
    pub fn char_to_line(&self, char_idx: usize) -> EditorResult<usize> {
        if char_idx > self.char_len() {
            return Err(EditorError::CharIndexOutOfBounds {
                requested: char_idx,
                len: self.char_len(),
            });
        }
        Ok(self.rope.char_to_line(char_idx))
    }

    /// Convert a 0-indexed line number to the character index at the start of that line.
    ///
    /// # Complexity
    /// O(log n).
    pub fn line_to_char(&self, line_idx: usize) -> EditorResult<usize> {
        if line_idx >= self.line_count() && self.line_count() > 0 && line_idx != 0 {
            return Err(EditorError::LineIndexOutOfBounds {
                requested: line_idx,
                total_lines: self.line_count(),
            });
        }
        Ok(self.rope.line_to_char(line_idx))
    }

    /// Convert a character index to a byte offset.
    ///
    /// # Complexity
    /// O(log n).
    pub fn char_to_byte(&self, char_idx: usize) -> EditorResult<usize> {
        if char_idx > self.char_len() {
            return Err(EditorError::CharIndexOutOfBounds {
                requested: char_idx,
                len: self.char_len(),
            });
        }
        Ok(self.rope.char_to_byte(char_idx))
    }

    /// Convert a byte offset to a character index.
    ///
    /// # Complexity
    /// O(log n).
    pub fn byte_to_char(&self, byte_idx: usize) -> EditorResult<usize> {
        if byte_idx > self.byte_len() {
            return Err(EditorError::ByteIndexOutOfBounds {
                requested: byte_idx,
                len: self.byte_len(),
            });
        }
        Ok(self.rope.byte_to_char(byte_idx))
    }

    /// Return the number of characters in the specified line, including any trailing newline characters.
    ///
    /// # Complexity
    /// O(log n).
    pub fn line_len_chars(&self, line_idx: usize) -> EditorResult<usize> {
        if line_idx >= self.line_count() {
            return Err(EditorError::LineIndexOutOfBounds {
                requested: line_idx,
                total_lines: self.line_count(),
            });
        }
        Ok(self.rope.line(line_idx).len_chars())
    }

    /// Convert a UTF-16 code unit offset within the entire buffer to a Rust `char` index.
    ///
    /// # Complexity
    /// O(n) worst-case over UTF-16 code units.
    pub fn utf16_to_char(&self, utf16_offset: usize) -> usize {
        let mut units = 0usize;
        for (idx, ch) in self.rope.chars().enumerate() {
            if units >= utf16_offset {
                return idx;
            }
            units += ch.len_utf16();
        }
        self.char_len()
    }

    /// Convert a Rust `char` index to a UTF-16 code unit offset.
    ///
    /// # Complexity
    /// O(k) where k is `char_idx`.
    pub fn char_to_utf16(&self, char_idx: usize) -> EditorResult<usize> {
        if char_idx > self.char_len() {
            return Err(EditorError::CharIndexOutOfBounds {
                requested: char_idx,
                len: self.char_len(),
            });
        }
        let mut units = 0usize;
        for ch in self.rope.chars().take(char_idx) {
            units += ch.len_utf16();
        }
        Ok(units)
    }

    /// Insert a text slice at a given character index.
    ///
    /// # Complexity
    /// O(log n + m) where n is buffer size and m is inserted slice length.
    pub fn insert(&mut self, char_idx: usize, text: &str) -> EditorResult<()> {
        if char_idx > self.char_len() {
            return Err(EditorError::CharIndexOutOfBounds {
                requested: char_idx,
                len: self.char_len(),
            });
        }
        self.rope.insert(char_idx, text);
        Ok(())
    }

    /// Remove a range of characters `start..end`.
    ///
    /// # Complexity
    /// O(log n).
    pub fn remove(&mut self, char_range: Range<usize>) -> EditorResult<()> {
        if char_range.start > self.char_len() {
            return Err(EditorError::CharIndexOutOfBounds {
                requested: char_range.start,
                len: self.char_len(),
            });
        }
        if char_range.end > self.char_len() || char_range.end < char_range.start {
            return Err(EditorError::CharIndexOutOfBounds {
                requested: char_range.end,
                len: self.char_len(),
            });
        }
        self.rope.remove(char_range);
        Ok(())
    }

    /// Extract a contiguous `String` copy for a character range.
    ///
    /// # Complexity
    /// O(log n + m) where m is range length.
    pub fn slice_to_string(&self, char_range: Range<usize>) -> EditorResult<String> {
        if char_range.start > self.char_len() || char_range.end > self.char_len() || char_range.end < char_range.start {
            return Err(EditorError::CharIndexOutOfBounds {
                requested: char_range.end,
                len: self.char_len(),
            });
        }
        Ok(self.rope.slice(char_range).to_string())
    }

    /// Return the text of a 0-indexed line as a `String`.
    ///
    /// # Complexity
    /// O(log n + line_len).
    pub fn line_to_string(&self, line_idx: usize) -> EditorResult<String> {
        if line_idx >= self.line_count() {
            return Err(EditorError::LineIndexOutOfBounds {
                requested: line_idx,
                total_lines: self.line_count(),
            });
        }
        Ok(self.rope.line(line_idx).to_string())
    }

    /// Read-only access to the underlying rope reference.
    pub fn as_rope(&self) -> &Rope {
        &self.rope
    }
}

impl Default for Buffer {
    fn default() -> Self {
        Self::new()
    }
}
