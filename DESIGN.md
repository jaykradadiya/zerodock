---
name: ZeroDock Developer Suite Design System
colors:
  surface: '#0A0A0A'
  surface-dim: '#0A0A0A'
  surface-bright: '#262626'
  surface-container-lowest: '#050505'
  surface-container-low: '#121212'
  surface-container: '#1A1A1A'
  surface-container-high: '#262626'
  surface-container-highest: '#333333'
  on-surface: '#F5F5F5'
  on-surface-variant: '#A3A3A3'
  inverse-surface: '#FFFFFF'
  inverse-on-surface: '#1A1A1A'
  outline: '#262626'
  outline-variant: '#404040'
  surface-tint: '#8B7CF7'
  primary: '#8B7CF7'
  on-primary: '#0A0A0A'
  primary-container: '#6C5CE7'
  on-primary-container: '#FFFFFF'
  inverse-primary: '#5A4BD6'
  secondary: '#F0A030'
  on-secondary: '#0A0A0A'
  secondary-container: '#D4931F'
  on-secondary-container: '#FFFFFF'
  tertiary: '#F0A030'
  on-tertiary: '#0A0A0A'
  tertiary-container: '#D4931F'
  on-tertiary-container: '#FFFFFF'
  error: '#FF7675'
  on-error: '#4D0000'
  error-container: '#93000A'
  on-error-container: '#FFDAD6'
  background: '#0A0A0A'
  on-background: '#F5F5F5'
  surface-variant: '#1A1A1A'
typography:
  display:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '800'
    lineHeight: '1.04'
    letterSpacing: -0.04em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.03em
  headline-sm:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: '1.4'
    letterSpacing: -0.01em
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: 0em
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: '1.5'
    letterSpacing: 0em
  code-md:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: 0em
  code-sm:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '500'
    lineHeight: '1.4'
    letterSpacing: 0.02em
  label-caps:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: 0.14em
rounded:
  sm: 0.5rem
  DEFAULT: 0.75rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 40px
  2xl: 64px
  container-max: 1600px
  gutter: 24px
---

## Brand & Style

ZeroDock is a privacy-first, client-side-only suite of developer tools. The interface is engineered to feel like an ultra-responsive, high-fidelity precision instrument—drawing inspiration from top-tier engineering environments like Vercel, Linear, and Raycast.

The aesthetic style is **Minimalist-Technical & Anti-AI**. It deliberately avoids generic AI design tropes (excessive floating gradient blobs, rainbow gradient headers everywhere) in favor of obsidian depth, structural grid backgrounds (`.zd-hero-grid`), single-accent line highlights, and crisp 1px borders.

## Colors & Accents

The palette balances dark obsidian surfaces with glowing primary violet and warm amber accents:

- **Primary Violet (`--zd-primary` / `#8B7CF7` dark, `#6C5CE7` light):** Used for primary CTAs, active selection states, focus rings, and hero underlines.
- **Warm Amber Accent (`--zd-accent` / `#F0A030` dark, `#D4931F` light):** Used for live status indicators, pulse dots, and secondary visual accents.
- **Category Icon Tints:**
  - **Data**: Indigo (`rgba(99,102,241,0.12)`)
  - **Network**: Amber (`var(--zd-accent-soft)`)
  - **Encoding**: Sky (`rgba(56,189,248,0.1)`)
  - **Security**: Coral (`rgba(225,112,85,0.1)`)
  - **Text**: Emerald (`rgba(52,211,153,0.1)`)
  - **Converters**: Cyan (`rgba(14,165,233,0.1)`)
  - **Generators**: Pink (`rgba(236,72,153,0.1)`)
- **Surfaces:** Tiered from base `#0A0A0A` to elevated `#121212` (`--zd-surface`) and `#1A1A1A` (`--zd-surface-raised`). Containers are delineated by thin `#262626` borders.
- **Text:** High-contrast `#F5F5F5` for primary content, `#A3A3A3` for secondary descriptions, and `#737373` for muted metadata.

## Typography

ZeroDock balances clean sans-serif readability with technical monospace precision.
- **Inter:** Utilized for UI labels, navigation, headers, body text, and section copy.
- **JetBrains Mono / Roboto Mono:** Reserved for technical inputs, JSON/code editors, terminal outputs, badges, keyboard shortcuts (`kbd`), stat numbers (`.zd-stat`), and uppercase section tags.

## Layout & Architecture

Built on a mathematical 4px baseline grid.
- **Hero Grid (`.zd-hero-grid`):** Subtle CSS linear-gradient grid pattern masked with radial gradients.
- **Unified Tool Grid:** One single grid with category filters and grid/list toggles. Top featured tools use a Bento hero layout (spanning 2 columns on desktop).
- **Stat-Driven Features:** Feature sections present quantitative stats (`0 bytes`, `< 50ms`, `0 accounts`) rather than generic cards.
- **Pre-Footer CTA Banner:** Focused statement ("Your browser is the server.") separated by gradient dividers (`.zd-section-divider`).

## Component Guidelines

### Buttons
- **Primary:** Solid `var(--zd-primary)` fill with white text, shadow, and soft glow hover lift.
- **Secondary / Ghost:** `var(--zd-surface)` background with `var(--zd-border)` border, transitioning to `var(--zd-primary-soft)` on hover.

### Tool Cards & Panels
- Dark surface (`var(--zd-surface)`), 1px border (`var(--zd-border)`), rounded corners (`16px`), category-specific icon backgrounds, and monospace tags.
