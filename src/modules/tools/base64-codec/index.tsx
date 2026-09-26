import { useState, useEffect } from 'react';
import { Binary, Upload } from 'lucide-react';
import { CodePanel } from '../../../shared/components/CodePanel';
import {
  ToolPage, ToolHeader, ToolWorkspace, ToolToolbar,
  ModeToggleGroup, ModeToggle, SplitPanels, SwapButton, ToolEmbedFrame,
} from '../../../shared/components/ToolLayout';
import { useToolEmbed } from '../../../shared/context/ToolEmbedContext';
import { usePipelineStore, type PipelinePayload } from '../../../core/store/usePipelineStore';
import { useToastStore } from '../../../core/store/useToastStore';
import { useConverterShortcuts } from '../../../shared/hooks/useConverterShortcuts';
import { createToolStore } from '../../../core/store/useToolState';
import { useSyncToolUrl } from '../../../shared/hooks/useSyncToolUrl';
import { PipelineCollisionBanner } from '../../../shared/components/PipelineCollisionBanner';

const useBase64Store = createToolStore('base64-codec', {
  input: '',
  mode: 'encode' as 'encode' | 'decode',
});

export default function Base64Codec() {
  const { input, mode, setValues } = useBase64Store();
  const setInput = (val: string) => setValues({ input: val });
  const setMode = (val: 'encode' | 'decode') => setValues({ mode: val });

  useSyncToolUrl(() => useBase64Store.getState(), setValues, [input, mode]);
  
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [incomingPipeline, setIncomingPipeline] = useState<PipelinePayload | null>(null);

  // Non-destructive pipeline consumer
  useEffect(() => {
    const payload = usePipelineStore.getState().consumePipelinePayload();
    if (!payload?.data) return;

    if (!input.trim()) {
      // Input buffer is currently empty: apply immediately
      setMode('encode');
      setInput(payload.data);
      const sourceName = payload.sourceToolName || 'pipeline';
      useToastStore.getState().addToast(`Loaded data from ${sourceName}`, 'info');
    } else {
      // Input buffer has existing unsaved text: preserve it and prompt with collision banner
      setIncomingPipeline(payload);
    }
  }, []);

  useEffect(() => {
    setError(null);
    if (!input) {
      setOutput('');
      return;
    }

    try {
      if (mode === 'encode') {
        const encoded = btoa(unescape(encodeURIComponent(input)));
        setOutput(encoded);
      } else {
        const decoded = decodeURIComponent(escape(atob(input)));
        setOutput(decoded);
      }
    } catch {
      setError(mode === 'decode' ? 'Invalid Base64 string' : 'Encoding error');
      setOutput('');
    }
  }, [input, mode]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setInput(result);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

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
    <ToolToolbar>
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

      <label className="cursor-pointer flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-[var(--zd-text-secondary)] hover:text-[var(--zd-primary)] hover:bg-[var(--zd-primary-soft)] rounded-lg transition-colors ml-auto">
        <Upload className="w-4 h-4" />
        <span className="hidden sm:inline">Upload File</span>
        <input type="file" accept=".txt,.json,.md,.csv" className="hidden" onChange={handleFileUpload} />
      </label>
    </ToolToolbar>
  );

  const panels = (
    <div className="flex flex-col flex-1 min-h-0 w-full">
      <PipelineCollisionBanner
        incomingData={incomingPipeline?.data ?? null}
        sourceToolName={incomingPipeline?.sourceToolName}
        onApply={() => {
          if (incomingPipeline) {
            setInput(incomingPipeline.data);
            setMode('encode');
            setIncomingPipeline(null);
          }
        }}
        onDismiss={() => setIncomingPipeline(null)}
        applyLabel="Replace Current Input"
      />
      <SplitPanels>
        <CodePanel
          title={mode === 'encode' ? 'Plain Text' : 'Base64 String'}
          useTextarea
          value={input}
          onChange={setInput}
          placeholder={mode === 'encode' ? 'Enter text to encode...' : 'Enter Base64 to decode...'}
          onClear={() => setInput('')}
          borderRight
        />
        <CodePanel
          title={mode === 'encode' ? 'Base64 String' : 'Plain Text'}
          useTextarea
          value={output}
          readOnly
          placeholder="Result will appear here..."
          error={error}
        />
        <SwapButton onClick={handleSwap} />
      </SplitPanels>
    </div>
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
        icon={Binary}
        title="Base64 Encode/Decode"
        description="Convert text to and from Base64 encoding"
      />
      <ToolWorkspace toolbar={toolToolbar}>{panels}</ToolWorkspace>
    </ToolPage>
  );
}
