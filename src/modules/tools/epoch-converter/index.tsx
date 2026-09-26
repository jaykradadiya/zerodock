import { useState, useEffect, useRef } from 'react';
import { Clock, Copy, Play, Pause, RefreshCw, Calendar, ArrowRightLeft, Globe } from 'lucide-react';
import { ToolPage, ToolHeader, ToolWorkspace } from '../../../shared/components/ToolLayout';
import { cn } from '../../../shared/components/ui';
import { CopyButton } from '../../../shared/components/CopyButton';
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

function OutputRow({
  label,
  value,
  subLabel,
  copyable = true,
  highlight = false,
  accent = false,
}: {
  label: string;
  value: string;
  subLabel?: string;
  copyable?: boolean;
  highlight?: boolean;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-2.5 px-3 py-1.5 sm:py-2 rounded-xl border transition-colors',
        highlight
          ? 'bg-[var(--zd-primary-soft)] border-[var(--zd-primary)]/20'
          : accent
          ? 'bg-[var(--zd-accent-soft)] border-[var(--zd-accent)]/25'
          : 'bg-[var(--zd-surface)] border-[var(--zd-border)]'
      )}
    >
      <div className="flex flex-col min-w-0 flex-1">
        <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--zd-text-muted)]">
          {label} {subLabel && <span className="normal-case opacity-75 font-normal">({subLabel})</span>}
        </span>
        <span
          className={cn(
            'text-xs sm:text-sm font-mono font-semibold truncate select-all',
            accent
              ? 'text-[var(--zd-accent)]'
              : highlight
              ? 'text-[var(--zd-primary)]'
              : 'text-[var(--zd-text-primary)]'
          )}
          title={value}
        >
          {value || '—'}
        </span>
      </div>
      {copyable && value && (
        <CopyButton value={value} className="shrink-0 text-xs" />
      )}
    </div>
  );
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

  // Quick Preset Helper for DateTime
  const applyPreset = (mode: 'now' | 'startOfDay' | '+1h' | '+24h' | '-24h') => {
    const d = new Date();
    if (mode === 'startOfDay') {
      d.setHours(0, 0, 0, 0);
    } else if (mode === '+1h') {
      d.setHours(d.getHours() + 1);
    } else if (mode === '+24h') {
      d.setDate(d.getDate() + 1);
    } else if (mode === '-24h') {
      d.setDate(d.getDate() - 1);
    }
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    setDateTimeInput(`${year}-${month}-${day} ${hours}:${minutes}:${seconds}`);
  };

  const isMs = cleanEpoch.length > 11;

  return (
    <ToolPage fullWidth compact className="h-[calc(100vh-3.5rem)] flex flex-col min-h-0 overflow-hidden max-w-7xl 2xl:max-w-[1440px] mx-auto p-1 sm:p-2">
      <ToolHeader
        icon={Clock}
        title="Epoch Timestamp Converter"
        description="Convert Unix timestamps to human dates and vice versa with multi-timezone support."
        toolId="epoch-converter"
        compact
      />

      <ToolWorkspace className="flex-1 min-h-0 flex flex-col overflow-hidden border border-[var(--zd-border)] rounded-xl bg-[var(--zd-surface)] shadow-[var(--zd-shadow-md)]">
        {/* Compact Live Bar & Timezone Selector */}
        <div className="w-full bg-[var(--zd-surface-raised)] border-b border-[var(--zd-border)] px-3 sm:px-4 py-2 flex flex-wrap items-center justify-between gap-2 shrink-0">
          {/* Live Unix Clock */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[var(--zd-primary-soft)] text-[var(--zd-primary)] text-[11px] font-bold">
              <Clock className="w-3 h-3 animate-pulse" />
              <span>LIVE</span>
            </div>

            <div className="flex items-center gap-2 font-mono text-xs sm:text-sm font-extrabold text-[var(--zd-text-primary)]">
              <span>{Math.floor(liveTime / 1000)}</span>
              <span className="text-[11px] font-normal text-[var(--zd-text-muted)]">sec</span>
              <span className="text-[var(--zd-border)]">|</span>
              <span className="text-[var(--zd-accent)]">{liveTime}</span>
              <span className="text-[11px] font-normal text-[var(--zd-text-muted)]">ms</span>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsPaused(!isPaused)}
                className={cn(
                  'px-2 py-0.5 rounded text-xs font-semibold flex items-center gap-1 transition-all',
                  isPaused
                    ? 'bg-[var(--zd-accent-soft)] text-[var(--zd-accent)] border border-[var(--zd-accent)]/30'
                    : 'text-[var(--zd-text-muted)] hover:text-[var(--zd-text-primary)] hover:bg-[var(--zd-surface)]'
                )}
                title={isPaused ? 'Resume live clock' : 'Freeze live clock'}
              >
                {isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                <span>{isPaused ? 'Resume' : 'Freeze'}</span>
              </button>

              <button
                type="button"
                onClick={() => triggerCopy(Math.floor(liveTime / 1000).toString(), 'seconds')}
                className="px-2 py-0.5 rounded text-xs font-semibold text-[var(--zd-text-secondary)] hover:text-[var(--zd-primary)] hover:bg-[var(--zd-surface)] transition-all flex items-center gap-1"
                title="Copy current seconds"
              >
                <Copy className="w-3 h-3" />
                <span>{copiedText === 'seconds' ? 'Copied!' : 'Sec'}</span>
              </button>

              <button
                type="button"
                onClick={() => triggerCopy(liveTime.toString(), 'ms')}
                className="px-2 py-0.5 rounded text-xs font-semibold text-[var(--zd-text-secondary)] hover:text-[var(--zd-primary)] hover:bg-[var(--zd-surface)] transition-all flex items-center gap-1"
                title="Copy current milliseconds"
              >
                <Copy className="w-3 h-3" />
                <span>{copiedText === 'ms' ? 'Copied!' : 'Ms'}</span>
              </button>
            </div>
          </div>

          {/* Timezone Selector in Toolbar */}
          <div className="flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-[var(--zd-text-muted)] shrink-0" />
            <span className="text-xs text-[var(--zd-text-muted)] hidden md:inline font-medium">Timezone:</span>
            <select
              value={targetTimezone}
              onChange={(e) => setTargetTimezone(e.target.value)}
              className="px-2.5 py-1 text-xs bg-[var(--zd-surface)] border border-[var(--zd-border)] rounded-lg text-[var(--zd-text-primary)] outline-none focus:border-[var(--zd-primary)] transition-all font-semibold cursor-pointer"
            >
              {SUPPORTED_TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 2-Column Responsive Workspace Grid */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-2.5 sm:gap-3 p-2.5 sm:p-3 overflow-y-auto custom-scrollbar">
          {/* Panel 1: Epoch to Human */}
          <div className="bg-[var(--zd-surface-raised)] border border-[var(--zd-border)] rounded-xl p-3 sm:p-3.5 flex flex-col gap-2.5 min-h-0">
            <div className="flex items-center justify-between gap-2 shrink-0">
              <h3 className="text-sm font-bold text-[var(--zd-text-primary)] flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-[var(--zd-primary)]" />
                Epoch to Date / Time
              </h3>
              {cleanEpoch && !epochError && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--zd-primary-soft)] text-[var(--zd-primary)] font-semibold">
                  {isMs ? 'Milliseconds (ms)' : 'Seconds (s)'}
                </span>
              )}
            </div>

            {/* Input area */}
            <div className="flex gap-1.5 shrink-0">
              <input
                type="text"
                value={inputEpoch}
                onChange={(e) => setInputEpoch(e.target.value)}
                className="flex-1 px-3 py-1.5 text-xs sm:text-sm bg-[var(--zd-surface)] border border-[var(--zd-border)] rounded-lg text-[var(--zd-text-primary)] outline-none focus:border-[var(--zd-primary)] focus:ring-1 focus:ring-[var(--zd-primary)] transition-all font-mono"
                placeholder="Enter timestamp e.g. 1774567890"
              />
              <button
                type="button"
                onClick={() => setInputEpoch(Math.floor(Date.now() / 1000).toString())}
                className="px-2.5 py-1.5 bg-[var(--zd-surface)] border border-[var(--zd-border)] hover:border-[var(--zd-primary)] hover:text-[var(--zd-primary)] rounded-lg transition-all text-xs font-semibold flex items-center gap-1 shrink-0"
                title="Use current timestamp"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Now</span>
              </button>
            </div>

            {epochError ? (
              <div className="text-xs text-red-500 font-medium p-2.5 bg-red-500/10 rounded-lg border border-red-500/20">
                {epochError}
              </div>
            ) : (
              <div className="flex flex-col gap-1.5 flex-1 min-h-0 overflow-y-auto pr-0.5">
                <OutputRow label="UTC / GMT Time" value={utcString} />
                <OutputRow label="Local Timezone" value={localString} highlight />
                {targetTimezone && (
                  <OutputRow
                    label="Target Timezone"
                    subLabel={SUPPORTED_TIMEZONES.find((tz) => tz.value === targetTimezone)?.label || targetTimezone}
                    value={targetString}
                    accent
                  />
                )}
                <OutputRow label="ISO 8601 String" value={isoString} />
                <OutputRow label="Relative Time" value={relativeAge} copyable={false} />
              </div>
            )}
          </div>

          {/* Panel 2: Human to Epoch */}
          <div className="bg-[var(--zd-surface-raised)] border border-[var(--zd-border)] rounded-xl p-3 sm:p-3.5 flex flex-col gap-2.5 min-h-0">
            <div className="flex items-center justify-between gap-2 shrink-0">
              <h3 className="text-sm font-bold text-[var(--zd-text-primary)] flex items-center gap-1.5">
                <ArrowRightLeft className="w-4 h-4 text-[var(--zd-primary)]" />
                Date / Time to Epoch
              </h3>

              {/* Timezone Toggle */}
              <div className="flex items-center gap-1 bg-[var(--zd-surface)] border border-[var(--zd-border)] p-0.5 rounded-lg shrink-0">
                {(['local', 'utc', 'target'] as const).map((tzMode) => (
                  <button
                    key={tzMode}
                    type="button"
                    onClick={() => setTimezoneToggle(tzMode)}
                    className={cn(
                      'px-2 py-0.5 rounded text-[11px] font-semibold transition-all',
                      timezoneToggle === tzMode
                        ? 'bg-[var(--zd-surface-raised)] text-[var(--zd-primary)] shadow-xs'
                        : 'text-[var(--zd-text-muted)] hover:text-[var(--zd-text-secondary)]'
                    )}
                  >
                    {tzMode === 'local' ? 'Local' : tzMode === 'utc' ? 'UTC' : 'Target'}
                  </button>
                ))}
              </div>
            </div>

            {/* Input area */}
            <div className="flex gap-1.5 shrink-0">
              <input
                type="text"
                value={dateTimeInput}
                onChange={(e) => setDateTimeInput(e.target.value)}
                className="flex-1 px-3 py-1.5 text-xs sm:text-sm bg-[var(--zd-surface)] border border-[var(--zd-border)] rounded-lg text-[var(--zd-text-primary)] outline-none focus:border-[var(--zd-primary)] focus:ring-1 focus:ring-[var(--zd-primary)] transition-all font-mono"
                placeholder="YYYY-MM-DD HH:mm:ss or ISO string"
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
                type="button"
                onClick={() => pickerRef.current?.showPicker ? pickerRef.current.showPicker() : pickerRef.current?.click()}
                className="px-2.5 py-1.5 bg-[var(--zd-surface)] border border-[var(--zd-border)] hover:border-[var(--zd-primary)] hover:text-[var(--zd-primary)] rounded-lg transition-all text-xs font-semibold flex items-center gap-1 shrink-0"
                title="Open calendar picker"
              >
                <Calendar className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Quick Presets */}
            <div className="flex items-center gap-1.5 flex-wrap shrink-0">
              <span className="text-[10px] uppercase font-bold text-[var(--zd-text-muted)] tracking-wider">Presets:</span>
              <button
                type="button"
                onClick={() => applyPreset('now')}
                className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[var(--zd-surface)] hover:bg-[var(--zd-primary-soft)] hover:text-[var(--zd-primary)] text-[var(--zd-text-secondary)] border border-[var(--zd-border)] transition-colors"
              >
                Now
              </button>
              <button
                type="button"
                onClick={() => applyPreset('startOfDay')}
                className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[var(--zd-surface)] hover:bg-[var(--zd-primary-soft)] hover:text-[var(--zd-primary)] text-[var(--zd-text-secondary)] border border-[var(--zd-border)] transition-colors"
              >
                Today 00:00
              </button>
              <button
                type="button"
                onClick={() => applyPreset('+1h')}
                className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[var(--zd-surface)] hover:bg-[var(--zd-primary-soft)] hover:text-[var(--zd-primary)] text-[var(--zd-text-secondary)] border border-[var(--zd-border)] transition-colors"
              >
                +1h
              </button>
              <button
                type="button"
                onClick={() => applyPreset('+24h')}
                className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[var(--zd-surface)] hover:bg-[var(--zd-primary-soft)] hover:text-[var(--zd-primary)] text-[var(--zd-text-secondary)] border border-[var(--zd-border)] transition-colors"
              >
                +1d
              </button>
            </div>

            {/* Output area */}
            {parseError ? (
              <div className="text-xs text-red-500 font-medium p-2.5 bg-red-500/10 rounded-lg border border-red-500/20">
                {parseError}
              </div>
            ) : dateTimeInput.trim() ? (
              <div className="flex flex-col gap-2 flex-1 min-h-0 justify-center">
                {/* Epoch Seconds Card */}
                <div className="p-2.5 sm:p-3 rounded-xl bg-[var(--zd-surface)] border border-[var(--zd-border)] flex items-center justify-between gap-3">
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--zd-text-muted)]">
                      Epoch Seconds (Unix)
                    </span>
                    <span className="text-base sm:text-lg font-mono font-extrabold text-[var(--zd-primary)] truncate select-all">
                      {outputEpochSec}
                    </span>
                  </div>
                  <CopyButton value={outputEpochSec.toString()} />
                </div>

                {/* Epoch Milliseconds Card */}
                <div className="p-2.5 sm:p-3 rounded-xl bg-[var(--zd-surface)] border border-[var(--zd-border)] flex items-center justify-between gap-3">
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--zd-text-muted)]">
                      Epoch Milliseconds
                    </span>
                    <span className="text-base sm:text-lg font-mono font-extrabold text-[var(--zd-accent)] truncate select-all">
                      {outputEpochMs}
                    </span>
                  </div>
                  <CopyButton value={outputEpochMs.toString()} />
                </div>

                {isCustomParsed && (
                  <span className="text-[10px] text-[var(--zd-text-muted)] italic text-right">
                    Parsed with custom date-time patterns
                  </span>
                )}
              </div>
            ) : (
              <div className="text-center text-xs text-[var(--zd-text-muted)] py-6 bg-[var(--zd-surface)] rounded-lg border border-dashed border-[var(--zd-border)]">
                Enter or paste a valid date/time above.
              </div>
            )}
          </div>
        </div>
      </ToolWorkspace>
    </ToolPage>
  );
}

