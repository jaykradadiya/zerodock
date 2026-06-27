import { useState, useRef, useEffect } from 'react';
import { DiffEditor } from '@monaco-editor/react';
import { usePreferenceStore } from '../../../core/store/usePreferenceStore';
import { GitCompare, Trash2, Sparkles, Columns, Split } from 'lucide-react';

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
  
  const [originalText, setOriginalText] = useState('');
  const [modifiedText, setModifiedText] = useState('');

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
    setOriginalText(SAMPLE_LEFT);
    setModifiedText(SAMPLE_RIGHT);
    setLanguage('json');
    if (editorRef.current) {
      editorRef.current.getOriginalEditor().setValue(SAMPLE_LEFT);
      editorRef.current.getModifiedEditor().setValue(SAMPLE_RIGHT);
    }
  };

  const clearAll = () => {
    setOriginalText('');
    setModifiedText('');
    if (editorRef.current) {
      editorRef.current.getOriginalEditor().setValue('');
      editorRef.current.getModifiedEditor().setValue('');
    }
  };

  // Cleanup Monaco models on unmount to prevent leaks
  useEffect(() => {
    return () => {
      if (monacoRef.current) {
        const models = monacoRef.current.editor.getModels();
        models.forEach((m: any) => m.dispose());
      }
    };
  }, []);

  // Synchronize originalText and modifiedText changes (e.g. sample load or clear) to DiffEditor models
  // without resetting cursor position on user typing
  useEffect(() => {
    if (editorRef.current) {
      const originalEditor = editorRef.current.getOriginalEditor();
      if (originalText !== originalEditor.getValue()) {
        originalEditor.setValue(originalText);
      }
    }
  }, [originalText]);

  useEffect(() => {
    if (editorRef.current) {
      const modifiedEditor = editorRef.current.getModifiedEditor();
      if (modifiedText !== modifiedEditor.getValue()) {
        modifiedEditor.setValue(modifiedText);
      }
    }
  }, [modifiedText]);

  return (
    <div className="flex-1 flex flex-col items-center p-4 xl:p-8 w-full h-[calc(100vh-96px)] xl:h-[calc(100vh-128px)] min-h-0 relative">
      
      {/* Header */}
      <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[var(--zd-primary-soft)] flex items-center justify-center text-[var(--zd-primary)] shrink-0">
            <GitCompare className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Text Diff Checker</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">Compare two text files side-by-side or inline in real-time.</p>
          </div>
        </div>
        
        {/* Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Language Selection */}
          <select 
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="text-sm border border-[var(--zd-border)] rounded-xl bg-[var(--zd-surface)] text-slate-800 dark:text-slate-200 px-3 py-2 outline-none focus:border-[var(--zd-primary)] focus:ring-2 focus:ring-[var(--zd-primary-soft)] transition-all"
          >
            <option value="plaintext">Plain Text</option>
            <option value="json">JSON</option>
            <option value="javascript">JavaScript</option>
            <option value="typescript">TypeScript</option>
            <option value="html">HTML</option>
            <option value="css">CSS</option>
            <option value="yaml">YAML</option>
            <option value="xml">XML</option>
          </select>

          {/* Render Mode Toggle */}
          <button
            onClick={() => setSideBySide(!sideBySide)}
            className={`flex items-center gap-1.5 px-3 py-2 border border-[var(--zd-border)] rounded-xl text-sm font-semibold transition-all ${
              sideBySide 
                ? 'bg-[var(--zd-primary-soft)] text-[var(--zd-primary)] border-[var(--zd-primary)]/30' 
                : 'bg-[var(--zd-surface)] text-slate-600 dark:text-slate-400 hover:bg-[var(--zd-primary-soft)] hover:text-[var(--zd-primary)]'
            }`}
            title={sideBySide ? "Switch to Inline View" : "Switch to Side-by-Side View"}
          >
            {sideBySide ? <Columns className="w-4 h-4" /> : <Split className="w-4 h-4" />}
            <span className="hidden md:inline">{sideBySide ? "Split" : "Inline"}</span>
          </button>

          {/* Sample Button */}
          <button
            onClick={loadSample}
            className="flex items-center gap-1.5 px-3 py-2 bg-[var(--zd-surface)] border border-[var(--zd-border)] rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-[var(--zd-primary)] hover:bg-[var(--zd-primary-soft)] transition-all"
          >
            <Sparkles className="w-4 h-4" />
            <span className="hidden sm:inline">Sample</span>
          </button>

          {/* Clear Button */}
          <button
            onClick={clearAll}
            className="flex items-center gap-1.5 px-3 py-2 bg-[var(--zd-surface)] border border-[var(--zd-border)] rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 hover:border-red-200 transition-all"
            title="Clear original and modified inputs"
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">Clear</span>
          </button>
        </div>
      </div>

      {/* Editor Panel */}
      <div className="w-full flex-1 min-h-0 bg-[var(--zd-surface)] rounded-2xl border border-[var(--zd-border)] shadow-[var(--zd-shadow-md)] overflow-hidden flex flex-col relative">
        <div className="absolute inset-0">
          <DiffEditor
            height="100%"
            width="100%"
            language={language}
            original=""
            modified=""
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
              <div className="flex-1 h-full flex items-center justify-center text-slate-400 text-sm bg-[var(--zd-surface-raised)]/20 animate-pulse">
                Loading Diff Editor...
              </div>
            }
          />
        </div>
      </div>
    </div>
  );
}
