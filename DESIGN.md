---
name: ZeroDock AI Developer Suite
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
  outline: '#404040'
  outline-variant: '#262626'
  surface-tint: '#8B7CF7'
  primary: '#8B7CF7'
  on-primary: '#0A0A0A'
  primary-container: '#6C5CE7'
  on-primary-container: '#FFFFFF'
  inverse-primary: '#5A4BD6'
  secondary: '#00DFB8'
  on-secondary: '#00332A'
  secondary-container: '#00C9A7'
  on-secondary-container: '#001A15'
  tertiary: '#00DFB8'
  on-tertiary: '#00332A'
  tertiary-container: '#00C9A7'
  on-tertiary-container: '#001A15'
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
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.03em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.02em
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
    fontFamily: Roboto Mono
    fontSize: 13px
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: 0em
  code-sm:
    fontFamily: Roboto Mono
    fontSize: 11px
    fontWeight: '500'
    lineHeight: '1.4'
    letterSpacing: 0.02em
  label-caps:
    fontFamily: Roboto Mono
    fontSize: 11px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: 0.08em
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
  container-max: 1200px
  gutter: 24px
---

## Brand & Style
ZeroDock is a privacy-first, client-side-only suite of developer tools. The interface is engineered to feel like an ultra-responsive, high-fidelity precision instrument—drawing inspiration from top-tier engineering environments like Vercel, Linear, and macOS Dock.

The style is **Premium Minimalist-Technical**. It utilizes a dark-mode-first architecture featuring obsidian depth, subtle glassmorphism (`backdrop-filter: blur(16px)`), and vibrant electric accents (`#8B7CF7` violet and `#00DFB8` cyan). Every tool panel and interactive element should provide immediate visual feedback through micro-animations and crisp 1px borders.

## Colors
The palette is built upon deep obsidian blacks and dark grays to eliminate eye strain during intense coding sessions, contrasted with glowing violet and emerald accents.

- **Primary Violet (#8B7CF7 / #6C5CE7):** Used for primary actions, active state borders, glow effects, and focal points.
- **Accent Cyan (#00DFB8 / #00C9A7):** Used for secondary accents, success metrics, and privacy-verified badges.
- **Surfaces:** Tiered from base `#0A0A0A` to elevated `#121212` and `#1A1A1A` cards. Containers are delineated by thin `#262626` borders rather than heavy drop shadows.
- **Text:** High-contrast `#F5F5F5` for primary content, `#A3A3A3` for secondary descriptions, and `#737373` for muted metadata.

## Typography
ZeroDock balances clean sans-serif readability with technical monospace precision.
- **Inter:** Utilized for all UI labels, navigation, headers, and body text.
- **Roboto Mono:** Reserved for technical inputs, JSON/code editors, terminal outputs, badges, and system metadata.

## Layout & Spacing
Built on a mathematical 4px baseline grid.
- **Desktop:** 12-column grid within a 1200px max-width container with 24px gutters.
- **Tool Layouts:** Standard split-pane or multi-column layouts allowing developers to view inputs and generated outputs side-by-side without context switching.
- **Mobile Adaptivity:** Seamlessly stacks panels vertically with 16px side margins and touch-friendly targets.

## Elevation & Glassmorphism
Depth is conveyed through tonal layering, 1px borders, and functional glassmorphism.
- **Navbar & Command Palette:** Semi-transparent surface with `backdrop-filter: blur(16px) saturate(180%)` and a 1px border.
- **Interactive Cards:** Hover states subtly brighten the border (`#404040`) and apply a soft violet glow (`0 0 40px rgba(139, 124, 247, 0.15)`).

## Components

### Buttons
- **Primary:** Solid `#8B7CF7` or gradient violet-to-cyan fill with high-contrast text and subtle hover lift.
- **Secondary / Ghost:** Transparent background with `#262626` border, changing to `#404040` on hover with white text.

### Tool Panels & Inputs
- Dark surface (`#121212`), 1px border (`#262626`), rounded corners (`12px`), and monospace typography.
- **Empty States:** Beautifully styled placeholders featuring Lucide icons and helpful prompts rather than blank textareas.

### Badges & Chips
- Monospace uppercase (`label-caps`) with soft transparent tinted backgrounds and matching text colors.
