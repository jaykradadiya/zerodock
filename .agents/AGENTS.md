---
description: ZeroDock — Rust / Dioxus Engineering Guidelines
globs: **/*.rs, **/*.toml, **/*.css
alwaysApply: true
---

# ZeroDock — AI Engineering Ruleset (Rust)

## Stack

- **UI:** Dioxus RSX (`app/`) — shared web (WASM) + desktop (native) codebase
- **Desktop shell:** Tauri 2 (`src-tauri/`)
- **Business logic:** `crates/zerodock-core` (no UI dependencies)
- **Platform I/O:** `crates/zerodock-platform` (storage, HTTP, files)
- **JSON indexer:** `crates/zerodock-indexer` (mmap on desktop)

## Hard Rules

1. **No JavaScript/TypeScript** — 100% Rust for UI and logic
2. **Design tokens** — use `--zd-*` CSS variables, never raw Tailwind palette colors
3. **Platform isolation** — `#[cfg]` and traits live in `zerodock-platform`, not in RSX components
4. **Privacy first** — all processing client-side; no telemetry

## Commands

```bash
dx serve --platform web       # dev web
dx serve --platform desktop   # dev desktop
cargo test --workspace        # tests
cargo clippy --workspace      # lint
dx bundle --platform web      # production web
```

## Tool conventions

- Register tools in `app/src/registry.rs` (19 routes)
- Hub tools in `app/src/hubs/`, standalone in `app/src/tools/`
- Core algorithms in `zerodock-core`, never duplicated in UI

## Persistence

- Web: `gloo-storage` (localStorage)
- Desktop: `rusqlite` in app data dir
- Tool state keys: `zerodock-tool-{id}`
