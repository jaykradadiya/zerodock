use criterion::{black_box, criterion_group, criterion_main, Criterion};
use zerodock_indexer::JsonIndex;

fn bench_index_1mb(c: &mut Criterion) {
    let json = format!("{{\"items\": [{}]}}", (0..5000).map(|i| format!("{{\"id\":{i},\"name\":\"item{i}\"}}")).collect::<Vec<_>>().join(","));
    c.bench_function("index_1mb_approx", |b| {
        b.iter(|| {
            black_box(JsonIndex::from_bytes(black_box(json.as_bytes())).unwrap());
        });
    });
}

criterion_group!(benches, bench_index_1mb);
criterion_main!(benches);
