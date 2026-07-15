# ZeroDock

Privacy-first developer tools — **100% Rust** with [Dioxus](https://dioxuslabs.com) (web + desktop).

## Mission

ZeroDock is a privacy-first, local-first toolkit for developers. Every tool runs entirely on your device — nothing is uploaded, no account is required, no telemetry is collected. Built entirely in Rust and compiled to native desktop and WebAssembly, it delivers the performance and trust of a native application with the reach of the web. We optimize for craft over flash: calm, fast, dependable tools that respect your data and your attention.

## Premium Design Direction

The application must look like it was designed by a senior product design team over several months—not generated in a single AI prompt.

### Design Philosophy

Design for elegance before decoration.

The interface should communicate quality through:

* Exceptional spacing
* Strong typography
* Clear visual hierarchy
* Purposeful whitespace
* Consistent proportions
* Refined interactions
* Thoughtful micro-details

Every pixel should feel intentional.

If any element feels unnecessary, remove it.

---

### Premium Design Language

Create a design language inspired by the craftsmanship of modern SaaS products—not by templates.

Characteristics:

* Sophisticated
* Editorial
* Calm
* Confident
* Luxurious without being flashy
* Minimal but never empty
* Highly polished
* Timeless rather than trendy

The interface should immediately communicate trust and professionalism.

---

### Visual Principles

Use visual weight instead of excessive colors.

Use spacing instead of borders.

Use typography instead of large icons.

Use alignment instead of decoration.

Use subtle elevation instead of heavy shadows.

Use contrast instead of gradients.

The interface should feel effortless.

---

### Premium Components

Every component should feel custom designed.

Buttons should have:

* Perfect proportions
* Elegant hover animations
* Refined shadows
* Excellent typography
* Comfortable padding

Cards should:

* Feel lightweight
* Use soft elevation
* Have generous spacing
* Never appear crowded

Tables should:

* Be extremely readable
* Feel clean
* Have subtle row interactions
* Avoid unnecessary borders

Forms should:

* Guide users naturally
* Minimize visual noise
* Group related information
* Feel approachable

Navigation should:

* Be simple
* Be elegant
* Require minimal cognitive effort
* Clearly indicate hierarchy

---

### Layout Principles

Avoid filling every inch of the screen.

Use generous whitespace.

Create breathing room between sections.

Content should naturally guide the user's eye.

Every page should have one obvious primary action.

Reduce visual competition.

---

### Typography First

Typography is the primary design element.

Use typography—not color—to establish hierarchy.

Maintain a consistent type scale.

Limit font weights.

Avoid oversized headings.

Body text should be highly readable.

---

### Color Philosophy

Less color creates a more premium experience.

Prefer:

* Neutral surfaces
* White space
* Soft grays
* One strong primary accent

Use color only to communicate:

* Actions
* Status
* Notifications
* Important information

Never use color purely for decoration.

---

### Motion Design

Motion should feel invisible.

Animations should:

* Improve clarity
* Reinforce hierarchy
* Never slow the user down

Prefer:

* Fade
* Scale
* Soft elevation
* Gentle slide
* Smooth opacity transitions

Avoid dramatic animations.

---

### Attention to Detail

The difference between average UI and exceptional UI is in the details.

Ensure:

* Perfect alignment
* Consistent spacing
* Optical balance
* Pixel-perfect padding
* Consistent border radius
* Uniform shadows
* Smooth hover states
* Consistent icon sizing

Nothing should feel accidental.

---

### Design Like a Human

Do not generate stereotypical AI interfaces.

Avoid:

* Repeated card layouts
* Generic dashboard templates
* Perfectly symmetrical layouts everywhere
* Random gradients
* Oversized icons
* Huge rounded corners
* Floating glass cards
* Colorful widgets
* Placeholder illustrations
* Empty decorative sections

Create asymmetry where appropriate.

Vary layouts naturally.

Make each page unique while remaining part of the same design system.

The result should feel handcrafted by experienced designers—not assembled from reusable AI patterns.

---

### Final Quality Checklist

Before completing each screen, ask:

* Would this design impress a senior product designer at Linear or Stripe?
* Does it feel handcrafted?
* Is every component visually balanced?
* Is spacing consistent throughout?
* Does it avoid common AI-generated design patterns?
* Is there a clear focal point?
* Can users understand the page in under five seconds?
* Does it feel like a premium product someone would pay for?

If the answer to any question is "No", continue refining until the interface reaches production-quality.

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
