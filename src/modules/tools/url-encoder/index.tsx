import { useState, useEffect } from 'react';
import { Link2 } from 'lucide-react';
import { CodePanel } from '../../../shared/components/CodePanel';
import {
  ToolPage, ToolHeader, ToolWorkspace, ToolToolbar,
  ModeToggleGroup, ModeToggle, SplitPanels, SwapButton, ToolEmbedFrame,
} from '../../../shared/components/ToolLayout';
import { useToolEmbed } from '../../../shared/context/ToolEmbedContext';
import { createToolStore } from '../../../core/store/useToolState';
import { useConverterShortcuts } from '../../../shared/hooks/useConverterShortcuts';
import { useSyncToolUrl } from '../../../shared/hooks/useSyncToolUrl';

const useUrlStore = createToolStore('url-encoder', {
  input: '',
  mode: 'encode' as 'encode' | 'decode',
});

export default function URLEncoder() {
  const { input, mode, setValues } = useUrlStore();
  const setInput = (val: string) => setValues({ input: val });
  const setMode = (val: 'encode' | 'decode') => setValues({ mode: val });

  useSyncToolUrl(() => useUrlStore.getState(), setValues, [input, mode]);
  
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    if (!input) {
      setOutput('');
      return;
    }

    try {
      if (mode === 'encode') {
        setOutput(encodeURIComponent(input));
      } else {
        setOutput(decodeURIComponent(input));
      }
    } catch {
      setError('Invalid URL encoding');
      setOutput('');
    }
  }, [input, mode]);

  const handleSwap = () => {
    setMode(mode === 'encode' ? 'decode' : 'encode');
    setInput(output);
  };

  useConverterShortcuts({
    onClear: () => setInput(''),
    output,
  });

  const embedded = useToolEmbed();

  const toolToolbar = (
    <ToolToolbar center>
      <ModeToggleGroup>
        <ModeToggle active={mode === 'encode'} onClick={() => {
          if (mode === 'encode') return;
          setMode('encode');
          setInput(output);
        }}>
          Encode
        </ModeToggle>
        <ModeToggle active={mode === 'decode'} onClick={() => {
          if (mode === 'decode') return;
          setMode('decode');
          setInput(output);
        }}>
          Decode
        </ModeToggle>
      </ModeToggleGroup>
    </ToolToolbar>
  );

  const panels = (
    <SplitPanels>
      <CodePanel
        title={mode === 'encode' ? 'Plain Text' : 'URL Encoded'}
        useTextarea
        value={input}
        onChange={setInput}
        placeholder={mode === 'encode' ? 'Enter string to URL encode...' : 'Enter encoded string to decode...'}
        onClear={() => setInput('')}
        borderRight
      />
      <CodePanel
        title={mode === 'encode' ? 'URL Encoded' : 'Plain Text'}
        useTextarea
        value={output}
        readOnly
        placeholder="Result will appear here..."
        error={error}
        contentClassName="[&_textarea]:break-all"
      />
      <SwapButton onClick={handleSwap} />
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
        icon={Link2}
        title="URL Encoder / Decoder"
        description="Safely encode or decode URL parameters"
      />
      <ToolWorkspace toolbar={toolToolbar}>{panels}</ToolWorkspace>
    </ToolPage>
  );
}
