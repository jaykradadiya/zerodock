import { useState, useEffect } from 'react';
import { ShieldCheck, Copy, Check, RefreshCw } from 'lucide-react';
import { createToolStore } from '../../../core/store/useToolState';
import { updateURLWithState, getStateFromURL } from '../../../shared/utils/state-share';

interface PasswordState {
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  symbols: boolean;
}

const usePasswordStore = createToolStore<PasswordState>('password-generator', {
  length: 16,
  uppercase: true,
  lowercase: true,
  numbers: true,
  symbols: true,
});

export default function PasswordGenerator() {
  const { length, uppercase, lowercase, numbers, symbols, setValues } = usePasswordStore();
  const [output, setOutput] = useState('');
  const [copied, setCopied] = useState(false);

  // Restore state from URL on mount
  useEffect(() => {
    const urlState = getStateFromURL<PasswordState>();
    if (urlState) {
      setValues(urlState);
    }
  }, []);

  const updateState = (updates: Partial<PasswordState>) => {
    setValues(updates);
    const newState = { length, uppercase, lowercase, numbers, symbols, ...updates };
    updateURLWithState(newState);
  };

  const generatePassword = () => {
    let charset = '';
    if (uppercase) charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (lowercase) charset += 'abcdefghijklmnopqrstuvwxyz';
    if (numbers) charset += '0123456789';
    if (symbols) charset += '!@#$%^&*()_+~`|}{[]:;?><,./-=';

    if (!charset) {
      setOutput('Please select at least one character type.');
      return;
    }

    let password = '';
    const array = new Uint32Array(length);
    window.crypto.getRandomValues(array);
    for (let i = 0; i < length; i++) {
      password += charset[array[i] % charset.length];
    }
    setOutput(password);
  };

  useEffect(() => {
    generatePassword();
  }, [length, uppercase, lowercase, numbers, symbols]);

  const copyToClipboard = async () => {
    if (!output || output.startsWith('Please')) return;
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center p-6 md:p-12 w-full max-w-2xl mx-auto h-full min-h-0">
      <div className="w-full flex items-center gap-4 mb-8 shrink-0">
        <div className="w-12 h-12 rounded-xl bg-green-50 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Password Generator</h1>
          <p className="text-slate-500 dark:text-slate-400">Generate secure, random passwords locally</p>
        </div>
      </div>

      <div className="w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden p-6">
        
        {/* Output Display */}
        <div className="relative mb-8 group">
          <input
            type="text"
            readOnly
            value={output}
            className="w-full p-4 pr-24 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-center text-xl md:text-2xl font-mono text-slate-800 dark:text-slate-200 tracking-wider focus:outline-none"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            <button
              onClick={generatePassword}
              className="p-2 text-slate-400 hover:text-green-600 dark:hover:text-green-400 transition-colors bg-white dark:bg-slate-900 rounded-lg border border-transparent hover:border-slate-200 dark:hover:border-slate-800"
              title="Regenerate"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={copyToClipboard}
              className="p-2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors bg-white dark:bg-slate-900 rounded-lg border border-transparent hover:border-slate-200 dark:hover:border-slate-800"
              title="Copy"
            >
              {copied ? <Check className="w-4 h-4 text-blue-600" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className="space-y-6">
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Password Length</label>
              <span className="text-sm font-mono text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">{length}</span>
            </div>
            <input
              type="range"
              min="4"
              max="64"
              value={length}
              onChange={(e) => updateState({ length: parseInt(e.target.value, 10) })}
              className="w-full accent-green-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { id: 'uppercase', label: 'Uppercase (A-Z)', value: uppercase, setter: (val: boolean) => updateState({ uppercase: val }) },
              { id: 'lowercase', label: 'Lowercase (a-z)', value: lowercase, setter: (val: boolean) => updateState({ lowercase: val }) },
              { id: 'numbers', label: 'Numbers (0-9)', value: numbers, setter: (val: boolean) => updateState({ numbers: val }) },
              { id: 'symbols', label: 'Symbols (!@#$...)', value: symbols, setter: (val: boolean) => updateState({ symbols: val }) }
            ].map((option) => (
              <label key={option.id} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-950/50 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer hover:border-green-500/50 transition-colors select-none">
                <input
                  type="checkbox"
                  checked={option.value}
                  onChange={(e) => option.setter(e.target.checked)}
                  className="w-4 h-4 text-green-600 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 rounded focus:ring-green-500"
                />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{option.label}</span>
              </label>
            ))}
          </div>
        </div>
        
      </div>
    </div>
  );
}
