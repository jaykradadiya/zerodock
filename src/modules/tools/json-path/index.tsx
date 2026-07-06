import { useState, useEffect } from 'react';
import { Filter, Play } from 'lucide-react';
import { createToolStore } from '../../../core/store/useToolState';
import { updateURLWithState, getStateFromURL } from '../../../shared/utils/state-share';
import jmespath from 'jmespath';
import { CodePanel } from '../../../shared/components/CodePanel';
import { ToolPage, ToolHeader, ToolWorkspace, ToolToolbar, SplitPanels, ToolEmbedFrame } from '../../../shared/components/ToolLayout';
import { useToolEmbed } from '../../../shared/context/ToolEmbedContext';

interface JsonPathState {
  input: string;
  query: string;
}

const useJsonPathStore = createToolStore<JsonPathState>('json-path', {
  input: '{\n  "users": [\n    {"name": "Alice", "age": 25},\n    {"name": "Bob", "age": 30}\n  ]\n}',
  query: 'users[?age > `25`].name',
});

export default function JsonPathPlayground() {
  const { input, query, setValues } = useJsonPathStore();
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const urlState = getStateFromURL<JsonPathState>();
    if (urlState && urlState.query !== undefined) {
      setValues(urlState);
    }
  }, []);

  const updateState = (updates: Partial<JsonPathState>) => {
    setValues(updates);
    updateURLWithState({ input, query, ...updates });
  };

  useEffect(() => {
    if (!input.trim() || !query.trim()) {
      setOutput('');
      setError(null);
      return;
    }

    try {
      const parsedJson = JSON.parse(input);
      const result = jmespath.search(parsedJson, query);
      setOutput(JSON.stringify(result, null, 2));
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Invalid JSON or Query');
      setOutput('');
    }
  }, [input, query]);

  const embedded = useToolEmbed();

  const toolToolbar = (
    <ToolToolbar>
      <div className="w-8 h-8 rounded-full bg-[var(--zd-primary-soft)] flex items-center justify-center text-[var(--zd-primary)] shrink-0">
        <Play className="w-4 h-4" />
      </div>
      <input
        type="text"
        value={query}
        onChange={(e) => updateState({ query: e.target.value })}
        placeholder="users[?age > `25`].name"
        className="flex-1 px-4 py-2 bg-[var(--zd-bg)] border border-[var(--zd-border)] rounded-lg text-sm font-mono focus:outline-none focus:border-[var(--zd-primary)] text-[var(--zd-text-primary)]"
      />
    </ToolToolbar>
  );

  const panels = (
    <SplitPanels>
      <CodePanel
        title="Input JSON"
        value={input}
        onChange={(val) => updateState({ input: val })}
        language="json"
        placeholder="Paste massive JSON here..."
        borderRight
      />
      <CodePanel
        title="Result"
        value={output}
        readOnly
        language="json"
        placeholder="Filtered result will appear here..."
        error={error}
        downloadFileName="filtered.json"
        downloadMimeType="application/json"
      />
    </SplitPanels>
  );

  if (embedded) {
    return (
      <ToolEmbedFrame toolbar={toolToolbar}>
        {panels}
      </ToolEmbedFrame>
    );
  }

  return (
    <ToolPage>
      <ToolHeader
        icon={Filter}
        title="JSON Path (JMESPath)"
        description="Query and filter massive JSON payloads"
      />
      <ToolWorkspace toolbar={toolToolbar}>{panels}</ToolWorkspace>
    </ToolPage>
  );
}
