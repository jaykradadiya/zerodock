import { useState } from 'react';
import { Database, Plus, Trash2, Play } from 'lucide-react';
import { createToolStore } from '../../../core/store/useToolState';
import { useSyncToolUrl } from '../../../shared/hooks/useSyncToolUrl';
import { CodePanel } from '../../../shared/components/CodePanel';
import { ToolPage, ToolHeader, ToolWorkspace, SplitPanels } from '../../../shared/components/ToolLayout';
import { Button, SectionLabel } from '../../../shared/components/ui';

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
    { id: '3', name: 'email', type: 'email' },
  ],
});

export default function MockDataGenerator() {
  const { count, fields, setValues } = useMockDataStore();
  const [output, setOutput] = useState('');

  useSyncToolUrl(() => ({ count, fields }), setValues, [count, fields]);

  const updateState = (updates: Partial<MockDataState>) => {
    setValues(updates);
  };

  const addField = () => {
    updateState({
      fields: [...fields, { id: Date.now().toString(), name: 'newField', type: 'fullName' }],
    });
  };

  const updateField = (id: string, updates: Partial<SchemaField>) => {
    updateState({
      fields: fields.map((f) => (f.id === id ? { ...f, ...updates } : f)),
    });
  };

  const removeField = (id: string) => {
    updateState({
      fields: fields.filter((f) => f.id !== id),
    });
  };

  const generateData = async () => {
    const { faker } = await import('@faker-js/faker');
    const data = Array.from({ length: Math.min(count, 5000) }).map(() => {
      const row: Record<string, unknown> = {};
      fields.forEach((field) => {
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

  return (
    <ToolPage>
      <ToolHeader
        icon={Database}
        title="Mock Data Generator"
        description="Generate thousands of realistic JSON records instantly"
      />

      <ToolWorkspace>
        <SplitPanels>
          <div className="w-full md:w-96 flex flex-col min-h-0 border-b md:border-b-0 md:border-r border-[var(--zd-border)] bg-[var(--zd-surface)] shrink-0">
            <div className="px-4 py-2.5 bg-[var(--zd-surface-raised)] border-b border-[var(--zd-border)] shrink-0 flex justify-between items-center min-h-[42px]">
              <SectionLabel>Schema</SectionLabel>
              <button
                type="button"
                onClick={addField}
                className="text-xs text-[var(--zd-accent)] font-semibold flex items-center gap-1 hover:underline"
              >
                <Plus className="w-3 h-3" /> Add Field
              </button>
            </div>

            <div className="flex-1 overflow-auto p-4 flex flex-col gap-3 custom-scrollbar">
              {fields.map((field) => (
                <div key={field.id} className="flex gap-2 items-center bg-[var(--zd-bg)] p-2 rounded-lg border border-[var(--zd-border)] shadow-sm">
                  <input
                    type="text"
                    value={field.name}
                    onChange={(e) => updateField(field.id, { name: e.target.value })}
                    placeholder="Field Name"
                    className="w-1/2 px-2 py-1.5 bg-[var(--zd-surface)] border border-[var(--zd-border)] rounded text-xs font-mono text-[var(--zd-text-primary)] focus:outline-none focus:border-[var(--zd-accent)]"
                  />
                  <select
                    value={field.type}
                    onChange={(e) => updateField(field.id, { type: e.target.value as SchemaField['type'] })}
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
                  <button type="button" onClick={() => removeField(field.id)} className="p-1 text-[var(--zd-text-muted)] hover:text-red-500 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-[var(--zd-border)] flex gap-2 items-center bg-[var(--zd-surface-raised)] shrink-0">
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-semibold text-[var(--zd-text-muted)]">Rows</span>
                <input
                  type="number"
                  min="1"
                  max="5000"
                  value={count}
                  onChange={(e) => updateState({ count: parseInt(e.target.value, 10) || 1 })}
                  className="w-20 px-2 py-1.5 bg-[var(--zd-bg)] border border-[var(--zd-border)] rounded text-sm text-[var(--zd-text-primary)] focus:outline-none"
                />
              </div>
              <Button
                onClick={generateData}
                disabled={fields.length === 0}
                className="flex-1 mt-4 !bg-[var(--zd-accent)] hover:!brightness-90 disabled:!opacity-50"
              >
                <Play className="w-4 h-4" /> Generate
              </Button>
            </div>
          </div>

          <CodePanel
            title="Output (JSON)"
            value={output}
            readOnly
            language="json"
            placeholder="Generated JSON will appear here..."
            downloadFileName="mock-data.json"
            downloadMimeType="application/json"
          />
        </SplitPanels>
      </ToolWorkspace>
    </ToolPage>
  );
}
