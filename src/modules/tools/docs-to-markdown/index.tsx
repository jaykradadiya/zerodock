import { useState, useMemo, useEffect } from 'react';
import { FileText, ArrowRightLeft, FileCheck } from 'lucide-react';
import { ToolPage, ToolToolbar, ToolWorkspace, MobileSwapBar } from '../../../shared/components/ToolLayout';
import { CodePanel } from '../../../shared/components/CodePanel';
import { createToolStore } from '../../../core/store/useToolState';
import { usePipelineStore } from '../../../core/store/usePipelineStore';
import { convertHtmlToMarkdown, type ConversionOptions } from './utils/converter';
import { RichViewer } from './components/RichViewer';
import { OptionsToolbar } from './components/OptionsToolbar';
import { cn } from '../../../shared/components/ui';

type DocsToMarkdownState = {
  html: string;
  stripGoogleRedirects: boolean;
  tableFormatting: boolean;
  boldMarker: '**' | '__';
  italicMarker: '*' | '_';
  inputViewMode: 'paste' | 'source';
};

const SAMPLE_DOCS_HTML = `<h1>Sprint Planning & Architecture Spec</h1>
<p>This document was drafted in <span style="font-weight: 700;">Google Docs</span> and converted directly into clean GitHub-Flavored Markdown.</p>
<p>Check the original inspiration at <a href="https://www.google.com/url?q=https%3A%2F%2Fgithub.com%2Fmr0grog%2Fgoogle-docs-to-markdown&sa=D&ust=1680000000000000">Google Docs to Markdown on GitHub</a>.</p>
<h2>Project Requirements</h2>
<ul>
  <li><span style="font-weight: 700;">Privacy First:</span> 100% in-browser processing via DOMParser.</li>
  <li><span style="font-style: italic;">No Tracking Redirects:</span> Automatic unwrap of Google URL parameters.</li>
  <li><span style="text-decoration: line-through;">Server-side Parsing:</span> Completely avoided.</li>
</ul>
<h2>Milestone Schedule</h2>
<table>
  <tr>
    <th>Feature</th>
    <th>Status</th>
    <th>Target</th>
  </tr>
  <tr>
    <td>Docs to Markdown</td>
    <td>Shipped</td>
    <td>v1.0</td>
  </tr>
  <tr>
    <td>Slack & WhatsApp Pipeline</td>
    <td>Connected</td>
    <td>Live</td>
  </tr>
</table>`;

const useDocsToMarkdownStore = createToolStore<DocsToMarkdownState>(
  'docs-to-markdown',
  {
    html: '',
    stripGoogleRedirects: true,
    tableFormatting: true,
    boldMarker: '**',
    italicMarker: '*',
    inputViewMode: 'paste',
  },
  { storageType: 'local' }
);

export default function DocsToMarkdownTool() {
  const {
    html,
    stripGoogleRedirects,
    tableFormatting,
    boldMarker,
    italicMarker,
    inputViewMode,
    setValues,
  } = useDocsToMarkdownStore();

  const [mobileTab, setMobileTab] = useState<'input' | 'output'>('input');

  // Consume any incoming pipeline data on initial mount
  useEffect(() => {
    const piped = usePipelineStore.getState().consumePipelineData();
    if (piped) {
      setValues({ html: piped, inputViewMode: 'source' });
    }
  }, [setValues]);

  const conversionOptions: ConversionOptions = useMemo(
    () => ({
      stripGoogleRedirects,
      tableFormatting,
      boldMarker,
      italicMarker,
      strikethrough: true,
      preserveConsecutiveLineBreaks: false,
    }),
    [stripGoogleRedirects, tableFormatting, boldMarker, italicMarker]
  );

  const markdownOutput = useMemo(
    () => convertHtmlToMarkdown(html, conversionOptions),
    [html, conversionOptions]
  );

  const handlePasteEvent = (e: React.ClipboardEvent) => {
    const htmlData = e.clipboardData.getData('text/html');
    if (htmlData) {
      e.preventDefault();
      setValues({ html: htmlData });
      return;
    }
    const plainText = e.clipboardData.getData('text/plain');
    if (plainText) {
      setValues({ html: plainText });
    }
  };

  const wordCount = useMemo(() => {
    if (!markdownOutput) return 0;
    return markdownOutput.trim().split(/\s+/).filter(Boolean).length;
  }, [markdownOutput]);

  const charCount = markdownOutput.length;

  return (
    <ToolPage fullWidth compact className="relative flex-1 min-h-0 h-full !p-0">
      <ToolWorkspace
        className="h-full"
        toolbar={
          <ToolToolbar className="justify-start gap-x-5 gap-y-2">
            <OptionsToolbar
              options={conversionOptions}
              onOptionsChange={(newOpts) => setValues(newOpts)}
              inputViewMode={inputViewMode}
              onInputViewModeChange={(mode) => setValues({ inputViewMode: mode })}
            />
          </ToolToolbar>
        }
        footer={
          <ToolToolbar className="border-t border-b-0 justify-between">
            <span className="inline-flex items-center gap-1.5 text-xs text-[var(--zd-text-muted)]">
              <FileCheck className="h-3.5 w-3.5 text-[var(--zd-primary)]" />
              100% Client-Side · Google Docs tracking parameters stripped automatically.
            </span>
            {markdownOutput && (
              <span className="font-mono text-[11px] text-[var(--zd-text-secondary)]">
                {wordCount} words · {charCount} chars
              </span>
            )}
          </ToolToolbar>
        }
      >
        <div className="flex flex-col flex-1 min-h-0 h-full" onPaste={handlePasteEvent}>
          <div className="md:hidden">
            <MobileSwapBar
              onSwap={() => setMobileTab((prev) => (prev === 'input' ? 'output' : 'input'))}
              onFocusInput={() => setMobileTab('input')}
              onFocusOutput={() => setMobileTab('output')}
              activePanel={mobileTab}
              swapLabel="Toggle Input/Output"
            />
          </div>

          <div className="flex flex-col md:flex-row flex-1 min-h-0 h-full overflow-hidden">
            {/* Left Panel: Rich Rendered View or Raw HTML Source */}
            {inputViewMode === 'paste' ? (
              <div
                className={cn(
                  'flex-1 min-h-0 h-full flex flex-col border-r border-[var(--zd-border)] bg-[var(--zd-surface)] overflow-hidden',
                  mobileTab === 'input' ? 'flex' : 'hidden md:flex md:flex-1'
                )}
              >
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--zd-border)] bg-[var(--zd-surface-raised)]">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[var(--zd-primary)]" />
                    <span className="text-sm font-semibold text-[var(--zd-text-primary)]">
                      Google Docs Rich Paste
                    </span>
                  </div>
                </div>

                <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                  <RichViewer
                    html={html}
                    onChange={(newHtml) => setValues({ html: newHtml })}
                    onSample={() => setValues({ html: SAMPLE_DOCS_HTML })}
                    onClear={() => setValues({ html: '' })}
                  />
                </div>
              </div>
            ) : (
              <CodePanel
                title="HTML Source"
                subtitle="Google Docs markup"
                icon={<FileText className="w-4 h-4" />}
                language="html"
                value={html}
                onChange={(newVal) => setValues({ html: newVal || '' })}
                onSample={() => setValues({ html: SAMPLE_DOCS_HTML })}
                onClear={() => setValues({ html: '' })}
                placeholder="Paste or type raw HTML markup here…"
                borderRight
                className={cn(
                  'flex-1 min-h-0 h-full',
                  mobileTab === 'input' ? 'flex' : 'hidden md:flex md:flex-1'
                )}
              />
            )}

            {/* Right Panel: Clean Markdown Output */}
            <CodePanel
              title="Markdown Output"
              subtitle="Clean GitHub Flavored Markdown"
              icon={<ArrowRightLeft className="w-4 h-4" />}
              language="markdown"
              value={markdownOutput}
              readOnly
              showCopy
              downloadFileName="document.md"
              downloadMimeType="text/markdown"
              placeholder="Your converted Markdown will appear here."
              emptyMessage="Waiting for Google Docs input..."
              className={cn(
                'flex-1 min-h-0 h-full',
                mobileTab === 'output' ? 'flex' : 'hidden md:flex md:flex-1'
              )}
            />
          </div>
        </div>
      </ToolWorkspace>
    </ToolPage>
  );
}
