import { SearchCode } from 'lucide-react';
import { CodePanel } from '../../../shared/components/CodePanel';
import { ToolPage, ToolHeader, ToolWorkspace, ToolToolbar, SplitPanels } from '../../../shared/components/ToolLayout';
import { Badge } from '../../../shared/components/ui';
import { createToolStore } from '../../../core/store/useToolState';
import { useSyncToolUrl } from '../../../shared/hooks/useSyncToolUrl';

const useRegexStore = createToolStore('regex-tester', {
  regex: '([a-z]+)@([a-z]+)\\.([a-z]{2,})',
  flags: 'g',
  testString: 'test@example.com\nhello@world.org',
});

export default function RegexTester() {
  const { regex, flags, testString, setValues } = useRegexStore();
  const setRegex = (val: string) => setValues({ regex: val });
  const setFlags = (val: string) => setValues({ flags: val });
  const setTestString = (val: string) => setValues({ testString: val });

  useSyncToolUrl(() => useRegexStore.getState(), setValues, [regex, flags, testString]);

  const getMatches = () => {
    try {
      if (!regex) return { matches: [], error: null };
      const re = new RegExp(regex, flags);
      const matches = [];
      let match;
      if (flags.includes('g')) {
        while ((match = re.exec(testString)) !== null) {
          matches.push(match);
          if (match.index === re.lastIndex) {
            re.lastIndex++;
          }
        }
      } else {
        match = re.exec(testString);
        if (match) matches.push(match);
      }
      return { matches, error: null };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Invalid regular expression';
      return { matches: [], error: message };
    }
  };

  const { matches, error } = getMatches();

  return (
    <ToolPage className="max-w-4xl">
      <ToolHeader
        icon={SearchCode}
        title="Regex Tester"
        description="Test and debug regular expressions instantly"
      />

      <ToolWorkspace
        toolbar={
          <ToolToolbar className="flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex flex-1 bg-[var(--zd-surface)] border border-[var(--zd-border)] rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-[var(--zd-primary-soft)]">
              <span className="pl-4 py-2.5 text-[var(--zd-text-muted)] font-mono text-lg">/</span>
              <input
                type="text"
                value={regex}
                onChange={(e) => setRegex(e.target.value)}
                className="flex-1 px-1 py-2.5 text-lg font-mono bg-transparent border-none text-[var(--zd-text-primary)] focus:outline-none focus:ring-0"
                placeholder="expression..."
              />
              <span className="px-1 py-2.5 text-[var(--zd-text-muted)] font-mono text-lg">/</span>
              <input
                type="text"
                value={flags}
                onChange={(e) => setFlags(e.target.value)}
                className="w-16 px-1 py-2.5 pr-4 text-lg font-mono bg-transparent border-none text-[var(--zd-primary)] focus:outline-none focus:ring-0"
                placeholder="gmi"
              />
            </div>
            {matches.length > 0 && (
              <Badge className="shrink-0">{matches.length} match{matches.length !== 1 ? 'es' : ''}</Badge>
            )}
          </ToolToolbar>
        }
      >
        <SplitPanels>
          <CodePanel
            title="Test String"
            useTextarea
            value={testString}
            onChange={setTestString}
            placeholder="Type your test string here..."
            onClear={() => setTestString('')}
            error={error}
            borderRight
          />
          <CodePanel
            title="Match Results"
            readOnly
            value={matches.length > 0 ? `${matches.length} match${matches.length !== 1 ? 'es' : ''}` : ''}
            showCopy={false}
            placeholder="Matches will appear here..."
          >
            {matches.length > 0 ? (
              <div className="h-full overflow-y-auto custom-scrollbar p-4 flex flex-col gap-2">
                {matches.map((match, i) => (
                  <div key={i} className="flex flex-col gap-1 text-sm font-mono pb-2 border-b border-[var(--zd-border)] last:border-0 last:pb-0">
                    <div className="text-[var(--zd-primary)] font-semibold">
                      Match {i + 1}: <span className="text-[var(--zd-text-primary)] font-normal">&quot;{match[0]}&quot;</span>
                    </div>
                    {match.length > 1 && (
                      <div className="pl-4 flex flex-col gap-0.5 text-xs">
                        {match.slice(1).map((group, j) => (
                          group !== undefined ? (
                            <div key={j} className="text-[var(--zd-text-muted)]">
                              Group {j + 1}: <span className="text-[var(--zd-text-secondary)]">&quot;{group}&quot;</span>
                            </div>
                          ) : null
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-[var(--zd-text-muted)] p-6">
                {error ? 'Fix the regex error above' : 'No matches yet'}
              </div>
            )}
          </CodePanel>
        </SplitPanels>
      </ToolWorkspace>
    </ToolPage>
  );
}
