import { useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import type { EditorProps } from '@monaco-editor/react';
import { usePreferenceStore } from '../../../core/store/usePreferenceStore';
import { useWorkspaceStore } from '../../../modules/tools/json-toolkit/store/workspaceStore';

interface CodeEditorProps extends Omit<EditorProps, 'theme' | 'onChange'> {
  modelId?: string;
  value?: string;
  language?: string;
  readOnly?: boolean;
  onChange?: (value: string | undefined) => void;
  editorRef?: React.MutableRefObject<any>;
}

export function CodeEditor({ modelId, value, language = 'json', readOnly = false, onChange, editorRef: externalEditorRef, ...props }: CodeEditorProps) {
  const { theme } = usePreferenceStore();
  const getFileContent = useWorkspaceStore(s => s.getFileContent);
  const updateTabContent = useWorkspaceStore(s => s.updateTabContent);
  const tabs = useWorkspaceStore(s => s.tabs);
  
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const timeoutRef = useRef<any>(null);

  const modelIdRef = useRef(modelId);
  const onChangeRef = useRef(onChange);
  const readOnlyRef = useRef(readOnly);

  useEffect(() => {
    modelIdRef.current = modelId;
  }, [modelId]);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    readOnlyRef.current = readOnly;
  }, [readOnly]);

  // Cleanup unused Monaco models when tabs are removed
  useEffect(() => {
    if (!monacoRef.current) return;
    const monaco = monacoRef.current;
    const currentTabIds = new Set(tabs.map(t => t.id));
    const models = monaco.editor.getModels();
    models.forEach((m: any) => {
      const pathParts = m.uri.path.split('/');
      const filename = pathParts[pathParts.length - 1];
      if (filename && filename.endsWith('.json')) {
        const id = filename.replace('.json', '');
        // Only dispose if it corresponds to a tab UUID but is not in our tabs set
        if (id && id.length > 10 && !currentTabIds.has(id)) {
          m.dispose();
        }
      }
    });
  }, [tabs]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      // Clean up all models when editor unmounts to prevent memory leak
      if (monacoRef.current) {
        const models = monacoRef.current.editor.getModels();
        models.forEach((m: any) => m.dispose());
      }
    };
  }, []);

  const handleEditorWillMount = (monaco: any) => {
    monaco.editor.defineTheme('zerodock-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#16161A', // var(--zd-surface) dark
        'editor.foreground': '#EAEAF0', // var(--zd-text-primary) dark
        'editor.lineHighlightBackground': '#1C1C21', // var(--zd-surface-raised) dark
        'editorLineNumber.foreground': '#5E5E72', // var(--zd-text-muted) dark
      }
    });
    monaco.editor.defineTheme('zerodock-light', {
      base: 'vs',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#FFFFFF', // var(--zd-surface) light
        'editor.foreground': '#1A1A2E', // var(--zd-text-primary) light
        'editor.lineHighlightBackground': '#FAFAF8', // var(--zd-surface-raised) light
        'editorLineNumber.foreground': '#8E8EA0', // var(--zd-text-muted) light
      }
    });

    if (!monaco.languages.getLanguages().some((l: any) => l.id === 'json-hover-registered')) {
      monaco.languages.register({ id: 'json-hover-registered' });
      monaco.languages.registerHoverProvider('json', {
        provideHover: (model: any, position: any) => {
          const word = model.getWordAtPosition(position);
          if (!word) return null;
          const num = Number(word.word);
          if (isNaN(num)) return null;
          const isSeconds = word.word.length === 10;
          const isMilliseconds = word.word.length === 13;
          if (!isSeconds && !isMilliseconds) return null;
          const date = new Date(isSeconds ? num * 1000 : num);
          if (date.getFullYear() < 1970 || date.getFullYear() > 2100) return null;
          return {
            range: new monaco.Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn),
            contents: [
              { value: `**Unix Epoch Timestamp**` },
              { value: `📅 **UTC:** ${date.toUTCString()}` },
              { value: `📍 **Local:** ${date.toLocaleString()}` }
            ]
          };
        }
      });
    }
  };

  const loadModel = async () => {
    if (!editorRef.current || !monacoRef.current) return;
    const monaco = monacoRef.current;
    
    if (modelId) {
      const uri = monaco.Uri.parse(`file:///${modelId}.json`);
      let model = monaco.editor.getModel(uri);
      
      if (!model) {
        // Show loading state implicitly by waiting
        const content = await getFileContent(modelId);
        // Create model bypassing react props
        model = monaco.editor.createModel(content, language, uri);
      }
      editorRef.current.setModel(model);
    }
  };

  useEffect(() => {
    loadModel();
  }, [modelId]);

  // Sync value prop if modified externally (sample loaded/cleared) without resetting cursor position
  useEffect(() => {
    if (editorRef.current && value !== undefined && !modelId) {
      const currentValue = editorRef.current.getValue();
      if (value !== currentValue) {
        editorRef.current.setValue(value);
      }
    }
  }, [value, modelId]);

  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    if (externalEditorRef) {
      externalEditorRef.current = editor;
    }

    editor.onDidChangeModelContent(() => {
      const val = editor.getValue();
      if (onChangeRef.current) onChangeRef.current(val);
      
      const currentModelId = modelIdRef.current;
      if (currentModelId && !readOnlyRef.current) {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          updateTabContent(currentModelId, val);
        }, val.length > 1024 * 1024 ? 3000 : 1500); // Debounce longer for >1MB files
      }
    });

    loadModel();
  };

  return (
    <div className="flex-1 min-h-0 w-full h-full border border-[var(--zd-border)] overflow-hidden flex flex-col">
      <Editor
        height="100%"
        width="100%"
        language={language}
        defaultValue={!modelId ? value : undefined} // Treat as uncontrolled to avoid cursor reset
        theme={theme === 'dark' ? 'zerodock-dark' : 'zerodock-light'}
        beforeMount={handleEditorWillMount}
        onMount={handleEditorDidMount}
        options={{
          readOnly,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          fontSize: 14,
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
          wordWrap: 'on',
          lineNumbersMinChars: 3,
          padding: { top: 16, bottom: 16 },
          automaticLayout: true,
          tabSize: 2,
          colorDecorators: true,
          // Optimization for large files
          largeFileOptimizations: true,
          scrollbar: {
            alwaysConsumeMouseWheel: false
          }
        }}
        loading={
          <div className="flex-1 h-full flex items-center justify-center text-slate-400 text-sm">
            Loading editor...
          </div>
        }
        {...props}
      />
    </div>
  );
}
