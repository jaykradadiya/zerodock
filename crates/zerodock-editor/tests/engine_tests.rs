use zerodock_editor::*;

#[test]
fn test_buffer_creation_and_conversions() {
    let text = "First line\r\nSecond line\nThird line";
    let buf = Buffer::from_str(text);
    assert_eq!(buf.line_ending(), LineEnding::CrLf);
    assert_eq!(buf.line_count(), 3);

    let l0 = buf.line_to_string(0).unwrap();
    assert_eq!(l0, "First line\r\n");

    let char_pos = buf.line_to_char(1).unwrap();
    assert_eq!(char_pos, 12);
    assert_eq!(buf.char_to_line(12).unwrap(), 1);
}

#[test]
fn test_utf16_conversions() {
    // Emoji takes 2 UTF-16 code units
    let text = "Hello 😀 world";
    let buf = Buffer::from_str(text);

    // 'H','e','l','l','o',' ' -> 6 chars, 6 utf16 units
    // '😀' -> char index 6, utf16 index 6, length 2 utf16 units
    assert_eq!(buf.char_to_utf16(6).unwrap(), 6);
    assert_eq!(buf.char_to_utf16(7).unwrap(), 8); // after emoji
    assert_eq!(buf.utf16_to_char(8), 7);
}

#[test]
fn test_selection_normalization_and_merging() {
    // Overlapping selections should merge automatically
    let mut set = SelectionSet::from_selections(
        vec![
            Selection::new(5, 10),
            Selection::new(8, 15),
            Selection::new(20, 25),
        ],
        1,
    );
    assert_eq!(set.as_slice().len(), 2);
    assert_eq!(set.as_slice()[0], Selection::new(5, 15));
    assert_eq!(set.as_slice()[1], Selection::new(20, 25));
}

#[test]
fn test_document_insert_and_undo_redo() {
    let mut doc = Document::new("Hello world");
    doc.execute_command(Command::GoToLine { line: 0 }).unwrap();
    // Move to end of buffer
    doc.execute_command(Command::MoveToBufferEnd { select: false }).unwrap();

    doc.execute_command(Command::InsertText("!".to_string())).unwrap();
    assert_eq!(doc.buffer().slice_to_string(0..doc.buffer().char_len()).unwrap(), "Hello world!");

    // Undo should restore "Hello world"
    doc.execute_command(Command::Undo).unwrap();
    assert_eq!(doc.buffer().slice_to_string(0..doc.buffer().char_len()).unwrap(), "Hello world");

    // Redo should restore "Hello world!"
    doc.execute_command(Command::Redo).unwrap();
    assert_eq!(doc.buffer().slice_to_string(0..doc.buffer().char_len()).unwrap(), "Hello world!");
}

#[test]
fn test_multi_cursor_insert() {
    let mut doc = Document::new("cat\ndog\nbat");
    // Place cursors at end of each line
    let sel1 = Selection::caret(3);
    let sel2 = Selection::caret(7);
    let sel3 = Selection::caret(11);
    doc.execute_command(Command::SetSelection(sel1)).unwrap();
    doc.execute_command(Command::AddSelection(sel2)).unwrap();
    doc.execute_command(Command::AddSelection(sel3)).unwrap();

    doc.execute_command(Command::InsertText("s".to_string())).unwrap();
    assert_eq!(doc.buffer().slice_to_string(0..doc.buffer().char_len()).unwrap(), "cats\ndogs\nbats");

    // Undoing multi-cursor insert should revert all insertions
    doc.execute_command(Command::Undo).unwrap();
    assert_eq!(doc.buffer().slice_to_string(0..doc.buffer().char_len()).unwrap(), "cat\ndog\nbat");
}

#[test]
fn test_auto_closing_brackets() {
    let mut doc = Document::new("foo");
    doc.execute_command(Command::MoveToBufferEnd { select: false }).unwrap();
    doc.execute_command(Command::InsertCharWithAutoClose('(')).unwrap();

    assert_eq!(doc.buffer().slice_to_string(0..doc.buffer().char_len()).unwrap(), "foo()");
    // Cursor should be inside the parentheses
    assert_eq!(doc.selections().primary().head, 4);
}

#[test]
fn test_line_operations() {
    let mut doc = Document::new("one\ntwo\nthree");
    doc.execute_command(Command::GoToLine { line: 1 }).unwrap(); // line "two"
    doc.execute_command(Command::MoveLineUp).unwrap();
    assert_eq!(doc.buffer().slice_to_string(0..doc.buffer().char_len()).unwrap(), "two\none\nthree");

    doc.execute_command(Command::Undo).unwrap();
    assert_eq!(doc.buffer().slice_to_string(0..doc.buffer().char_len()).unwrap(), "one\ntwo\nthree");
}

#[test]
fn test_comment_toggle() {
    let mut doc = Document::new("fn main() {\n    println!();\n}");
    doc.execute_command(Command::SelectAll).unwrap();
    doc.execute_command(Command::CommentToggle { prefix: "//".to_string() }).unwrap();

    let commented = doc.buffer().slice_to_string(0..doc.buffer().char_len()).unwrap();
    assert!(commented.contains("// fn main() {"));

    // Toggle again should uncomment
    doc.execute_command(Command::SelectAll).unwrap();
    doc.execute_command(Command::CommentToggle { prefix: "//".to_string() }).unwrap();
    let uncommented = doc.buffer().slice_to_string(0..doc.buffer().char_len()).unwrap();
    assert_eq!(uncommented, "fn main() {\n    println!();\n}");
}

#[test]
fn test_search_and_replace() {
    let buf = Buffer::from_str("apple banana apple grape");
    let query = SearchQuery::literal("apple");
    let engine = SearchEngine::new();

    let matches = engine.find_all(&buf, &query).unwrap();
    assert_eq!(matches.len(), 2);
    assert_eq!(matches[0], 0..5);
    assert_eq!(matches[1], 13..18);
}

#[test]
fn test_render_snapshot_viewport_clamping() {
    // Create a 100-line buffer
    let text = (0..100).map(|i| format!("Line {}", i)).collect::<Vec<_>>().join("\n");
    let doc = Document::new(&text);

    // Request viewport around line 50 with visible_count=10 and overscan=5
    let vp = Viewport::new(50, 10, 5);
    let snapshot = doc.render_snapshot(&vp).unwrap();

    // 50 - 5 = 45 start line, 50 + 10 + 5 = 65 end line -> 20 lines extracted
    assert_eq!(snapshot.lines.len(), 20);
    assert_eq!(snapshot.lines[0].line_idx, 45);
    assert_eq!(snapshot.total_lines, 100);
}
