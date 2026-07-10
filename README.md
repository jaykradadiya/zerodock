# ZeroDock

Privacy-first developer tools — **100% Rust** with [Dioxus](https://dioxuslabs.com) (web + desktop).

## Stack

- **UI:** Dioxus RSX (shared codebase)
- **Web:** WASM via `dx serve --platform web`
- **Desktop:** Tauri 2 + Dioxus native renderer
- **Logic:** `zerodock-core`, `zerodock-indexer`, `zerodock-platform` crates

## Prerequisites

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup target add wasm32-unknown-unknown

# Install Dioxus CLI (--locked avoids git2/auth-git2 version conflicts)
cargo install dioxus-cli --locked
```

## Development

```bash
# Web (browser, hot-reload)
dx serve --platform web

# Desktop (native window)
dx serve --platform desktop

# Run tests
cargo test --workspace

# Lint
cargo clippy --workspace -- -D warnings
```

## Build & Deploy

```bash
# Web bundle → dist/
dx bundle --platform web
wrangler deploy

# Desktop bundle
dx bundle --platform desktop
# or
cd src-tauri && cargo tauri build
```

## Project Structure

```
Cargo.toml              # Workspace root
app/                    # Dioxus RSX application (19 tools)
crates/
  zerodock-core/        # Crypto, diff, encode, JSON tools
  zerodock-indexer/     # mmap + byte-offset JSON indexer
  zerodock-platform/    # Storage, HTTP, file I/O abstractions
src-tauri/              # Tauri 2 desktop shell
Dioxus.toml             # Dioxus CLI config
```

## Tools (19 registered)

| Hub | Tools |
|-----|-------|
| JSON Toolkit | format, tree, table, YAML, types, JMESPath |
| HTTP Workshop | API tester, cURL converter |
| Encode/Decode | Base64, URL encoder |
| Security | Hash, JWT, RSA |
| Standalone | Diff, Epoch, Regex, Mock Data, Token Counter |

### Platform capabilities

| Feature | Web | Desktop |
|---------|-----|---------|
| All 19 tools | ✓ | ✓ |
| Large JSON (10 GB) | ~500 MB | ✓ (mmap) |
| CORS-free API tester | ✗ | ✓ |
