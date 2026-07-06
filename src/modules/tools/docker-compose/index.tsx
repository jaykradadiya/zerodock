import { useState, useEffect } from 'react';
import { Container, Copy, Check, Download } from 'lucide-react';
import { createToolStore } from '../../../core/store/useToolState';
import { updateURLWithState, getStateFromURL } from '../../../shared/utils/state-share';
import { exportToFile } from '../../../shared/utils/export';

interface DockerState {
  services: {
    postgres: boolean;
    mysql: boolean;
    redis: boolean;
    mongodb: boolean;
  };
}

const useDockerStore = createToolStore<DockerState>('docker-compose', {
  services: {
    postgres: true,
    mysql: false,
    redis: true,
    mongodb: false,
  },
});

export default function DockerComposeGenerator() {
  const { services, setValues } = useDockerStore();
  const [output, setOutput] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const urlState = getStateFromURL<DockerState>();
    if (urlState && urlState.services) {
      setValues(urlState);
    }
  }, []);

  const toggleService = (key: keyof DockerState['services']) => {
    const newServices = { ...services, [key]: !services[key] };
    setValues({ services: newServices });
    updateURLWithState({ services: newServices });
  };

  useEffect(() => {
    let yaml = `version: '3.8'\n\nservices:\n`;
    
    if (services.postgres) {
      yaml += `
  postgres:
    image: postgres:15-alpine
    restart: always
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
      POSTGRES_DB: default_db
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
`;
    }

    if (services.mysql) {
      yaml += `
  mysql:
    image: mysql:8
    restart: always
    environment:
      MYSQL_ROOT_PASSWORD: rootpassword
      MYSQL_DATABASE: default_db
      MYSQL_USER: user
      MYSQL_PASSWORD: password
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql
`;
    }

    if (services.mongodb) {
      yaml += `
  mongodb:
    image: mongo:6
    restart: always
    environment:
      MONGO_INITDB_ROOT_USERNAME: root
      MONGO_INITDB_ROOT_PASSWORD: example
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db
`;
    }

    if (services.redis) {
      yaml += `
  redis:
    image: redis:7-alpine
    restart: always
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --save 60 1 --loglevel warning
`;
    }

    if (!services.postgres && !services.mysql && !services.mongodb && !services.redis) {
      yaml = `# Select at least one service on the left to generate the docker-compose.yml file.`;
    } else {
      yaml += `\nvolumes:\n`;
      if (services.postgres) yaml += `  postgres_data:\n`;
      if (services.mysql) yaml += `  mysql_data:\n`;
      if (services.mongodb) yaml += `  mongodb_data:\n`;
      if (services.redis) yaml += `  redis_data:\n`;
    }

    setOutput(yaml.trim());
  }, [services]);

  const copyToClipboard = async () => {
    if (!output || output.startsWith('#')) return;
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
        <div className="w-12 h-12 rounded-xl bg-[var(--zd-primary-soft)] text-[var(--zd-primary)] flex items-center justify-center text-[var(--zd-primary)]">
          <Container className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl 2xl:text-3xl font-bold text-[var(--zd-text-primary)]">Docker Compose Generator</h1>
          <p className="text-[var(--zd-text-secondary)]">Instantly bootstrap local databases and services</p>
        </div>
      </div>

      <div className="w-full flex flex-col md:flex-row flex-1 min-h-0 bg-[var(--zd-bg)] rounded-2xl border border-[var(--zd-border)] shadow-sm overflow-hidden">
        
        {/* Sidebar Controls */}
        <div className="w-full md:w-64 p-6 border-b md:border-b-0 md:border-r border-[var(--zd-border)] bg-[var(--zd-surface)] flex flex-col gap-6 overflow-y-auto">
          <div className="flex flex-col gap-4">
            <h3 className="text-xs font-semibold text-[var(--zd-text-muted)] uppercase tracking-wider">Databases</h3>
            
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${services.postgres ? 'bg-blue-600 border-blue-600 text-white' : 'border-[var(--zd-border-hover)] bg-[var(--zd-bg)] group-hover:border-blue-400'}`}>
                {services.postgres && <Check className="w-3.5 h-3.5" />}
              </div>
              <input type="checkbox" checked={services.postgres} onChange={() => toggleService('postgres')} className="hidden" />
              <span className="text-sm font-medium text-[var(--zd-text-secondary)]">PostgreSQL</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer group">
              <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${services.mysql ? 'bg-blue-600 border-blue-600 text-white' : 'border-[var(--zd-border-hover)] bg-[var(--zd-bg)] group-hover:border-blue-400'}`}>
                {services.mysql && <Check className="w-3.5 h-3.5" />}
              </div>
              <input type="checkbox" checked={services.mysql} onChange={() => toggleService('mysql')} className="hidden" />
              <span className="text-sm font-medium text-[var(--zd-text-secondary)]">MySQL</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer group">
              <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${services.mongodb ? 'bg-blue-600 border-blue-600 text-white' : 'border-[var(--zd-border-hover)] bg-[var(--zd-bg)] group-hover:border-blue-400'}`}>
                {services.mongodb && <Check className="w-3.5 h-3.5" />}
              </div>
              <input type="checkbox" checked={services.mongodb} onChange={() => toggleService('mongodb')} className="hidden" />
              <span className="text-sm font-medium text-[var(--zd-text-secondary)]">MongoDB</span>
            </label>

            <h3 className="text-xs font-semibold text-[var(--zd-text-muted)] uppercase tracking-wider mt-4">Cache / Queues</h3>

            <label className="flex items-center gap-3 cursor-pointer group">
              <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${services.redis ? 'bg-blue-600 border-blue-600 text-white' : 'border-[var(--zd-border-hover)] bg-[var(--zd-bg)] group-hover:border-blue-400'}`}>
                {services.redis && <Check className="w-3.5 h-3.5" />}
              </div>
              <input type="checkbox" checked={services.redis} onChange={() => toggleService('redis')} className="hidden" />
              <span className="text-sm font-medium text-[var(--zd-text-secondary)]">Redis</span>
            </label>
          </div>
        </div>

        {/* Output Panel */}
        <div className="flex-1 flex flex-col relative bg-[var(--zd-bg)] min-h-[400px]">
          <div className="px-4 py-2 bg-[var(--zd-surface)] border-b border-[var(--zd-border)] flex justify-between items-center shrink-0">
            <span className="text-xs font-semibold text-[var(--zd-text-muted)] uppercase tracking-wider">docker-compose.yml</span>
            {!output.startsWith('#') && (
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => exportToFile(output, 'docker-compose.yml', 'text/yaml')}
                  className="text-xs text-[var(--zd-primary)] hover:underline flex items-center gap-1"
                >
                  <Download className="w-3 h-3" /> Download
                </button>
                <button onClick={copyToClipboard} className="text-xs text-[var(--zd-primary)] hover:underline flex items-center gap-1">
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            )}
          </div>
          
          <textarea
            value={output}
            readOnly
            className="flex-1 w-full p-6 bg-transparent border-none resize-none focus:outline-none focus:ring-0 text-[13px] font-mono text-[var(--zd-text-secondary)] whitespace-pre leading-relaxed"
            spellCheck={false}
          />
        </div>
        
      </div>
    </div>
  );
}
