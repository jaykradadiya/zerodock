import { useState } from 'react';
import type { ThemeDefinition, ThemeTokens } from '../../../core/theme/types';
import { Download, Copy, Check, Upload, FileCode2, ArrowRight } from 'lucide-react';
import { exportToVsCodeSnippet, parseThemeImport } from '../../../core/theme/vscodeMapper';
import { Button } from '../ui/Button';

interface VsCodeSyncPanelProps {
  activeTheme: ThemeDefinition;
  effectiveTokens: ThemeTokens;
  onImportSuccess: (importedTheme: ThemeDefinition) => void;
}

export function VsCodeSyncPanel({
  activeTheme,
  effectiveTokens,
  onImportSuccess,
}: VsCodeSyncPanelProps) {
  const [importJson, setImportJson] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [copiedZeroDock, setCopiedZeroDock] = useState(false);

  const vsCodeSnippet = exportToVsCodeSnippet(effectiveTokens);

  const zeroDockExportData: ThemeDefinition = {
    ...activeTheme,
    id: activeTheme.isBuiltin ? `custom-${activeTheme.id}-${Date.now()}` : activeTheme.id,
    name: activeTheme.isBuiltin ? `${activeTheme.name} (Custom)` : activeTheme.name,
    tokens: effectiveTokens,
    isBuiltin: false,
  };

  const zeroDockExportString = JSON.stringify(zeroDockExportData, null, 2);

  const handleImport = () => {
    setImportError(null);
    if (!importJson.trim()) {
      setImportError('Please paste a JSON configuration first.');
      return;
    }

    const result = parseThemeImport(importJson);
    if (result.error || !result.theme) {
      setImportError(result.error || 'Failed to parse theme.');
      return;
    }

    onImportSuccess(result.theme);
  };

  const downloadFile = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopySnippet = () => {
    navigator.clipboard.writeText(vsCodeSnippet);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  const handleCopyZeroDock = () => {
    navigator.clipboard.writeText(zeroDockExportString);
    setCopiedZeroDock(true);
    setTimeout(() => setCopiedZeroDock(false), 2000);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Import Section */}
      <div className="p-4 rounded-xl border border-[var(--zd-border)] bg-[var(--zd-surface)] flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-[var(--zd-text-primary)] flex items-center gap-2">
              <Upload className="w-4 h-4 text-[var(--zd-primary)]" />
              Import Theme from VS Code or JSON
            </h3>
            <p className="text-xs text-[var(--zd-text-muted)] mt-0.5">
              Paste your VS Code <code className="text-[11px] font-mono px-1 py-0.5 rounded bg-[var(--zd-bg)] border border-[var(--zd-border)]">workbench.colorCustomizations</code> object or a ZeroDock theme JSON file.
            </p>
          </div>
        </div>

        <textarea
          rows={5}
          value={importJson}
          onChange={(e) => {
            setImportJson(e.target.value);
            if (importError) setImportError(null);
          }}
          placeholder={`{\n  "workbench.colorCustomizations": {\n    "editor.background": "#1e1e1e",\n    "activityBar.background": "#252526",\n    "focusBorder": "#007acc"\n  }\n}`}
          className="w-full p-3 rounded-lg border border-[var(--zd-border)] bg-[var(--zd-bg)] font-mono text-xs text-[var(--zd-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--zd-primary)] focus:border-[var(--zd-primary)] resize-y"
          spellCheck={false}
        />

        {importError && (
          <div className="text-xs font-medium text-[var(--zd-error)] bg-[var(--zd-error)]/10 px-3 py-2 rounded-lg border border-[var(--zd-error)]/20">
            {importError}
          </div>
        )}

        <div className="flex items-center justify-between pt-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setImportJson(`{\n  "workbench.colorCustomizations": {\n    "activityBar.background": "#0F141C",\n    "sideBar.background": "#131A24",\n    "editor.background": "#0B0E14",\n    "button.background": "#39BAE6",\n    "focusBorder": "#39BAE6",\n    "foreground": "#B3B1AD"\n  }\n}`);
            }}
            className="text-xs text-[var(--zd-text-secondary)]"
          >
            Load Sample (Ayu Mirage)
          </Button>

          <Button
            size="sm"
            variant="primary"
            onClick={handleImport}
            className="gap-1.5 text-xs font-semibold"
          >
            <span>Import & Apply</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Export Section */}
      <div className="p-4 rounded-xl border border-[var(--zd-border)] bg-[var(--zd-surface)] flex flex-col gap-4">
        <div>
          <h3 className="text-sm font-bold text-[var(--zd-text-primary)] flex items-center gap-2">
            <FileCode2 className="w-4 h-4 text-[var(--zd-primary)]" />
            Export Current Theme
          </h3>
          <p className="text-xs text-[var(--zd-text-muted)] mt-0.5">
            Export your customized theme to use in other browsers or directly inside Visual Studio Code.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* ZeroDock JSON Export Card */}
          <div className="p-3.5 rounded-lg border border-[var(--zd-border)] bg-[var(--zd-surface-raised)] flex flex-col justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-[var(--zd-text-primary)]">
                ZeroDock Theme JSON
              </div>
              <div className="text-[11px] text-[var(--zd-text-muted)] mt-1">
                Complete portable theme file with all custom tokens, ready to share or import back.
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={handleCopyZeroDock}
                className="flex-1 !h-8 text-xs font-semibold gap-1.5"
              >
                {copiedZeroDock ? <Check className="w-3.5 h-3.5 text-[var(--zd-success)]" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedZeroDock ? 'Copied!' : 'Copy JSON'}</span>
              </Button>
              <Button
                size="sm"
                variant="primary"
                onClick={() => downloadFile(`${activeTheme.id}-zerodock-theme.json`, zeroDockExportString)}
                className="!h-8 text-xs font-semibold gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download</span>
              </Button>
            </div>
          </div>

          {/* VS Code Snippet Export Card */}
          <div className="p-3.5 rounded-lg border border-[var(--zd-border)] bg-[var(--zd-surface-raised)] flex flex-col justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-[var(--zd-text-primary)]">
                VS Code settings.json Snippet
              </div>
              <div className="text-[11px] text-[var(--zd-text-muted)] mt-1">
                Generates a <code className="font-mono text-[10px] px-1 py-0.5 rounded bg-[var(--zd-bg)]">workbench.colorCustomizations</code> block for VS Code.
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={handleCopySnippet}
                className="flex-1 !h-8 text-xs font-semibold gap-1.5"
              >
                {copiedSnippet ? <Check className="w-3.5 h-3.5 text-[var(--zd-success)]" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSnippet ? 'Copied!' : 'Copy Snippet'}</span>
              </Button>
              <Button
                size="sm"
                variant="primary"
                onClick={() => downloadFile(`vscode-settings-${activeTheme.id}.json`, vsCodeSnippet)}
                className="!h-8 text-xs font-semibold gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
