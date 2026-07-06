import { useState, useEffect } from 'react';
import { FileJson, Zap } from 'lucide-react';
import { createToolStore } from '../../../core/store/useToolState';
import YAML from 'yaml';
import { updateURLWithState, getStateFromURL } from '../../../shared/utils/state-share';
import { CodePanel } from '../../../shared/components/CodePanel';
import {
  ToolPage, ToolHeader, ToolWorkspace, ToolToolbar,
  ModeToggleGroup, ModeToggle, SwapButton, ToolEmbedFrame,
} from '../../../shared/components/ToolLayout';
import { useToolEmbed } from '../../../shared/context/ToolEmbedContext';
import Split from 'react-split';
import { usePipelineStore } from '../../../core/store/usePipelineStore';
import { useConverterShortcuts } from '../../../shared/hooks/useConverterShortcuts';
import { Eraser } from 'lucide-react';
import { useUIStore } from '../../../core/store/useUIStore';

type Mode = 'yaml2json' | 'json2yaml';

interface YamlJsonState {
  input: string;
  mode: Mode;
}

const useYamlJsonStore = createToolStore<YamlJsonState>('yaml-json-converter', {
  input: '',
  mode: 'yaml2json',
});

const SAMPLE_YAML = 'name: ZeroDock\nversion: 1.0\nfeatures:\n  - fast\n  - local\n  - secure';
const SAMPLE_JSON = '{\n  "name": "ZeroDock",\n  "version": "1.0",\n  "features": [\n    "fast",\n    "local",\n    "secure"\n  ]\n}';

export default function YamlJsonConverter() {
  const { input, mode, setValues } = useYamlJsonStore();

  const setInput = (val: string) => {
    setValues({ input: val });
    updateURLWithState({ input: val, mode });
  };
  const setMode = (val: Mode) => {
    setValues({ mode: val });
    updateURLWithState({ input, mode: val });
  };

  const [output, setOutput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const loadSample = () => {
    setInput(mode === 'yaml2json' ? SAMPLE_YAML : SAMPLE_JSON);
  };

  useConverterShortcuts({
    onClear: () => setInput(''),
    output,
  });

  useEffect(() => {
    const urlState = getStateFromURL<YamlJsonState>();
    if (urlState) {
      setValues(urlState);
    }

    const pipedData = usePipelineStore.getState().consumePipelineData();
    if (pipedData) {
      if (pipedData.trim().startsWith('{') || pipedData.trim().startsWith('[')) {
        setMode('json2yaml');
      } else {
        setMode('yaml2json');
      }
      setInput(pipedData);
    }
  }, []);

  useEffect(() => {
    const { setContextCommands } = useUIStore.getState();
    setContextCommands([
      {
        id: 'load-sample',
        name: 'Load Sample Data',
        description: 'Populate with example configuration',
        icon: Zap,
        action: () => {
          const currentMode = useYamlJsonStore.getState().mode;
          if (currentMode === 'yaml2json') {
            setInput(SAMPLE_YAML);
          } else {
            setInput(SAMPLE_JSON);
          }
        },
      },
      {
        id: 'clear-input',
        name: 'Clear Input',
        description: 'Empty the current editor',
        icon: Eraser,
        action: () => setInput(''),
      },
    ]);

    return () => setContextCommands([]);
  }, [mode]);

  useEffect(() => {
    setError(null);
    if (!input.trim()) {
      setOutput('');
      return;
    }

    try {
      if (mode === 'yaml2json') {
        const parsed = YAML.parse(input);
        setOutput(JSON.stringify(parsed, null, 2));
      } else {
        const parsed = JSON.parse(input);
        setOutput(YAML.stringify(parsed));
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid format';
      setError(message);
      setOutput('');
    }
  }, [input, mode]);

  const handleSwap = () => {
    setMode(mode === 'yaml2json' ? 'json2yaml' : 'yaml2json');
    setInput(output);
  };

  const embedded = useToolEmbed();
  const inputLang = mode === 'yaml2json' ? 'yaml' : 'json';
  const outputLang = mode === 'yaml2json' ? 'json' : 'yaml';

  const toolToolbar = (
    <ToolToolbar center className="!justify-center">
      <ModeToggleGroup>
        <ModeToggle
          active={mode === 'yaml2json'}
          onClick={() => { setMode('yaml2json'); setInput(output); }}
        >
          YAML to JSON
        </ModeToggle>
        <ModeToggle
          active={mode === 'json2yaml'}
          onClick={() => { setMode('json2yaml'); setInput(output); }}
        >
          JSON to YAML
        </ModeToggle>
      </ModeToggleGroup>
    </ToolToolbar>
  );

  const panels = (
    <div className="relative flex flex-col flex-1 min-h-0">
      <Split
        className="flex flex-row flex-1 min-h-0 w-full"
        sizes={[50, 50]}
        minSize={250}
        gutterSize={4}
        snapOffset={30}
        direction="horizontal"
        cursor="col-resize"
      >
        <CodePanel
          title={mode === 'yaml2json' ? 'YAML' : 'JSON'}
          language={inputLang}
          value={input}
          onChange={(val) => setInput(val || '')}
          onClear={() => setInput('')}
          onSample={loadSample}
        />
        <CodePanel
          title={mode === 'yaml2json' ? 'JSON' : 'YAML'}
          language={outputLang}
          value={output}
          readOnly
          error={error}
          placeholder="Result will appear here..."
        />
      </Split>
      <SwapButton onClick={handleSwap} className="mt-0" />
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
        icon={FileJson}
        title="YAML ↔ JSON Converter"
        description="Convert between YAML and JSON instantly"
      />
      <ToolWorkspace toolbar={toolToolbar}>{panels}</ToolWorkspace>
    </ToolPage>
  );
}
