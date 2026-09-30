import { useRef, useEffect, useCallback } from 'react';
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
  onFocus?: () => void;
  editorRef?: React.MutableRefObject<any>;
  className?: string;
}

export function CodeEditor({
  modelId,
  value,
  language = 'json',
  readOnly = false,
  onChange,
  onFocus,
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
  const onFocusRef = useRef(onFocus);
  const readOnlyRef = useRef(readOnly);
  const isWorkspaceModel = Boolean(modelId);

  useEffect(() => {
    modelIdRef.current = modelId;
  }, [modelId]);

  useEffect(() => {
    onFocusRef.current = onFocus;
  }, [onFocus]);

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
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    models.forEach((m: any) => {
      const pathParts = m.uri.path.split('/');
      const filename = pathParts[pathParts.length - 1];
      if (filename && filename.endsWith('.json')) {
        const id = filename.replace('.json', '');
        if (UUID_REGEX.test(id) && !currentTabIds.has(id)) {
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
    const prefState = usePreferenceStore.getState();
    const activeTheme = prefState.getActiveTheme();
    applyTheme(activeTheme, prefState.themeOverrides, prefState.highContrast);

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

  const loadModel = useCallback(async () => {
    if (!editorRef.current || !monacoRef.current) return;
    const monaco = monacoRef.current;

    if (modelId) {
      const uri = monaco.Uri.parse(`file:///${modelId}.json`);
      let model = monaco.editor.getModel(uri);

      if (!model) {
        const content = await getFileContent(modelId);
        if (modelId !== modelIdRef.current || !editorRef.current || editorRef.current.isDisposed?.()) {
          return;
        }
        model = monaco.editor.createModel(content, language, uri);
      }
      if (modelId === modelIdRef.current && editorRef.current && !editorRef.current.isDisposed?.()) {
        editorRef.current.setModel(model);
      }
    }
  }, [modelId, language, getFileContent]);

  useEffect(() => {
    loadModel();
  }, [loadModel]);

  // Recover workspace tab model if a panel editor accidentally disposed it
  useEffect(() => {
    if (!modelId || !editorRef.current || !monacoRef.current) return;
    const model = editorRef.current.getModel();
    if (!model || (typeof model.isDisposed === 'function' && model.isDisposed())) {
      void loadModel();
    }
  }, [modelId, tabs.length, loadModel]);

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

    editor.onDidFocusEditorWidget(() => {
      onFocusRef.current?.();
    });

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
    <div
      onMouseDownCapture={() => onFocusRef.current?.()}
      className={cn('zd-tool-fill w-full overflow-hidden bg-[var(--zd-surface)] relative', className)}
      style={{ contain: 'layout size paint' }}
    >
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
          <div
            className="h-full w-full flex bg-[var(--zd-surface)] font-mono text-xs select-none pointer-events-none overflow-hidden"
            aria-hidden="true"
          >
            <div className="w-[51px] h-full border-r border-[var(--zd-border)]/40 bg-[var(--zd-surface-raised)]/20 py-4 px-2 text-[var(--zd-text-muted)]/40 text-right shrink-0">
              1<br />2<br />3
            </div>
            <div className="flex-1 p-4 text-[var(--zd-text-muted)]/50">
              Loading editor workspace...
            </div>
          </div>
        }
        {...props}
      />
    </div>
  );
}
