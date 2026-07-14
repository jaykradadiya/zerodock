use proptest::prelude::*;
use zerodock_editor::*;

proptest! {
    #[test]
    fn prop_selection_set_always_normalized(
        anchors in proptest::collection::vec(0usize..1000, 1..20),
        heads in proptest::collection::vec(0usize..1000, 1..20),
    ) {
        let len = anchors.len().min(heads.len());
        let mut selections = Vec::new();
        for i in 0..len {
            selections.push(Selection::new(anchors[i], heads[i]));
        }
        let set = SelectionSet::from_selections(selections, 0);

        let slice = set.as_slice();
        prop_assert!(!slice.is_empty(), "SelectionSet must never be empty");

        // Verify sorted order and no overlaps
        for i in 0..slice.len().saturating_sub(1) {
            let r1 = slice[i].range();
            let r2 = slice[i + 1].range();
            prop_assert!(r1.start <= r2.start, "Selections must be sorted by range start");
            prop_assert!(r1.end < r2.start, "Selections must never overlap or touch after normalization");
        }
    }

    #[test]
    fn prop_undo_restores_exact_state(
        insertions in proptest::collection::vec("[a-zA-Z0-9 \n]{1,20}", 1..10)
    ) {
        let initial_text = "Initial buffer content\nWith multiple lines\n";
        let mut doc = Document::new(initial_text);

        for text in &insertions {
            doc.execute_command(Command::InsertText(text.clone())).unwrap();
        }

        // Undo every insertion
        for _ in 0..insertions.len() {
            doc.execute_command(Command::Undo).unwrap();
        }

        let final_text = doc.buffer().slice_to_string(0..doc.buffer().char_len()).unwrap();
        prop_assert_eq!(final_text, initial_text);
    }
}
