import React from 'react';
import { SearchCode, AlertCircle } from 'lucide-react';
import { createToolStore } from '../../../core/store/useToolState';

const useRegexStore = createToolStore('regex-tester', {
  regex: '([a-z]+)@([a-z]+)\\.([a-z]{2,})',
  flags: 'g',
  testString: 'test@example.com\nhello@world.org',
});

export default function RegexTester() {
  const { regex, flags, testString, setValues } = useRegexStore();
  const setRegex = (val: string) => setValues({ regex: val });
  const setFlags = (val: string) => setValues({ flags: val });
  const setTestString = (val: string) => setValues({ testString: val });

  const getMatches = () => {
    try {
      if (!regex) return { matches: [], error: null };
      const re = new RegExp(regex, flags);
      const matches = [];
      let match;
      if (flags.includes('g')) {
        while ((match = re.exec(testString)) !== null) {
          matches.push(match);
          if (match.index === re.lastIndex) {
            re.lastIndex++; // Prevent infinite loops
          }
        }
      } else {
        match = re.exec(testString);
        if (match) matches.push(match);
      }
      return { matches, error: null };
    } catch (e: any) {
      return { matches: [], error: e.message };
    }
  };

  const { matches, error } = getMatches();

  return (
    <div className="flex-1 flex flex-col items-center p-6 md:p-12 w-full max-w-4xl mx-auto h-full min-h-0">
      <div className="w-full flex items-center gap-4 mb-8 shrink-0">
        <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
          <SearchCode className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Regex Tester</h1>
          <p className="text-slate-500 dark:text-slate-400">Test and debug regular expressions instantly</p>
        </div>
      </div>

      <div className="w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-8 flex flex-col gap-6 flex-1 min-h-0">
        
        {/* Regex Input */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Regular Expression</label>
          <div className="flex bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-500/50">
            <span className="pl-4 py-3 text-slate-400 font-mono text-lg">/</span>
            <input
              type="text"
              value={regex}
              onChange={(e) => setRegex(e.target.value)}
              className="flex-1 px-1 py-3 text-lg font-mono bg-transparent border-none text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-0"
              placeholder="expression..."
            />
            <span className="px-1 py-3 text-slate-400 font-mono text-lg">/</span>
            <input
              type="text"
              value={flags}
              onChange={(e) => setFlags(e.target.value)}
              className="w-16 px-1 py-3 pr-4 text-lg font-mono bg-transparent border-none text-blue-600 dark:text-blue-400 focus:outline-none focus:ring-0"
              placeholder="gmi"
            />
          </div>
          {error && (
            <div className="flex items-center gap-2 text-red-500 text-sm mt-1">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}
        </div>

        <div className="flex-1 flex flex-col gap-2 min-h-0">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex justify-between">
            <span>Test String</span>
            <span className={matches.length > 0 ? "text-blue-500" : ""}>{matches.length} matches</span>
          </label>
          <textarea
            value={testString}
            onChange={(e) => setTestString(e.target.value)}
            className="flex-1 w-full p-4 font-mono text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 resize-none transition-colors"
            placeholder="Type your test string here..."
          />
        </div>

        {matches.length > 0 && (
          <div className="bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 p-4 max-h-48 overflow-y-auto custom-scrollbar flex flex-col gap-2">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Match Results</div>
            {matches.map((match, i) => (
              <div key={i} className="flex flex-col gap-1 text-sm font-mono pb-2 border-b border-slate-200 dark:border-slate-800 last:border-0 last:pb-0">
                <div className="text-blue-600 dark:text-blue-400 font-semibold">
                  Match {i + 1}: <span className="text-slate-800 dark:text-slate-200 font-normal">"{match[0]}"</span>
                </div>
                {match.length > 1 && (
                  <div className="pl-4 flex flex-col gap-0.5 text-xs">
                    {match.slice(1).map((group, j) => (
                      group !== undefined ? (
                        <div key={j} className="text-slate-500">Group {j + 1}: <span className="text-slate-700 dark:text-slate-300">"{group}"</span></div>
                      ) : null
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
