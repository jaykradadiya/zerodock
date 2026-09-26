import { useRef, useEffect } from 'react';
import '../../../core/monaco/setup';
import Editor from '@monaco-editor/react';
import type { EditorProps } from '@monaco-editor/react';
import { usePreferenceStore } from '../../../core/store/usePreferenceStore';
import { useWorkspaceStore } from '../../../modules/tools/json-toolkit/store/workspaceStore';
import { MONACO_THEME_ID, applyTheme } from '../../../core/theme/themeEngine';
import { cn } from '../ui/cn';

interface CodeEditorProps extends Omit<EditorProps, 'theme' | 'onChange'> {
  modelId?: string;
  value?: string;
  language?: string;
  readOnly?: boolean;
  onChange?: (value: string | undefined) => void;
  editorRef?: React.MutableRefObject<any>;
  className?: string;
}

export function CodeEditor({
  modelId,
  value,
  language = 'json',
  readOnly = false,
  onChange,
  editorRef: externalEditorRef,
  className,
  ...props
}: CodeEditorProps) {
  const getFileContent = useWorkspaceStore(s => s.getFileContent);
  const updateTabContent = useWorkspaceStore(s => s.updateTabContent);
  const tabs = useWorkspaceStore(s => s.tabs);

  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const timeoutRef = useRef<any>(null);
  const modelIdRef = useRef(modelId);
  const onChangeRef = useRef(onChange);
  const readOnlyRef = useRef(readOnly);
  const isWorkspaceModel = Boolean(modelId);

  useEffect(() => {
    modelIdRef.current = modelId;
  }, [modelId]);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    readOnlyRef.current = readOnly;
  }, [readOnly]);

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
        if (id && id.length > 10 && !currentTabIds.has(id)) {
          m.dispose();
        }
      }
    });
  }, [tabs]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      // Only dispose this editor's ephemeral model — never workspace tab models
      if (!isWorkspaceModel && editorRef.current) {
        const model = editorRef.current.getModel();
        if (model && typeof model.isDisposed === 'function' && !model.isDisposed()) {
          model.dispose();
        }
      }
    };
  }, [isWorkspaceModel]);

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
        'editorLineHighlightBackground': '#FAFAF8',
        'editorLineNumber.foreground': '#8E8EA0',
      }
    });

    const prefState = usePreferenceStore.getState();
    const activeTheme = prefState.getActiveTheme();
    applyTheme(activeTheme, prefState.themeOverrides);

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
        const content = await getFileContent(modelId);
        model = monaco.editor.createModel(content, language, uri);
      }
      editorRef.current.setModel(model);
    }
  };

  useEffect(() => {
    loadModel();
  }, [modelId]);

  // Recover workspace tab model if a panel editor accidentally disposed it
  useEffect(() => {
    if (!modelId || !editorRef.current || !monacoRef.current) return;
    const model = editorRef.current.getModel();
    if (!model || (typeof model.isDisposed === 'function' && model.isDisposed())) {
      void loadModel();
    }
  }, [modelId, tabs.length]);

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
        }, val.length > 1024 * 1024 ? 3000 : 1500);
      }
    });

    loadModel();
  };

  return (
    <div className={cn('zd-tool-fill w-full overflow-hidden bg-[var(--zd-surface)]', className)}>
      <Editor
        height="100%"
        width="100%"
        language={language}
        defaultValue={!modelId ? value : undefined}
        theme={MONACO_THEME_ID}
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
          largeFileOptimizations: true,
          scrollbar: {
            alwaysConsumeMouseWheel: true,
            vertical: 'visible',
            horizontal: 'auto',
            verticalScrollbarSize: 10,
            horizontalScrollbarSize: 10,
            useShadows: false,
          },
          overviewRulerLanes: 0,
          hideCursorInOverviewRuler: true,
          smoothScrolling: true,
        }}
        loading={
          <div className="h-full flex items-center justify-center text-[var(--zd-text-muted)] text-sm">
            Loading editor...
          </div>
        }
        {...props}
      />
    </div>
  );
}
