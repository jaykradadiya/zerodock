import { useState } from 'react';
import { CalendarClock, Sparkles, Copy, Check } from 'lucide-react';
import { createToolStore } from '../../../core/store/useToolState';

const useCronStore = createToolStore('crontab-guru', {
  cron: '* * * * *',
});

function humanizeCron(cron: string) {
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) return 'Invalid cron format (must be 5 parts)';
  
  const [min, hour, dom, mon, dow] = parts;
  let text = 'Runs ';

  if (min === '*' && hour === '*' && dom === '*' && mon === '*' && dow === '*') {
    return 'Runs every minute';
  }

  if (min !== '*') text += `at minute ${min} `;
  else text += 'every minute ';

  if (hour !== '*') text += `past hour ${hour} `;
  if (dom !== '*') text += `on day-of-month ${dom} `;
  if (mon !== '*') text += `in month ${mon} `;
  if (dow !== '*') text += `on day-of-week ${dow}`;

  return text.trim();
}

export default function CrontabGuru() {
  const { cron, setValues } = useCronStore();
  const setCron = (val: string) => setValues({ cron: val });
  const [copied, setCopied] = useState(false);

  const parts = cron.trim().split(/\s+/);
  const humanText = humanizeCron(cron);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(cron);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const getLabelForIndex = (index: number) => {
    switch(index) {
      case 0: return 'minute (0 - 59)';
      case 1: return 'hour (0 - 23)';
      case 2: return 'day of month (1 - 31)';
      case 3: return 'month (1 - 12)';
      case 4: return 'day of week (0 - 6)';
      default: return '';
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center p-6 md:p-12 w-full max-w-4xl mx-auto h-full min-h-0">
      <div className="w-full flex items-center gap-4 mb-8 shrink-0">
        <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
          <CalendarClock className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Crontab Guru</h1>
          <p className="text-slate-500 dark:text-slate-400">Quickly parse and format cron expressions</p>
        </div>
      </div>

      <div className="w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-8 flex flex-col gap-6">
        
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Cron Expression</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={cron}
              onChange={(e) => setCron(e.target.value)}
              className="flex-1 px-4 py-4 text-xl font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-center text-slate-800 dark:text-slate-200 focus:outline-none focus:border-purple-500 transition-colors"
              placeholder="* * * * *"
            />
            <button
              onClick={copyToClipboard}
              className="px-4 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors text-slate-600 dark:text-slate-300"
            >
              {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <div className="bg-purple-50/50 dark:bg-purple-900/20 rounded-xl border border-purple-100 dark:border-purple-900/50 p-6 flex items-center gap-3 justify-center text-lg font-medium text-purple-700 dark:text-purple-300 text-center">
          <Sparkles className="w-5 h-5" />
          {humanText}
        </div>

        <div className="grid grid-cols-5 gap-2 mt-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg">
              <span className="text-2xl font-mono text-slate-900 dark:text-slate-100 mb-2">
                {parts[i] || '-'}
              </span>
              <span className="text-[10px] font-semibold text-slate-400 text-center uppercase">
                {getLabelForIndex(i)}
              </span>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
