import { useRef, useEffect } from 'react';
import { DiffEditor } from '@monaco-editor/react';
import { useGlobalStore } from '../../../../core/store/useGlobalStore';
import { useWorkspaceStore } from '../../../../modules/tools/json-toolkit/store/workspaceStore';

interface DiffViewProps {
  original?: string;
  modified?: string;
  originalModelId?: string;
  modifiedModelId?: string;
}

export function DiffView({ original, modified, originalModelId, modifiedModelId }: DiffViewProps) {
  const { theme } = useGlobalStore();
  const getFileContent = useWorkspaceStore(s => s.getFileContent);
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);

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
        'editorLineNumber.foreground': '#8E8EA0', // var(--zd-text-muted) light
      }
    });
  };

  const loadModels = async () => {
    if (!editorRef.current || !monacoRef.current) return;
    const monaco = monacoRef.current;
    
    if (originalModelId && modifiedModelId) {
      const origUri = monaco.Uri.parse(`file:///${originalModelId}.json`);
      const modUri = monaco.Uri.parse(`file:///${modifiedModelId}.json`);
      
      let origModel = monaco.editor.getModel(origUri);
      if (!origModel) {
        const origContent = await getFileContent(originalModelId);
        origModel = monaco.editor.createModel(origContent, 'json', origUri);
      }
      
      let modModel = monaco.editor.getModel(modUri);
      if (!modModel) {
        const modContent = await getFileContent(modifiedModelId);
        modModel = monaco.editor.createModel(modContent, 'json', modUri);
      }
      
      editorRef.current.setModel({
        original: origModel,
        modified: modModel
      });
    }
  };

  useEffect(() => {
    loadModels();
  }, [originalModelId, modifiedModelId]);

  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    loadModels();
  };

  return (
    <div className="flex-1 min-h-[500px] border border-[var(--zd-border)] overflow-hidden relative rounded-xl">
      <div className="absolute inset-0">
        <DiffEditor
          height="100%"
          width="100%"
          language="json"
          original={!originalModelId ? original : undefined}
          modified={!modifiedModelId ? modified : undefined}
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
            readOnly: true,
            renderSideBySide: true,
            ignoreTrimWhitespace: true,
            scrollbar: {
              alwaysConsumeMouseWheel: false
            }
          }}
          loading={
            <div className="flex-1 h-full flex items-center justify-center text-slate-400 text-sm">
              Loading diff editor...
            </div>
          }
        />
      </div>
    </div>
  );
}
