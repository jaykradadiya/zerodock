import { useState, useEffect, useRef } from 'react';
import { Clock, Copy, Play, Pause, RefreshCw, Calendar, ArrowRightLeft, Globe } from 'lucide-react';
import { ToolPage, ToolHeader, ToolWorkspace } from '../../../shared/components/ToolLayout';
import { StatCard, Card } from '../../../shared/components/ui';
import { createToolStore } from '../../../core/store/useToolState';
import { useSyncToolUrl } from '../../../shared/hooks/useSyncToolUrl';

function defaultDateTimeInput(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

const useEpochStore = createToolStore('epoch-converter', {
  inputEpoch: Math.floor(Date.now() / 1000).toString(),
  dateTimeInput: defaultDateTimeInput(),
  timezoneToggle: 'local' as 'local' | 'utc' | 'target',
  targetTimezone: 'America/New_York',
});

function getRelativeTime(timestampMs: number): string {
  const diff = timestampMs - Date.now();
  const absDiff = Math.abs(diff);
  const seconds = Math.floor(absDiff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  const prefix = diff > 0 ? "in " : "";
  const suffix = diff > 0 ? "" : " ago";

  if (seconds < 5) return "just now";
  if (seconds < 60) return `${prefix}${seconds} seconds${suffix}`;
  if (minutes < 60) return `${prefix}${minutes} minute${minutes > 1 ? 's' : ''}${suffix}`;
  if (hours < 24) return `${prefix}${hours} hour${hours > 1 ? 's' : ''}${suffix}`;
  return `${prefix}${days} day${days > 1 ? 's' : ''}${suffix}`;
}

const SUPPORTED_TIMEZONES = [
  { value: 'UTC', label: 'UTC / GMT' },
  { value: 'America/New_York', label: 'US Eastern (New York)' },
  { value: 'America/Chicago', label: 'US Central (Chicago)' },
  { value: 'America/Denver', label: 'US Mountain (Denver)' },
  { value: 'America/Los_Angeles', label: 'US Pacific (Los Angeles)' },
  { value: 'Europe/London', label: 'Europe (London)' },
  { value: 'Europe/Paris', label: 'Europe (Paris)' },
  { value: 'Asia/Kolkata', label: 'India (Kolkata)' },
  { value: 'Asia/Tokyo', label: 'Japan (Tokyo)' },
  { value: 'Asia/Singapore', label: 'Singapore' },
  { value: 'Asia/Dubai', label: 'Gulf (Dubai)' },
  { value: 'Australia/Sydney', label: 'Australia (Sydney)' },
];

function parseInTimezone(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  ms: number,
  timeZone: string
): Date {
  const tempUTC = Date.UTC(year, month, day, hour, minute, second, ms);
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hourCycle: 'h23'
  });
  
  const parts = formatter.formatToParts(new Date(tempUTC));
  const partMap: Record<string, number> = {};
  parts.forEach(p => {
    if (p.type !== 'literal') {
      partMap[p.type] = parseInt(p.value, 10);
    }
  });
  
  let h2 = partMap.hour;
  if (h2 === 24) h2 = 0;
  
  const y2 = partMap.year;
  const m2 = partMap.month - 1;
  const d2 = partMap.day;
  const min2 = partMap.minute;
  const s2 = partMap.second;
  
  const formattedUTC = Date.UTC(y2, m2, d2, h2, min2, s2, ms);
  const offset = formattedUTC - tempUTC;
  
  return new Date(tempUTC - offset);
}

function parseDateString(
  input: string,
  interpretAs: 'local' | 'utc' | 'target',
  targetTz: string
): { date: Date; isCustomParsed: boolean } | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Handles YYYY-MM-DD HH:mm:ss.SSS or YYYY/MM/DD HH:mm:ss etc.
  const sqlRegex = /^\s*(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[T ](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?(?:\.(\d+))?)?\s*(Z|[+-]\d{2}:?\d{2})?\s*$/i;
  const match = trimmed.match(sqlRegex);

  if (match) {
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const day = parseInt(match[3], 10);
    const hour = match[4] ? parseInt(match[4], 10) : 0;
    const minute = match[5] ? parseInt(match[5], 10) : 0;
    const second = match[6] ? parseInt(match[6], 10) : 0;
    
    let ms = 0;
    if (match[7]) {
      const msStr = match[7].padEnd(3, '0').slice(0, 3);
      ms = parseInt(msStr, 10);
    }
    
    const tz = match[8];
    if (tz) {
      const parsedDate = new Date(trimmed);
      if (!isNaN(parsedDate.getTime())) {
        return { date: parsedDate, isCustomParsed: false };
      }
    }

    if (interpretAs === 'utc') {
      return { 
        date: new Date(Date.UTC(year, month, day, hour, minute, second, ms)),
        isCustomParsed: true 
      };
    } else if (interpretAs === 'target') {
      try {
        return {
          date: parseInTimezone(year, month, day, hour, minute, second, ms, targetTz),
          isCustomParsed: true
        };
      } catch (err) {
        return {
          date: new Date(year, month, day, hour, minute, second, ms),
          isCustomParsed: true
        };
      }
    } else {
      return {
        date: new Date(year, month, day, hour, minute, second, ms),
        isCustomParsed: true
      };
    }
  }

  const parsedDate = new Date(trimmed);
  if (!isNaN(parsedDate.getTime())) {
    return { date: parsedDate, isCustomParsed: false };
  }

  return null;
}


export default function EpochConverter() {
  const { inputEpoch, dateTimeInput, timezoneToggle, targetTimezone, setValues } = useEpochStore();
  const setInputEpoch = (val: string) => setValues({ inputEpoch: val });
  const setDateTimeInput = (val: string) => setValues({ dateTimeInput: val });
  const setTimezoneToggle = (val: 'local' | 'utc' | 'target') => setValues({ timezoneToggle: val });
  const setTargetTimezone = (val: string) => setValues({ targetTimezone: val });

  useSyncToolUrl(
    () => useEpochStore.getState(),
    setValues,
    [inputEpoch, dateTimeInput, timezoneToggle, targetTimezone]
  );

  // Live Clock States
  const [liveTime, setLiveTime] = useState<number>(Date.now());
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef<any>(null);
  const pickerRef = useRef<HTMLInputElement>(null);

  const [epochError, setEpochError] = useState<string | null>(null);

  // Copy State Indicator
  const [copiedText, setCopiedText] = useState<'seconds' | 'ms' | null>(null);

  // Live ticking effect
  useEffect(() => {
    if (!isPaused) {
      intervalRef.current = setInterval(() => {
        setLiveTime(Date.now());
      }, 50);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPaused]);

  // Copy helper
  const triggerCopy = (text: string, key: 'seconds' | 'ms') => {
    navigator.clipboard.writeText(text);
    setCopiedText(key);
    setTimeout(() => setCopiedText(null), 1500);
  };

  // Convert Epoch to formats
  let parsedMs = 0;
  let utcString = '';
  let localString = '';
  let targetString = '';
  let isoString = '';
  let relativeAge = '';

  const cleanEpoch = inputEpoch.trim();
  if (cleanEpoch) {
    const epochNum = Number(cleanEpoch);
    if (isNaN(epochNum)) {
      if (!epochError) setEpochError('Invalid timestamp value. Please enter a valid number.');
    } else {
      if (epochError) setEpochError(null);
      // Auto-detect seconds vs milliseconds
      const isMs = cleanEpoch.length > 11;
      parsedMs = isMs ? epochNum : epochNum * 1000;

      try {
        const dateObj = new Date(parsedMs);
        if (isNaN(dateObj.getTime())) {
          throw new Error();
        }
        utcString = dateObj.toUTCString();
        localString = dateObj.toLocaleString();

        if (targetTimezone) {
          try {
            targetString = dateObj.toLocaleString(undefined, {
              timeZone: targetTimezone,
              dateStyle: 'full',
              timeStyle: 'long'
            });
          } catch (err) {
            targetString = 'Invalid Timezone';
          }
        }

        isoString = dateObj.toISOString();
        relativeAge = getRelativeTime(parsedMs);
      } catch (err) {
        if (!epochError) setEpochError('Out of bounds timestamp date conversion.');
      }
    }
  }

  // Convert Date to Epoch
  let outputEpochSec = 0;
  let outputEpochMs = 0;
  let isCustomParsed = false;
  let parseError: string | null = null;

  if (dateTimeInput.trim()) {
    const parseResult = parseDateString(dateTimeInput, timezoneToggle, targetTimezone);
    if (parseResult) {
      outputEpochMs = parseResult.date.getTime();
      outputEpochSec = Math.floor(outputEpochMs / 1000);
      isCustomParsed = parseResult.isCustomParsed;
    } else {
      parseError = "Could not parse date string. Try YYYY-MM-DD HH:mm:ss or ISO/RFC format.";
    }
  }


  return (
    <ToolPage className="max-w-4xl 2xl:max-w-5xl">
      <ToolHeader
        icon={Clock}
        title="Epoch Timestamp Converter"
        description="Parse Unix timestamps to human times and construct epochs in local or UTC."
      />

      <ToolWorkspace className="overflow-y-auto custom-scrollbar">
        {/* Global Config / Timezone Selector */}
        <div className="w-full bg-[var(--zd-surface-raised)] border-b border-[var(--zd-border)] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[var(--zd-accent-soft)] flex items-center justify-center text-[var(--zd-accent)] shrink-0">
            <Globe className="w-4.5 h-4.5" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--zd-text-muted)]">Target Timezone</span>
            <div className="text-sm font-semibold text-[var(--zd-text-secondary)]">
              Convert and view timestamps in your selected region.
            </div>
          </div>
        </div>
        <div className="w-full sm:w-64">
          <select
            value={targetTimezone}
            onChange={(e) => setTargetTimezone(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-[var(--zd-surface-raised)] border border-[var(--zd-border)] rounded-xl text-[var(--zd-text-primary)] outline-none focus:border-[var(--zd-primary)] transition-all font-semibold cursor-pointer"
          >
            {SUPPORTED_TIMEZONES.map((tz) => (
              <option key={tz.value} value={tz.value}>
                {tz.label}
              </option>
            ))}
          </select>
        </div>
      </div>


      {/* Grid Panels */}
      <div className="w-full flex flex-col gap-6 p-4 sm:p-6">
        
        {/* Ticking Live Epoch Display Card */}
        <Card className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6" glow>
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--zd-primary)]">
              Current Unix Timestamp
            </span>
            <div className="text-3xl font-extrabold font-mono text-[var(--zd-text-primary)] tracking-tight flex flex-wrap items-baseline gap-2">
              <span>{Math.floor(liveTime / 1000)}</span>
              <span className="text-[var(--zd-text-muted)] text-lg">seconds</span>
              <span className="text-[var(--zd-text-muted)] mx-2">|</span>
              <span className="text-[var(--zd-accent)]">{liveTime}</span>
              <span className="text-[var(--zd-text-muted)] text-lg">milliseconds</span>
            </div>
            <p className="text-xs text-[var(--zd-text-muted)]">Ticking in real-time. Freeze or copy values using the buttons on the right.</p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsPaused(!isPaused)}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                isPaused
                  ? 'bg-[var(--zd-accent-soft)] text-[var(--zd-accent)] border border-[var(--zd-accent)]/30'
                  : 'bg-[var(--zd-primary-soft)] text-[var(--zd-primary)] border border-transparent'
              }`}
            >
              {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              <span>{isPaused ? "Resume" : "Freeze"}</span>
            </button>
            <button
              onClick={() => triggerCopy(Math.floor(liveTime / 1000).toString(), 'seconds')}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-[var(--zd-surface-raised)] border border-[var(--zd-border)] rounded-xl text-sm font-semibold text-[var(--zd-text-secondary)] hover:text-[var(--zd-primary)] hover:bg-[var(--zd-primary-soft)] transition-all"
            >
              <Copy className="w-4 h-4" />
              <span>{copiedText === 'seconds' ? "Copied Sec!" : "Copy Sec"}</span>
            </button>
            <button
              onClick={() => triggerCopy(liveTime.toString(), 'ms')}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-[var(--zd-surface-raised)] border border-[var(--zd-border)] rounded-xl text-sm font-semibold text-[var(--zd-text-secondary)] hover:text-[var(--zd-primary)] hover:bg-[var(--zd-primary-soft)] transition-all"
            >
              <Copy className="w-4 h-4" />
              <span>{copiedText === 'ms' ? "Copied Ms!" : "Copy Ms"}</span>
            </button>
          </div>
        </Card>

        {/* Bi-directional conversion panels */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
          
          {/* Panel 1: Epoch to Human */}
          <div className="bg-[var(--zd-surface)] border border-[var(--zd-border)] rounded-2xl p-6 shadow-[var(--zd-shadow-md)] flex flex-col gap-4">
            <h3 className="text-lg font-bold text-[var(--zd-text-primary)] flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[var(--zd-primary)]" />
              Epoch to Date Time
            </h3>
            
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-[var(--zd-text-secondary)]">
                Enter Timestamp (Seconds or Milliseconds)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputEpoch}
                  onChange={(e) => setInputEpoch(e.target.value)}
                  className="flex-1 px-4 py-2.5 text-sm bg-[var(--zd-surface-raised)] border border-[var(--zd-border)] rounded-xl text-[var(--zd-text-primary)] outline-none focus:border-[var(--zd-primary)] focus:ring-2 focus:ring-[var(--zd-primary-soft)] transition-all font-mono"
                  placeholder="e.g. 1781523600"
                />
                <button
                  onClick={() => setInputEpoch(Math.floor(Date.now() / 1000).toString())}
                  className="px-3 py-2.5 bg-[var(--zd-surface-raised)] border border-[var(--zd-border)] hover:border-[var(--zd-primary)] hover:text-[var(--zd-primary)] rounded-xl transition-all"
                  title="Load current epoch"
                >
                  <RefreshCw className="w-4.5 h-4.5" />
                </button>
              </div>
            </div>

            {epochError ? (
              <div className="text-xs text-red-500 font-medium">
                {epochError}
              </div>
            ) : (
              <div className="flex flex-col gap-3 mt-2">
                <StatCard label="UTC / GMT Time" value={utcString} copyable />
                <StatCard label="Local Timezone" value={localString} copyable />
                {targetTimezone && (
                  <StatCard
                    label={`Target Timezone (${SUPPORTED_TIMEZONES.find((tz) => tz.value === targetTimezone)?.label || targetTimezone})`}
                    value={targetString}
                    copyable
                    className="border-l-2 border-l-[var(--zd-accent)]"
                  />
                )}
                <StatCard label="ISO 8601 String" value={isoString} copyable />
                <StatCard label="Relative Time" value={relativeAge} className="[&_p]:text-[var(--zd-primary)]" />
              </div>
            )}
          </div>

          {/* Panel 2: Human to Epoch */}
          <div className="bg-[var(--zd-surface)] border border-[var(--zd-border)] rounded-2xl p-6 shadow-[var(--zd-shadow-md)] flex flex-col gap-4">
            <h3 className="text-lg font-bold text-[var(--zd-text-primary)] flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-[var(--zd-primary)]" />
              Date Time to Epoch
            </h3>
            
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-[var(--zd-text-secondary)]">
                Enter Date / Time String (Pastable)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={dateTimeInput}
                  onChange={(e) => setDateTimeInput(e.target.value)}
                  className="flex-1 px-4 py-2.5 text-sm bg-[var(--zd-surface-raised)] border border-[var(--zd-border)] rounded-xl text-[var(--zd-text-primary)] outline-none focus:border-[var(--zd-primary)] focus:ring-2 focus:ring-[var(--zd-primary-soft)] transition-all font-mono"
                  placeholder="e.g. 2026-06-15 12:40:00 or ISO/RFC string"
                />
                <input
                  type="datetime-local"
                  ref={pickerRef}
                  className="sr-only"
                  onChange={(e) => {
                    if (e.target.value) {
                      setDateTimeInput(e.target.value.replace('T', ' '));
                    }
                  }}
                />
                <button
                  onClick={() => pickerRef.current?.showPicker ? pickerRef.current.showPicker() : pickerRef.current?.click()}
                  className="px-3 py-2.5 bg-[var(--zd-surface-raised)] border border-[var(--zd-border)] hover:border-[var(--zd-primary)] hover:text-[var(--zd-primary)] rounded-xl transition-all"
                  title="Open date picker calendar"
                >
                  <Calendar className="w-4.5 h-4.5" />
                </button>
              </div>
            </div>

            {/* Timezone Toggle */}
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs font-semibold text-[var(--zd-text-muted)]">Interpret as:</span>
              <div className="flex gap-1 bg-[var(--zd-surface-raised)] border border-[var(--zd-border)] p-1 rounded-xl">
                <button
                  onClick={() => setTimezoneToggle('local')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    timezoneToggle === 'local' 
                      ? 'bg-[var(--zd-surface)] text-[var(--zd-primary)] shadow-sm' 
                      : 'text-[var(--zd-text-muted)] hover:text-[var(--zd-primary)] hover:bg-[var(--zd-primary-soft)]/40 bg-transparent'
                  }`}
                >
                  Local
                </button>
                <button
                  onClick={() => setTimezoneToggle('utc')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    timezoneToggle === 'utc' 
                      ? 'bg-[var(--zd-surface)] text-[var(--zd-primary)] shadow-sm' 
                      : 'text-[var(--zd-text-muted)] hover:text-[var(--zd-primary)] hover:bg-[var(--zd-primary-soft)]/40 bg-transparent'
                  }`}
                >
                  UTC
                </button>
                <button
                  onClick={() => setTimezoneToggle('target')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    timezoneToggle === 'target' 
                      ? 'bg-[var(--zd-surface)] text-[var(--zd-primary)] shadow-sm' 
                      : 'text-[var(--zd-text-muted)] hover:text-[var(--zd-primary)] hover:bg-[var(--zd-primary-soft)]/40 bg-transparent'
                  }`}
                  title={`Interpret in ${targetTimezone}`}
                >
                  Target Tz
                </button>
              </div>
            </div>

            {parseError ? (
              <div className="text-xs text-red-500 font-medium p-3 bg-red-500/10 rounded-xl border border-red-500/20 mt-2">
                {parseError}
              </div>
            ) : dateTimeInput.trim() ? (
              <div className="flex flex-col gap-3 mt-2.5">
                {/* Parser status badge */}
                {isCustomParsed && (
                  <div className="text-[10px] text-[var(--zd-accent)] font-bold px-2.5 py-1 bg-[var(--zd-accent-soft)] rounded-lg border border-[var(--zd-accent)]/20 w-fit self-end uppercase tracking-wider">
                    Custom Regex Parsed
                  </div>
                )}
                <StatCard label="Epoch Seconds (Unix)" value={outputEpochSec.toString()} copyable />
                <StatCard
                  label="Epoch Milliseconds"
                  value={outputEpochMs.toString()}
                  copyable
                  className="[&_p]:text-[var(--zd-accent)]"
                />
              </div>
            ) : (
              <div className="text-center text-xs text-[var(--zd-text-muted)] py-8 bg-[var(--zd-surface-raised)]/30 rounded-xl border border-dashed border-[var(--zd-border)] mt-2">
                Enter or paste a valid date/time above.
              </div>
            )}
          </div>

        </div>

      </div>
      </ToolWorkspace>
    </ToolPage>
  );
}

