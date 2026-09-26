# ZeroDock Tool Theming Architecture & Developer Guide

ZeroDock uses a 100% client-side, privacy-first, CSS Custom Property design token system inspired by Visual Studio Code's workbench architecture.

Any new tool built for ZeroDock automatically inherits and updates in real-time when users switch or customize themes (e.g., Tokyo Night, Dracula, Catppuccin, Nord, One Dark Pro, OLED Black, or custom imported themes).

---

## 1. Quick Start: Standard Tool Template

When creating a new tool under `src/modules/tools/<tool-name>/`, structure it with the standard layout primitives:

```tsx
import { ToolPage, ToolHeader, ToolWorkspace } from '../../../shared/components/ToolLayout';
import { useTheme } from '../../../core/theme';
import { Wrench } from 'lucide-react';

export function MyNewTool() {
  const { tokens, isDark } = useTheme();

  return (
    <ToolPage>
      <ToolHeader
        icon={Wrench}
        title="My Developer Tool"
        description="Fast, client-side, 100% private developer utility."
        toolId="my-tool"
        showStandardActions
      />

      <ToolWorkspace>
        <div className="flex-1 p-4 bg-[var(--zd-surface)] text-[var(--zd-text-primary)]">
          {/* Tool panels, inputs, and results */}
        </div>
      </ToolWorkspace>
    </ToolPage>
  );
}
```

---

## 2. The 4 Design Token Rules for New Tools

| Token Type | CSS Custom Property | Tailwind Class | Usage |
| :--- | :--- | :--- | :--- |
| **Canvas Background** | `--zd-bg` | `bg-[var(--zd-bg)]` | Outer window canvas, root backdrop |
| **Surface** | `--zd-surface` | `bg-[var(--zd-surface)]` | Tool workbenches, panels, sidebars |
| **Raised Surface** | `--zd-surface-raised`| `bg-[var(--zd-surface-raised)]` | Modals, elevated cards, dropdowns |
| **Primary Accent** | `--zd-primary` | `text-[var(--zd-primary)]` / `bg-[var(--zd-primary)]` | Key action buttons, active tabs, focus rings |
| **Primary Soft** | `--zd-primary-soft` | `bg-[var(--zd-primary-soft)]` | Hover highlights, active background pills |
| **Secondary Accent** | `--zd-accent` | `text-[var(--zd-accent)]` / `bg-[var(--zd-accent)]` | Badges, callouts, secondary highlights |
| **Primary Text** | `--zd-text-primary` | `text-[var(--zd-text-primary)]` | Headings, active values, primary copy |
| **Secondary Text** | `--zd-text-secondary`| `text-[var(--zd-text-secondary)]` | Subtitles, descriptions, labels |
| **Muted Text** | `--zd-text-muted` | `text-[var(--zd-text-muted)]` | Placeholders, footnotes, timestamps |
| **Borders** | `--zd-border` | `border-[var(--zd-border)]` | Panes, splitters, dividers, card borders |
| **Hover Border** | `--zd-border-hover` | `hover:border-[var(--zd-border-hover)]` | Interactive inputs and hover borders |
| **Status Success** | `--zd-success` | `text-[var(--zd-success)]` | Validations, diff insertions, copy checks |
| **Status Error** | `--zd-error` | `text-[var(--zd-error)]` | Syntax errors, diff deletions, alerts |

> ⚠️ **Critical**: Never use static Tailwind colors like `bg-slate-900`, `bg-zinc-800`, or `text-blue-500`. Always use the CSS custom properties above so your tool seamlessly supports all 14 built-in and user-created themes.

---

## 3. The `useTheme()` Hook

For programmatic color access (HTML5 `<canvas>`, SVG charts, WebGL, D3, or dynamic styles):

```tsx
import { useTheme } from '../../../core/theme';

export function CanvasTool() {
  const { tokens, isDark, activeTheme, openThemeCustomizer } = useTheme();

  const drawOnCanvas = (ctx: CanvasRenderingContext2D) => {
    // Read live theme hex values directly:
    ctx.fillStyle = tokens['--zd-surface'];
    ctx.fillRect(0, 0, 800, 600);

    ctx.strokeStyle = tokens['--zd-primary'];
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 20, 100, 100);

    ctx.fillStyle = tokens['--zd-text-primary'];
    ctx.font = '14px Inter';
    ctx.fillText('Canvas rendered with active theme', 25, 45);
  };

  return <canvas id="my-canvas" />;
}
```

---

## 4. Code Editors & Monaco

When using `<CodeEditor>` or raw Monaco instances, use `MONACO_THEME_ID`:

```tsx
import { CodeEditor } from '../../../shared/components/CodeEditor';
import { MONACO_THEME_ID } from '../../../core/theme';

// Pre-built ZeroDock editor already connects to MONACO_THEME_ID:
<CodeEditor
  language="json"
  value={code}
  onChange={setCode}
/>

// Or with raw @monaco-editor/react:
<Editor
  language="typescript"
  theme={MONACO_THEME_ID}
/>
```

When users customize theme tokens or switch themes in the Theme Customizer (`Cmd+K Cmd+T`), Monaco instantly re-themes live without editor remounting or cursor reset.
