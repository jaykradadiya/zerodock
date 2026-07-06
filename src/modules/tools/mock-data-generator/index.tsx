import { useState, useEffect } from 'react';
import { Database, Plus, Trash2, Download, Play, Copy, Check } from 'lucide-react';
import { createToolStore } from '../../../core/store/useToolState';
import { updateURLWithState, getStateFromURL } from '../../../shared/utils/state-share';
import { exportToFile } from '../../../shared/utils/export';
import { faker } from '@faker-js/faker';

interface SchemaField {
  id: string;
  name: string;
  type: 'uuid' | 'firstName' | 'lastName' | 'fullName' | 'email' | 'phone' | 'jobTitle' | 'company' | 'paragraph' | 'number' | 'boolean' | 'date';
}

interface MockDataState {
  count: number;
  fields: SchemaField[];
}

const useMockDataStore = createToolStore<MockDataState>('mock-data-generator', {
  count: 10,
  fields: [
    { id: '1', name: 'id', type: 'uuid' },
    { id: '2', name: 'name', type: 'fullName' },
    { id: '3', name: 'email', type: 'email' }
  ],
});

export default function MockDataGenerator() {
  const { count, fields, setValues } = useMockDataStore();
  const [output, setOutput] = useState('');
  const [copied, setCopied] = useState(false);

  // Restore state from URL on mount
  useEffect(() => {
    const urlState = getStateFromURL<MockDataState>();
    if (urlState && urlState.fields) {
      setValues(urlState);
    }
  }, []);

  const updateState = (updates: Partial<MockDataState>) => {
    setValues(updates);
    updateURLWithState({ count, fields, ...updates });
  };

  const addField = () => {
    updateState({
      fields: [...fields, { id: Date.now().toString(), name: 'newField', type: 'fullName' }]
    });
  };

  const updateField = (id: string, updates: Partial<SchemaField>) => {
    updateState({
      fields: fields.map(f => f.id === id ? { ...f, ...updates } : f)
    });
  };

  const removeField = (id: string) => {
    updateState({
      fields: fields.filter(f => f.id !== id)
    });
  };

  const generateData = () => {
    const data = Array.from({ length: Math.min(count, 5000) }).map(() => {
      const row: Record<string, any> = {};
      fields.forEach(field => {
        if (!field.name.trim()) return;
        switch (field.type) {
          case 'uuid': row[field.name] = faker.string.uuid(); break;
          case 'firstName': row[field.name] = faker.person.firstName(); break;
          case 'lastName': row[field.name] = faker.person.lastName(); break;
          case 'fullName': row[field.name] = faker.person.fullName(); break;
          case 'email': row[field.name] = faker.internet.email(); break;
          case 'phone': row[field.name] = faker.phone.number(); break;
          case 'jobTitle': row[field.name] = faker.person.jobTitle(); break;
          case 'company': row[field.name] = faker.company.name(); break;
          case 'paragraph': row[field.name] = faker.lorem.paragraph(); break;
          case 'number': row[field.name] = faker.number.int({ min: 0, max: 1000 }); break;
          case 'boolean': row[field.name] = faker.datatype.boolean(); break;
          case 'date': row[field.name] = faker.date.recent().toISOString(); break;
        }
      });
      return row;
    });

    setOutput(JSON.stringify(data, null, 2));
  };

  const copyToClipboard = async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center p-4 sm:p-6 md:p-8 xl:p-10 2xl:p-12 3xl:p-16 w-full max-w-6xl 2xl:max-w-7xl 3xl:max-w-[1440px] mx-auto h-full min-h-0">
      <div className="w-full flex items-center gap-4 mb-8 shrink-0">
        <div className="w-12 h-12 rounded-xl bg-[var(--zd-primary-soft)] flex items-center justify-center text-[var(--zd-primary)]">
          <Database className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl 2xl:text-3xl font-bold text-[var(--zd-text-primary)]">Mock Data Generator</h1>
          <p className="text-[var(--zd-text-secondary)]">Generate thousands of realistic JSON records instantly</p>
        </div>
      </div>

      <div className="w-full flex flex-col md:flex-row flex-1 min-h-0 bg-[var(--zd-bg)] rounded-2xl border border-[var(--zd-border)] shadow-sm overflow-hidden">
        
        {/* Schema Builder */}
        <div className="w-full md:w-96 flex flex-col border-b md:border-b-0 md:border-r border-[var(--zd-border)] bg-[var(--zd-surface)]">
          <div className="p-4 border-b border-[var(--zd-border)] flex justify-between items-center bg-[var(--zd-surface)] shrink-0">
            <span className="text-xs font-semibold text-[var(--zd-text-muted)] uppercase tracking-wider">Schema</span>
            <button onClick={addField} className="text-xs text-green-600 dark:text-green-400 font-semibold flex items-center gap-1 hover:underline">
              <Plus className="w-3 h-3" /> Add Field
            </button>
          </div>
          
          <div className="flex-1 overflow-auto p-4 flex flex-col gap-3">
            {fields.map((field) => (
              <div key={field.id} className="flex gap-2 items-center bg-[var(--zd-bg)] p-2 rounded-lg border border-[var(--zd-border)] shadow-sm">
                <input
                  type="text"
                  value={field.name}
                  onChange={(e) => updateField(field.id, { name: e.target.value })}
                  placeholder="Field Name"
                  className="w-1/2 px-2 py-1.5 bg-[var(--zd-surface)] border border-[var(--zd-border)] rounded text-xs font-mono text-[var(--zd-text-primary)] focus:outline-none focus:border-green-500"
                />
                <select
                  value={field.type}
                  onChange={(e) => updateField(field.id, { type: e.target.value as any })}
                  className="w-1/2 px-2 py-1.5 bg-[var(--zd-surface)] border border-[var(--zd-border)] rounded text-xs text-[var(--zd-text-primary)] focus:outline-none"
                >
                  <option value="uuid">UUID</option>
                  <option value="firstName">First Name</option>
                  <option value="lastName">Last Name</option>
                  <option value="fullName">Full Name</option>
                  <option value="email">Email</option>
                  <option value="phone">Phone</option>
                  <option value="jobTitle">Job Title</option>
                  <option value="company">Company</option>
                  <option value="number">Number</option>
                  <option value="boolean">Boolean</option>
                  <option value="date">Date</option>
                  <option value="paragraph">Paragraph</option>
                </select>
                <button onClick={() => removeField(field.id)} className="p-1 text-slate-400 hover:text-red-500 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-[var(--zd-border)] flex gap-2 items-center bg-[var(--zd-surface)] shrink-0">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-semibold text-slate-400">Rows</span>
              <input
                type="number"
                min="1"
                max="5000"
                value={count}
                onChange={(e) => updateState({ count: parseInt(e.target.value, 10) || 1 })}
                className="w-20 px-2 py-1.5 bg-[var(--zd-bg)] border border-[var(--zd-border)] rounded text-sm text-[var(--zd-text-primary)] focus:outline-none"
              />
            </div>
            <button
              onClick={generateData}
              disabled={fields.length === 0}
              className="flex-1 h-full py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-600/50 text-white rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 mt-4"
            >
              <Play className="w-4 h-4" /> Generate
            </button>
          </div>
        </div>

        {/* Output Panel */}
        <div className="flex-1 flex flex-col relative bg-[var(--zd-bg)] min-h-[300px]">
          <div className="px-4 py-2 bg-[var(--zd-surface)] border-b border-[var(--zd-border)] flex justify-between items-center shrink-0">
            <span className="text-xs font-semibold text-[var(--zd-text-muted)] uppercase tracking-wider">Output (JSON)</span>
            {output && (
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => exportToFile(output, 'mock-data.json', 'application/json')}
                  className="text-xs text-green-600 dark:text-green-400 hover:underline flex items-center gap-1"
                >
                  <Download className="w-3 h-3" /> Download
                </button>
                <button onClick={copyToClipboard} className="text-xs text-green-600 dark:text-green-400 hover:underline flex items-center gap-1">
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            )}
          </div>
          
          <textarea
            value={output}
            readOnly
            placeholder="Generated JSON will appear here..."
            className="flex-1 w-full p-6 bg-transparent border-none resize-none focus:outline-none focus:ring-0 text-[13px] font-mono text-[var(--zd-text-secondary)] whitespace-pre leading-relaxed"
            spellCheck={false}
          />
        </div>
        
      </div>
    </div>
  );
}
