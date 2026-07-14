//! # Incremental Search & Replace Module
//!
//! Architecture Documentation:
//! Provides regex, literal, whole-word, and case-sensitive search capabilities over a `Buffer`.
//!
//! Invariants:
//! - Returned match ranges (`Range<usize>`) are always valid character bounds within `0..=buffer.char_len()`.
//! - Matches are returned in strictly ascending order and never overlap.
//!
//! Ownership & Lifetimes:
//! `SearchQuery` owns the search configuration and compiled regular expression matcher.

use std::ops::Range;
use regex::{Regex, RegexBuilder};
use crate::buffer::Buffer;
use crate::error::{EditorError, EditorResult};

/// Query parameters for finding text matches within a buffer.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SearchQuery {
    /// Target pattern string.
    pub pattern: String,
    /// Treat pattern as a regular expression.
    pub is_regex: bool,
    /// Perform case-sensitive matching.
    pub case_sensitive: bool,
    /// Match whole words only (`\bpattern\b`).
    pub whole_word: bool,
}

impl SearchQuery {
    /// Construct a new literal search query.
    pub fn literal(pattern: impl Into<String>) -> Self {
        Self {
            pattern: pattern.into(),
            is_regex: false,
            case_sensitive: true,
            whole_word: false,
        }
    }

    /// Compile this search query into a executable `Regex`.
    pub fn compile(&self) -> EditorResult<Regex> {
        let raw_pattern = if self.is_regex {
            self.pattern.clone()
        } else {
            regex::escape(&self.pattern)
        };

        let wrapped = if self.whole_word {
            format!(r"\b(?:{})\b", raw_pattern)
        } else {
            raw_pattern
        };

        RegexBuilder::new(&wrapped)
            .case_insensitive(!self.case_sensitive)
            .build()
            .map_err(|e| EditorError::InvalidRegex {
                message: e.to_string(),
            })
    }
}

/// Search engine supporting match discovery and replacement generation.
#[derive(Debug, Default, Clone)]
pub struct SearchEngine;

impl SearchEngine {
    /// Construct a new search engine instance.
    pub fn new() -> Self {
        Self
    }

    /// Find all non-overlapping character matches of `query` within `buffer`.
    ///
    /// # Complexity
    /// O(n) where n is buffer byte length.
    pub fn find_all(&self, buffer: &Buffer, query: &SearchQuery) -> EditorResult<Vec<Range<usize>>> {
        if query.pattern.is_empty() {
            return Ok(Vec::new());
        }

        let regex = query.compile()?;
        // Convert rope to contiguous string or iterate chunks.
        // For accurate regex character boundaries across the entire buffer, slice entire string representation.
        let text = buffer.slice_to_string(0..buffer.char_len())?;

        let mut matches = Vec::new();
        for mat in regex.find_iter(&text) {
            let start_byte = mat.start();
            let end_byte = mat.end();

            let start_char = buffer.byte_to_char(start_byte)?;
            let end_char = buffer.byte_to_char(end_byte)?;

            matches.push(start_char..end_char);
        }

        Ok(matches)
    }

    /// Compute the replacement string for a specific match given a replacement pattern.
    pub fn compute_replacement(
        &self,
        matched_text: &str,
        query: &SearchQuery,
        replacement: &str,
    ) -> EditorResult<String> {
        if !query.is_regex {
            return Ok(replacement.to_string());
        }
        let regex = query.compile()?;
        Ok(regex.replace(matched_text, replacement).to_string())
    }
}
