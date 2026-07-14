//! # ZeroDock Pure Editor Engine (`zerodock-editor`)
//!
//! Architecture Documentation:
//! `zerodock-editor` is a pure, UI-agnostic, deterministic text editor engine designed for cross-platform execution
//! on desktop (Tauri/Tokio) and WebAssembly (browser).
//!
//! ## Core Architectural Principles
//! - **Zero UI Dependencies**: This crate contains no Dioxus RSX, Tauri APIs, DOM access, or platform I/O calls.
//! - **Deterministic Event & Command Pipeline**: Given an identical initial `Document` and an identical input `Command`,
//!   the resulting state and emitted `DocumentEvent` vector are strictly deterministic.
//! - **Rope-Backed Storage**: Uses `ropey::Rope` for `O(log n)` insertion, deletion, line lookup, and UTF-8/UTF-16
//!   code-unit indexing. Large files (>1GB) do not cause allocation spikes.
//! - **Reversible Undo/Redo (Command Pattern)**: Every editing mutation generates an invertible `EditOperation` grouped
//!   into an atomic `EditGroup` within `History`.
//! - **Normalized Multi-Cursor**: All cursor and selection sets (`SelectionSet`) are automatically sorted and merged on
//!   any mutation, preventing overlapping selection bugs while preserving the primary cursor reference.
//! - **Incremental Viewport Rendering**: The `render_snapshot` method extracts only lines within the visible window plus
//!   overscan margin, enabling 60 FPS scrolling without full-buffer copies.

pub mod buffer;
pub mod command;
pub mod decorations;
pub mod document;
pub mod error;
pub mod folding;
pub mod history;
pub mod search;
pub mod selection;
pub mod viewport;

pub use buffer::{Buffer, LineEnding};
pub use command::Command;
pub use decorations::{Decoration, DecorationKind, DecorationManager, DiagnosticSeverity};
pub use document::{Document, DocumentEvent};
pub use error::{EditorError, EditorResult};
pub use folding::{FoldManager, FoldRegion};
pub use history::{EditGroup, EditOperation, History};
pub use search::{SearchEngine, SearchQuery};
pub use selection::{Selection, SelectionSet, RectangularSelection};
pub use viewport::{RenderCursor, RenderLine, RenderSnapshot, Viewport};
