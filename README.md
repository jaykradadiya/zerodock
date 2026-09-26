# ZeroDock — Privacy-First Web Utilities & Developer Toolbox

ZeroDock is an ultra-responsive, privacy-first suite of developer tools running 100% locally inside your browser. No server uploads, no user tracking, no account registration required.

---

## 🎨 Design System & UI/UX Architecture

ZeroDock is designed to feel like a high-precision developer instrument—drawing inspiration from modern engineering environments like Vercel, Linear, and macOS utilities.

### Design Principles (Anti-AI Aesthetic Rules)

When adding new tools or updating UI components in ZeroDock, follow these anti-AI design rules:

1. **Restraint Over Decoration**:
   - Avoid generic AI-generated tropes like massive floating gradient blobs, over-used blurred orbs, or rainbow gradients on every header.
   - Use **structural CSS grid lines** (`.zd-hero-grid`) and clean subtle radial gradients instead.

2. **Distinctive Color Palette**:
   - **Primary Violet**: `var(--zd-primary)` (`#6C5CE7` light / `#8B7CF7` dark) — Used for key CTAs, active states, focus rings, and primary highlights.
   - **Warm Amber Accent**: `var(--zd-accent)` (`#D4931F` light / `#F0A030` dark) — Used for accent highlights, pulse indicators, and status tags.
   - **Category-Specific Icon Tints**: Each tool category uses distinct pastel background/foreground tints for immediate visual differentiation:
     - **Data**: Indigo (`rgba(99,102,241,0.12)`)
     - **Network**: Amber (`var(--zd-accent-soft)`)
     - **Encoding**: Sky (`rgba(56,189,248,0.1)`)
     - **Security**: Coral (`rgba(225,112,85,0.1)`)
     - **Text**: Emerald (`rgba(52,211,153,0.1)`)
     - **Converters**: Cyan (`rgba(14,165,233,0.1)`)
     - **Generators**: Pink (`rgba(236,72,153,0.1)`)

3. **Unified Single-Grid Layout**:
   - Keep tool browsing uncluttered. Avoid multi-section fragmentation (e.g., separate Starred, Recent, Popular cards).
   - Use a single unified grid with category filters and view toggles (grid/list).
   - Featured tools lead the grid with a Bento hero layout (top tool spans 2 columns on desktop).

4. **Monospace Metadata & Stat-Driven UI**:
   - Use `Roboto Mono` / `var(--font-mono)` for technical values, stats (`.zd-stat`), badges, keyboard shortcuts (`kbd`), and code snippets.
   - Feature blocks lead with quantitative metrics (`0 bytes`, `< 50ms`, `0 accounts`).

---

## 🛠️ Design Tokens (CSS Variables)

Always use established CSS custom properties instead of hardcoded raw Tailwind colors:

```css
/* Backgrounds */
bg-[var(--zd-bg)]
bg-[var(--zd-surface)]
bg-[var(--zd-surface-raised)]

/* Text Colors */
text-[var(--zd-text-primary)]
text-[var(--zd-text-secondary)]
text-[var(--zd-text-muted)]

/* Primary & Accent */
text-[var(--zd-primary)]
bg-[var(--zd-primary-soft)]
text-[var(--zd-accent)]
bg-[var(--zd-accent-soft)]

/* Borders & Shadows */
border-[var(--zd-border)]
border-[var(--zd-border-hover)]
shadow-[var(--zd-shadow-sm)]
shadow-[var(--zd-shadow-md)]
```

---

## 🏗️ 4 Pillars & Non-Destructive Pipeline Strategy

Every new tool created for ZeroDock must adhere to these 4 architectural pillars:

1. **State Persistence (`createToolStore`)**:
   - Store configurations using `createToolStore` with IndexedDB/sessionStorage. Sensitive security tools (`jwt-decoder`, `hash-generator`) explicitly run in **Ephemeral Mode** to prevent persistent storage of secrets.
2. **URL Link Sharing (`useSyncToolUrl`)**:
   - Sync interactive input parameters to the URL query string so configurations can be shared instantly. Never sync auth tokens or crypto secrets.
3. **Export & Download (`exportToFile`)**:
   - Provide clean export/download functionality for generated text, code, or data payloads.
4. **Non-Destructive Inter-Tool Pipeline (`usePipelineStore`)**:
   - Inter-tool data transfer must **never overwrite existing user work**:
     * **Multi-Tab Workspaces (JSON Toolkit)**: If the active tab has unsaved content, incoming piped data automatically creates a new tab (`piped.json`) without mutating the existing tab.
     * **Single-Buffer Tools (Base64 Codec, URL Encoder)**: If the input already contains text, displays a [`PipelineCollisionBanner`](file:///Users/jayradadiya/company/personal/ZeroDock/src/shared/components/PipelineCollisionBanner.tsx) prompting the user to *"Replace Current Input"* or *"Dismiss"*.
     * **Dual-Pane Tools (Diff Checker)**: Automatically fills empty sides (Left vs Right), or prompts which buffer to compare against.

---

## 🔒 Privacy, Security & Storage Disclosure

ZeroDock makes privacy provable, not just a marketing claim:

1. **100% In-Browser Execution**: All transformations, hashing, formatting, and diffing execute strictly in the client runtime or local background Web Workers.
2. **Offline Monaco Editor**: The Monaco code editor is bundled directly into client chunks with local workers. It never downloads assets from external CDNs (`cdn.jsdelivr.net`).
3. **Strict Content Security Policy (CSP)**: Enforced via `_headers` and `<meta>` tags:
   * Restricts `connect-src` strictly to same-origin and verified endpoints (`api.github.com` for stars, `cloudflareinsights.com` for analytics).
   * Blocks arbitrary outgoing network requests.
4. **Automated CI Network Audit**: `npm run audit:network` verifies on every build that zero unauthorized remote endpoints or tracking beacons exist in the distribution bundle.
5. **Storage & Ephemeral Mode**:
   * **Security Tools (`jwt-decoder`, `hash-generator`)**: Operate in **Ephemeral Mode**. Sensitive JWT credentials and HMAC secret keys are kept strictly in memory and are **never** persisted to disk (IndexedDB/Storage) or serialized into URL search strings.
   * **Productivity Tools (`json-toolkit`, `diff-checker`, `epoch-converter`)**: Persist non-sensitive workspaces to local browser storage (`idb-keyval` / `sessionStorage`) so edits survive browser restarts.

---

## 🚀 Getting Started

### Prerequisites
- Node.js >= 18
- Yarn or npm

### Local Development Setup

```bash
# Install dependencies
yarn install

# Start local development server (Vite + HMR)
yarn dev

# Run TypeScript type verification
npx tsc --noEmit

# Build production bundle
yarn build
```

---

## 📁 Repository Structure

```
src/
├── assets/          # Static branding & graphics
├── core/            # Registry, router, persistent Zustand stores
├── landing/         # Landing page sections (Hero, ToolsGrid, Features, CTABanner, Footer)
├── modules/         # Tool hubs & standalone tool implementations
├── shared/          # Reusable UI primitives, hooks, utilities, context
├── types/           # TypeScript contracts and tool metadata
└── workers/         # Dedicated Web Workers for heavy compute
```
