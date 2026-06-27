import { useState } from 'react';
import { Database, ArrowRight, Copy, Check } from 'lucide-react';
import { CodeEditor } from '../../../shared/components/CodeEditor';
import { createToolStore } from '../../../core/store/useToolState';

const useSqlStore = createToolStore('sql-formatter', {
  inputSql: 'select id, name, email from users where active = 1 and role = \\\'admin\\\' order by created_at desc',
});

function formatSql(sql: string) {
  if (!sql) return '';

  const keywords = [
    'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'ORDER BY', 'GROUP BY', 
    'HAVING', 'LIMIT', 'OFFSET', 'JOIN', 'LEFT JOIN', 'RIGHT JOIN', 
    'INNER JOIN', 'OUTER JOIN', 'ON', 'AS', 'IN', 'IS', 'NULL', 'NOT', 
    'ASC', 'DESC', 'INSERT INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE',
    'CREATE TABLE', 'ALTER TABLE', 'DROP TABLE'
  ];

  let formatted = sql;
  
  // Basic tokenization and uppercase for known keywords
  // This is a naive regex-based formatter
  keywords.forEach(kw => {
    const regex = new RegExp(`\\b${kw}\\b`, 'gi');
    formatted = formatted.replace(regex, kw);
  });

  // Adding newlines before major clauses
  const majorClauses = [
    'SELECT', 'FROM', 'WHERE', 'ORDER BY', 'GROUP BY', 'HAVING', 'LIMIT',
    'JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN', 'INSERT INTO', 'VALUES',
    'UPDATE', 'SET', 'DELETE'
  ];

  majorClauses.forEach(kw => {
    const regex = new RegExp(`(\\s)(${kw})(\\s)`, 'g');
    formatted = formatted.replace(regex, `\n$2$3`);
    
    // Also handle if it's at the very beginning
    const startRegex = new RegExp(`^(${kw})(\\s)`, 'g');
    formatted = formatted.replace(startRegex, `$1$2`);
  });
  
  // Adding indents for AND / OR inside WHERE
  formatted = formatted.replace(/\n(AND|OR)\b/g, '\n  $1');

  // Indent select items (naive, comma-based)
  // formatted = formatted.replace(/,\s+/g, ',\n  '); // Overkill for simple formatter without AST

  return formatted.trim();
}

export default function SqlFormatter() {
  const { inputSql, setValues } = useSqlStore();
  const setInputSql = (val: string) => setValues({ inputSql: val });
  
  const [copied, setCopied] = useState(false);

  const formattedSql = formatSql(inputSql);

  const triggerCopy = () => {
    navigator.clipboard.writeText(formattedSql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex-1 flex flex-col items-center p-4 xl:p-8 w-full h-[calc(100vh-96px)] xl:h-[calc(100vh-128px)] min-h-0 relative">
      <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[var(--zd-primary-soft)] flex items-center justify-center text-[var(--zd-primary)] shrink-0">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">SQL Formatter</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">Beautify and format SQL queries</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2.5">
          <button
            onClick={triggerCopy}
            disabled={!formattedSql}
            className="flex items-center gap-1.5 px-4 py-2 bg-[var(--zd-primary)] hover:bg-[var(--zd-primary)]/90 text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? "Copied!" : "Copy"}</span>
          </button>
        </div>
      </div>

      <div className="w-full flex-1 min-h-0 bg-[var(--zd-surface)] rounded-2xl border border-[var(--zd-border)] shadow-[var(--zd-shadow-md)] overflow-hidden flex flex-col md:flex-row relative">
        
        <div className="flex-1 flex flex-col min-w-0 border-b md:border-b-0 md:border-r border-[var(--zd-border)]">
          <div className="px-4 py-2 bg-[var(--zd-surface-raised)] border-b border-[var(--zd-border)] shrink-0 flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <span>Raw SQL</span>
          </div>
          <div className="flex-1 min-h-0 relative">
            <div className="absolute inset-0">
              <CodeEditor
                value={inputSql}
                onChange={(val) => setInputSql(val || '')}
                language="sql"
              />
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          <div className="px-4 py-2 bg-[var(--zd-surface-raised)] border-b border-[var(--zd-border)] shrink-0 flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <span>Formatted SQL</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[var(--zd-primary)]">Beautified</span>
          </div>
          <div className="flex-1 min-h-0 relative">
            <div className="absolute inset-0">
              <CodeEditor
                value={formattedSql}
                readOnly
                language="sql"
              />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
