import { useState, useRef, useEffect } from 'react';
import '../../../core/monaco/setup';
import { DiffEditor } from '@monaco-editor/react';
import { usePreferenceStore } from '../../../core/store/usePreferenceStore';
import { GitCompare, Columns, Split } from 'lucide-react';
import { ToolPage, ToolHeader, ToolWorkspace, ToolSelect } from '../../../shared/components/ToolLayout';
import { createToolStore } from '../../../core/store/useToolState';
import { useConverterShortcuts } from '../../../shared/hooks/useConverterShortcuts';
import { useSyncToolUrl } from '../../../shared/hooks/useSyncToolUrl';
import { useMeasuredHeight } from '../../../shared/hooks/useMeasuredHeight';
import { usePipelineStore, type PipelinePayload } from '../../../core/store/usePipelineStore';
import { useToastStore } from '../../../core/store/useToastStore';
import { PipelineCollisionBanner } from '../../../shared/components/PipelineCollisionBanner';
import { Button } from '../../../shared/components/ui';

const useDiffStore = createToolStore('diff-checker', {
  originalText: '',
  modifiedText: '',
});

const SAMPLE_LEFT = `// ZeroDock Configuration
{
  "name": "ZeroDock",
  "version": "1.0.0",
  "features": {
    "localProcessing": true,
    "telemetry": false,
    "theme": "dark"
  },
  "supportedLanguages": [
    "JSON",
    "Base64",
    "JWT",
    "PDF"
  ]
}`;

const SAMPLE_RIGHT = `// ZeroDock Configuration
{
  "name": "ZeroDock Pro",
  "version": "1.1.0",
  "features": {
    "localProcessing": true,
    "telemetry": false,
    "theme": "system",
    "cloudSync": false
  },
  "supportedLanguages": [
    "JSON",
    "Base64",
    "JWT",
    "PDF",
    "YAML",
    "XML"
  ]
}`;

export default function DiffChecker() {
  const { theme } = usePreferenceStore();
  const [language, setLanguage] = useState('json');
  const [sideBySide, setSideBySide] = useState(true);

  const { originalText, modifiedText, setValues } = useDiffStore();
  const setOriginalText = (val: string) => setValues({ originalText: val });
  const setModifiedText = (val: string) => setValues({ modifiedText: val });

  useSyncToolUrl(() => useDiffStore.getState(), setValues, [originalText, modifiedText]);

  const [incomingPipeline, setIncomingPipeline] = useState<PipelinePayload | null>(null);

  useEffect(() => {
    const payload = usePipelineStore.getState().consumePipelinePayload();
    if (!payload?.data) return;

    if (!originalText.trim()) {
      setOriginalText(payload.data);
      const source = payload.sourceToolName || 'pipeline';
      useToastStore.getState().addToast(`Loaded data from ${source} into Left (Original)`, 'info');
    } else if (!modifiedText.trim()) {
      setModifiedText(payload.data);
      const source = payload.sourceToolName || 'pipeline';
      useToastStore.getState().addToast(`Loaded data from ${source} into Right (Modified)`, 'info');
    } else {
      setIncomingPipeline(payload);
    }
  }, []);

  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const { ref: editorContainerRef, height: editorHeight } = useMeasuredHeight(1);

  const handleEditorWillMount = (monaco: any) => {
    monaco.editor.defineTheme('zerodock-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#16161A',
        'editor.foreground': '#EAEAF0',
        'editorLineHighlightBackground': '#1C1C21',
        'editorLineNumber.foreground': '#5E5E72',
      }
    });
    monaco.editor.defineTheme('zerodock-light', {
      base: 'vs',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#FFFFFF',
        'editor.foreground': '#1A1A2E',
        'editorLineNumber.foreground': '#8E8EA0',
      }
    });
  };

  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    const originalEditor = editor.getOriginalEditor();
    const modifiedEditor = editor.getModifiedEditor();

    originalEditor.onDidChangeModelContent(() => {
      setOriginalText(originalEditor.getValue());
    });

    modifiedEditor.onDidChangeModelContent(() => {
      setModifiedText(modifiedEditor.getValue());
    });
  };

  const loadSample = () => {
    setValues({ originalText: SAMPLE_LEFT, modifiedText: SAMPLE_RIGHT });
    setLanguage('json');
    if (editorRef.current) {
      editorRef.current.getOriginalEditor().setValue(SAMPLE_LEFT);
      editorRef.current.getModifiedEditor().setValue(SAMPLE_RIGHT);
    }
  };

  const clearAll = () => {
    setValues({ originalText: '', modifiedText: '' });
    if (editorRef.current) {
      editorRef.current.getOriginalEditor().setValue('');
      editorRef.current.getModifiedEditor().setValue('');
    }
  };

  useEffect(() => {
    return () => {
      if (monacoRef.current) {
        const models = monacoRef.current.editor.getModels();
        models.forEach((m: any) => m.dispose());
      }
    };
  }, []);

  useEffect(() => {
    if (!editorRef.current) return;
    const originalEditor = editorRef.current.getOriginalEditor();
    if (originalText !== originalEditor.getValue()) {
      originalEditor.setValue(originalText);
    }
  }, [originalText]);

  useEffect(() => {
    if (!editorRef.current) return;
    const modifiedEditor = editorRef.current.getModifiedEditor();
    if (modifiedText !== modifiedEditor.getValue()) {
      modifiedEditor.setValue(modifiedText);
    }
  }, [modifiedText]);

  useEffect(() => {
    editorRef.current?.updateOptions({ renderSideBySide: sideBySide });
  }, [sideBySide]);

  useConverterShortcuts({
    onClear: clearAll,
    output: modifiedText,
  });

  return (
    <ToolPage fullWidth>
      <ToolHeader
        icon={GitCompare}
        title="Text Diff Checker"
        description="Compare two text files side-by-side or inline in real-time."
        actions={
          <>
            <ToolSelect
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              <option value="plaintext">Plain Text</option>
              <option value="json">JSON</option>
              <option value="javascript">JavaScript</option>
              <option value="typescript">TypeScript</option>
              <option value="html">HTML</option>
              <option value="css">CSS</option>
              <option value="yaml">YAML</option>
              <option value="xml">XML</option>
            </ToolSelect>

            <button
              type="button"
              onClick={() => setSideBySide(!sideBySide)}
              className={`flex items-center gap-1.5 px-3 py-2 border border-[var(--zd-border)] rounded-xl text-sm font-semibold transition-all ${
                sideBySide
                  ? 'bg-[var(--zd-primary-soft)] text-[var(--zd-primary)] border-[var(--zd-primary)]/30'
                  : 'bg-[var(--zd-surface)] text-[var(--zd-text-secondary)] hover:bg-[var(--zd-primary-soft)] hover:text-[var(--zd-primary)]'
              }`}
              title={sideBySide ? 'Switch to Inline View' : 'Switch to Side-by-Side View'}
            >
              {sideBySide ? <Columns className="w-4 h-4" /> : <Split className="w-4 h-4" />}
              <span className="hidden md:inline">{sideBySide ? 'Split' : 'Inline'}</span>
            </button>

            <button
              type="button"
              onClick={loadSample}
              className="flex items-center gap-1.5 px-3 py-2 bg-[var(--zd-surface)] border border-[var(--zd-border)] rounded-xl text-sm font-semibold text-[var(--zd-text-secondary)] hover:text-[var(--zd-primary)] hover:bg-[var(--zd-primary-soft)] transition-all"
            >
              Sample
            </button>

            <button
              type="button"
              onClick={clearAll}
              className="flex items-center gap-1.5 px-3 py-2 bg-[var(--zd-surface)] border border-[var(--zd-border)] rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 hover:border-red-200 transition-all"
              title="Clear original and modified inputs"
            >
              Clear
            </button>
          </>
        }
      />

      <ToolWorkspace>
        <PipelineCollisionBanner
          incomingData={incomingPipeline?.data ?? null}
          sourceToolName={incomingPipeline?.sourceToolName}
          customActions={
            <>
              <Button
                size="sm"
                variant="primary"
                onClick={() => {
                  if (incomingPipeline) {
                    setOriginalText(incomingPipeline.data);
                    setIncomingPipeline(null);
                  }
                }}
                className="!py-1 !px-2.5 text-xs font-semibold"
              >
                Load into Left
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  if (incomingPipeline) {
                    setModifiedText(incomingPipeline.data);
                    setIncomingPipeline(null);
                  }
                }}
                className="!py-1 !px-2.5 text-xs font-semibold"
              >
                Load into Right
              </Button>
            </>
          }
          onDismiss={() => setIncomingPipeline(null)}
        />
        <div ref={editorContainerRef} className="zd-tool-fill w-full overflow-hidden">
          {editorHeight > 0 && (
            <DiffEditor
              height={editorHeight}
              width="100%"
              language={language}
              original={originalText}
              modified={modifiedText}
              theme={theme === 'dark' ? 'zerodock-dark' : 'zerodock-light'}
              beforeMount={handleEditorWillMount}
              onMount={handleEditorDidMount}
              options={{
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                fontSize: 14,
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                wordWrap: 'on',
                lineNumbersMinChars: 3,
                padding: { top: 16, bottom: 16 },
                automaticLayout: true,
                originalEditable: true,
                readOnly: false,
                renderSideBySide: sideBySide,
                ignoreTrimWhitespace: true,
                scrollbar: {
                  alwaysConsumeMouseWheel: false
                }
              }}
              loading={
                <div className="h-full flex items-center justify-center text-[var(--zd-text-muted)] text-sm">
                  Loading Diff Editor...
                </div>
              }
            />
          )}
        </div>
      </ToolWorkspace>
    </ToolPage>
  );
}
