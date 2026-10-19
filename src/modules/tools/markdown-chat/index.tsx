import { useMemo, useState, useEffect } from 'react';
import { FileText, MessageSquare, Clipboard } from 'lucide-react';
import { ToolPage, ToolToolbar, ToolWorkspace, MobileSwapBar } from '../../../shared/components/ToolLayout';
import { CodePanel } from '../../../shared/components/CodePanel';
import { createToolStore } from '../../../core/store/useToolState';
import { usePipelineStore } from '../../../core/store/usePipelineStore';
import { cn } from '../../../shared/components/ui';

type ChatApp = 'Slack' | 'WhatsApp';

const APPS: ChatApp[] = ['Slack', 'WhatsApp'];

const SAMPLE = `## Team update

The plan is **ready**. Please review the *next steps*.

- Check the schedule
- Confirm your availability

| Task | Owner |
| --- | --- |
| Schedule | Alex |
| Review | Sam |`;

const styles: Record<ChatApp, { bold: [string, string]; italic: [string, string]; strike: [string, string]; description: string }> = {
  Slack: { bold: ['*', '*'], italic: ['_', '_'], strike: ['~', '~'], description: 'Slack-style markers, links, code, and compact table rows.' },
  WhatsApp: { bold: ['*', '*'], italic: ['_', '_'], strike: ['~', '~'], description: 'Formatting markers and readable summaries for WhatsApp.' },
};

function wrap(value: string, [start, end]: [string, string]) {
  return `${start}${value}${end}`;
}

function convertTable(lines: string[], bold: [string, string]) {
  const rows = lines
    .filter((line) => line.trim() && !/^\s*\|?\s*:?-{3,}/.test(line))
    .map((line) => line.trim().replace(/^\||\|$/g, '').split('|').map((cell) => cell.trim()));

  if (rows.length < 2) return lines.join('\n');
  const [header, ...body] = rows;
  return body.map((row) => row
    .map((value, index) => value ? `${wrap(header[index] || `Column ${index + 1}`, bold)}: ${value}` : '')
    .filter(Boolean)
    .join(' · ')).join('\n');
}

function convertMarkdown(markdown: string, app: ChatApp) {
  const style = styles[app] || styles.Slack;
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const output: string[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.includes('|') && /^\s*\|/.test(line)) {
      const table: string[] = [];
      while (index < lines.length && lines[index].includes('|')) {
        table.push(lines[index]);
        index += 1;
      }
      index -= 1;
      output.push(convertTable(table, style.bold));
      continue;
    }

    let converted = line
      .replace(/^#{1,6}\s+(.+)$/, (_, text: string) => wrap(text, style.bold))
      .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/\[([^\]]+)\]\(([^\s)]+)(?:\s+"[^"]*")?\)/g, '$1 ($2)')
      .replace(/`([^`]+)`/g, '`$1`')
      .replace(/\*\*([^*]+)\*\*/g, (_, text: string) => wrap(text, style.bold))
      .replace(/__([^_]+)__/g, (_, text: string) => wrap(text, style.bold))
      .replace(/~~([^~]+)~~/g, (_, text: string) => wrap(text, style.strike))
      .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, (_, text: string) => wrap(text, style.italic))
      .replace(/(?<!_)_([^_]+)_(?!_)/g, (_, text: string) => wrap(text, style.italic));

    converted = converted.replace(/^>\s?/, '› ');
    output.push(converted);
  }

  return output.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

type MarkdownChatState = {
  app: ChatApp;
  markdown: string;
};

const useMarkdownChatStore = createToolStore<MarkdownChatState>(
  'markdown-chat',
  {
    app: 'Slack',
    markdown: '',
  },
  { storageType: 'local' }
);

export default function MarkdownChatTool() {
  const { app, markdown, setValues } = useMarkdownChatStore();
  const currentApp: ChatApp = APPS.includes(app as ChatApp) ? (app as ChatApp) : 'Slack';
  const setApp = (newApp: ChatApp) => setValues({ app: newApp });
  const setMarkdown = (newMarkdown: string) => setValues({ markdown: newMarkdown });

  const [mobileTab, setMobileTab] = useState<'input' | 'output'>('input');

  useEffect(() => {
    const piped = usePipelineStore.getState().consumePipelineData();
    if (piped) {
      setValues({ markdown: piped });
    }
  }, [setValues]);

  const output = useMemo(() => convertMarkdown(markdown, currentApp), [markdown, currentApp]);

  return (
    <ToolPage
      fullWidth
      compact
      className="relative flex-1 min-h-0 h-full !p-0"
    >
      <ToolWorkspace
        className="h-full"
        toolbar={
          <ToolToolbar className="justify-start gap-x-5 gap-y-2">
            <span className="zd-mono-label shrink-0">Destination</span>
            <div
              className="-my-0.5 flex max-w-full gap-1 overflow-x-auto overscroll-x-contain py-0.5 no-scrollbar"
              role="group"
              aria-label="Conversion target"
              onWheel={(event) => {
                if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
                  event.currentTarget.scrollLeft += event.deltaY;
                  event.preventDefault();
                }
              }}
            >
              {APPS.map((target) => (
                <button
                  key={target}
                  type="button"
                  aria-pressed={currentApp === target}
                  onClick={() => setApp(target)}
                  className={`shrink-0 rounded-md px-2.5 py-1.5 font-mono text-xs font-medium transition-colors focus-ring ${
                    currentApp === target
                      ? 'bg-[var(--zd-primary)] text-[var(--zd-primary-foreground)] shadow-sm'
                      : 'text-[var(--zd-text-secondary)] hover:bg-[var(--zd-primary-soft)] hover:text-[var(--zd-primary)]'
                  }`}
                >
                  {target}
                </button>
              ))}
            </div>
          </ToolToolbar>
        }
        footer={
          <ToolToolbar className="border-t border-b-0">
            <span className="inline-flex items-center gap-1.5 text-xs text-[var(--zd-text-muted)]">
              <Clipboard className="h-3.5 w-3.5" /> Copy is always explicit—your clipboard is never changed automatically.
            </span>
          </ToolToolbar>
        }
      >
        <div className="flex flex-col flex-1 min-h-0 h-full">
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
            <CodePanel
              title="Your Markdown"
              subtitle="Markdown input"
              icon={<FileText className="w-4 h-4" />}
              language="markdown"
              value={markdown}
              onChange={setMarkdown}
              onSample={() => setMarkdown(SAMPLE)}
              onClear={() => setMarkdown('')}
              placeholder="# Paste or type Markdown here…"
              borderRight
              footer="100% Local · Your text stays in this browser."
              className={cn(
                'flex-1 min-h-0 h-full',
                mobileTab === 'input' ? 'flex' : 'hidden md:flex md:flex-1'
              )}
            />

            <CodePanel
              title={`Ready for ${currentApp}`}
              subtitle="Converted message"
              icon={<MessageSquare className="w-4 h-4" />}
              language="markdown"
              value={output}
              readOnly
              showCopy
              downloadFileName={`chat-${currentApp.toLowerCase().replace(/\s+/g, '-')}.txt`}
              downloadMimeType="text/plain"
              placeholder="Your converted message will appear here."
              emptyMessage="Waiting for Markdown input..."
              footer={styles[currentApp].description}
              showSendTo={Boolean(output)}
              sendToTargets={[
                { id: 'docs-to-markdown', name: 'Docs to Markdown', route: '/docs-to-markdown' },
                { id: 'json-toolkit', name: 'JSON Toolkit', route: '/json-toolkit' },
              ]}
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
