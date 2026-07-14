use criterion::{black_box, criterion_group, criterion_main, Criterion};
use zerodock_editor::*;

fn benchmark_typing_latency(c: &mut Criterion) {
    let text = "fn main() {\n    println!(\"Hello world\");\n}\n".repeat(1000); // ~40,000 chars
    c.bench_function("insert_char_100k_buffer", |b| {
        b.iter_with_setup(
            || Document::new(&text),
            |mut doc| {
                doc.execute_command(black_box(Command::InsertText("a".to_string()))).unwrap();
            },
        );
    });
}

fn benchmark_render_snapshot(c: &mut Criterion) {
    let text = "Line content here for testing overscan snapshot rendering\n".repeat(10_000); // 10,000 lines
    let doc = Document::new(&text);
    let vp = Viewport::new(5000, 50, 10);

    c.bench_function("render_snapshot_10k_lines", |b| {
        b.iter(|| {
            let snapshot = doc.render_snapshot(black_box(&vp)).unwrap();
            black_box(snapshot);
        });
    });
}

criterion_group!(benches, benchmark_typing_latency, benchmark_render_snapshot);
criterion_main!(benches);
