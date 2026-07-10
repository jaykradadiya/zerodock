# Memory Profiling — JSON Indexer

Run on desktop with a release build after generating fixture files.

## Generate fixtures

```bash
# ~1 MB
python3 -c "import json; print(json.dumps({'items':[{'id':i,'name':f'item{i}'} for i in range(5000)]}))" > /tmp/test_1mb.json

# ~100 MB (adjust count)
python3 -c "import json; print(json.dumps({'items':[{'id':i} for i in range(500000)]}))" > /tmp/test_100mb.json
```

## Criterion benchmarks

```bash
cargo bench -p zerodock-indexer
```

## Desktop targets

| Test | Target |
|------|--------|
| Open 10 GB JSON (mmap) | < 1s to first tree row |
| RSS during browse | < 300 MB |
| Scroll 1M+ nodes | 60 FPS (virtualized) |
| Index 1 GB file | < 30s background |

## macOS profiling

```bash
# While app is browsing a large file:
ps -o rss= -p $(pgrep zerodock)
# Or use Instruments → Allocations
```

## Notes

- `memmap2` maps file pages on demand — RSS stays low until regions are accessed.
- Index sidecar `.zdindex` enables instant re-open without re-scanning.
