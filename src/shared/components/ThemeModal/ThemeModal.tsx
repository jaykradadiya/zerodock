import { useState, useMemo, useRef, useEffect, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Palette,
  X,
  Search,
  Sliders,
  FileCode,
  RotateCcw,
  Plus,
  Save,
  Check,
  Contrast,
} from 'lucide-react';
import { usePreferenceStore } from '../../../core/store/usePreferenceStore';
import { useUIStore, type ThemeModalTab } from '../../../core/store/useUIStore';
import { getAllThemes } from '../../../core/theme/themeEngine';
import { TOKEN_CATEGORIES } from '../../../core/theme/presets';
import type { ThemeDefinition } from '../../../core/theme/types';
import { ThemeCard } from './ThemeCard';
import { ColorTokenEditor } from './ColorTokenEditor';
import { ThemePreviewCard } from './ThemePreviewCard';
import { VsCodeSyncPanel } from './VsCodeSyncPanel';
import { Button } from '../ui/Button';

export function ThemeModal() {
  const { themeModalOpen, setThemeModalOpen, themeModalTab } = useUIStore();
  const {
    activeThemeId,
    customThemes,
    themeOverrides,
    highContrast,
    toggleHighContrast,
    setThemeId,
    setThemeOverride,
    resetThemeOverrides,
    saveCustomTheme,
    deleteCustomTheme,
    getActiveTheme,
    getEffectiveTokens,
  } = usePreferenceStore();

  const [activeTab, setActiveTab] = useState<ThemeModalTab>(themeModalTab);
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'dark' | 'light' | 'contrast' | 'custom'>('all');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [newThemeName, setNewThemeName] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (themeModalOpen) {
      setActiveTab(themeModalTab);
      setShowSaveDialog(false);
    }
  }, [themeModalOpen, themeModalTab]);

  // Close on Escape key
  useEffect(() => {
    if (!themeModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setThemeModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [themeModalOpen, setThemeModalOpen]);

  const activeTheme = getActiveTheme();
  const effectiveTokens = getEffectiveTokens();
  const allThemes = useMemo(() => getAllThemes(customThemes), [customThemes]);

  const filteredThemes = useMemo(() => {
    return allThemes.filter((t) => {
      const matchesSearch =
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.description.toLowerCase().includes(search.toLowerCase());
      if (!matchesSearch) return false;

      if (filterMode === 'dark') return t.mode === 'dark';
      if (filterMode === 'light') return t.mode === 'light';
      if (filterMode === 'contrast') return Boolean(t.isHighContrast || t.id.includes('high-contrast'));
      if (filterMode === 'custom') return !t.isBuiltin;
      return true;
    });
  }, [allThemes, search, filterMode]);

  const handleDuplicate = (themeToClone: ThemeDefinition) => {
    const clone: ThemeDefinition = {
      ...themeToClone,
      id: `custom-${Date.now()}`,
      name: `${themeToClone.name} Copy`,
      isBuiltin: false,
      tokens: { ...themeToClone.tokens },
    };
    saveCustomTheme(clone);
    setActiveTab('customize');
  };

  const handleSaveAsCustom = (e: FormEvent) => {
    e.preventDefault();
    if (!newThemeName.trim()) return;

    const newTheme: ThemeDefinition = {
      id: `custom-${Date.now()}`,
      name: newThemeName.trim(),
      mode: activeTheme.mode,
      description: `Custom theme based on ${activeTheme.name}`,
      author: 'You',
      isBuiltin: false,
      tokens: { ...effectiveTokens },
    };

    saveCustomTheme(newTheme);
    setShowSaveDialog(false);
    setNewThemeName('');
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const overrideCount = Object.keys(themeOverrides).length;

  if (!themeModalOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-hidden">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setThemeModalOpen(false)}
          className="fixed inset-0 bg-black/65 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          ref={modalRef}
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl border border-[var(--zd-border)] bg-[var(--zd-bg)] shadow-[0_20px_60px_rgba(0,0,0,0.5)] z-10 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--zd-border)] bg-[var(--zd-surface)] shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[var(--zd-primary-soft)] text-[var(--zd-primary)] flex items-center justify-center shadow-xs">
                <Palette className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm sm:text-base font-bold text-[var(--zd-text-primary)]">
                    Theme & Workbench Customizer
                  </h2>
                  <kbd className="hidden sm:inline-block text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--zd-bg)] border border-[var(--zd-border)] text-[var(--zd-text-muted)]">
                    ⌘K ⌘T
                  </kbd>
                </div>
                <p className="text-xs text-[var(--zd-text-muted)]">
                  Personalize ZeroDock themes and Monaco editor tokens end-to-end
                </p>
              </div>
            </div>

            <Button
              variant="icon"
              size="sm"
              onClick={() => setThemeModalOpen(false)}
              aria-label="Close modal"
              className="!w-8 !h-8 !rounded-xl text-[var(--zd-text-secondary)] hover:text-[var(--zd-text-primary)]"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center justify-between px-5 pt-3 border-b border-[var(--zd-border)] bg-[var(--zd-surface)]/50 shrink-0">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setActiveTab('browse')}
                className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'browse'
                    ? 'border-[var(--zd-primary)] text-[var(--zd-primary)] bg-[var(--zd-bg)]'
                    : 'border-transparent text-[var(--zd-text-secondary)] hover:text-[var(--zd-text-primary)]'
                }`}
              >
                <Palette className="w-3.5 h-3.5" />
                <span>Theme Gallery</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('customize')}
                className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'customize'
                    ? 'border-[var(--zd-primary)] text-[var(--zd-primary)] bg-[var(--zd-bg)]'
                    : 'border-transparent text-[var(--zd-text-secondary)] hover:text-[var(--zd-text-primary)]'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Customize Colors</span>
                {overrideCount > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[var(--zd-primary)] text-[var(--zd-bg)] font-bold">
                    {overrideCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('vscode')}
                className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'vscode'
                    ? 'border-[var(--zd-primary)] text-[var(--zd-primary)] bg-[var(--zd-bg)]'
                    : 'border-transparent text-[var(--zd-text-secondary)] hover:text-[var(--zd-text-primary)]'
                }`}
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>VS Code & Export</span>
              </button>
            </div>

            {saveSuccess && (
              <span className="text-xs text-[var(--zd-success)] font-medium flex items-center gap-1 pb-2">
                <Check className="w-3.5 h-3.5" /> Custom theme saved!
              </span>
            )}
          </div>

          {/* Tab Content Body */}
          <div className="flex-1 overflow-y-auto p-5 custom-scrollbar min-h-0">
            {/* TAB 1: BROWSE THEMES */}
            {activeTab === 'browse' && (
              <div className="flex flex-col gap-4">
                {/* Search & Filter Bar */}
                <div className="flex flex-col sm:flex-row gap-2.5 sm:items-center justify-between">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-[var(--zd-text-muted)]" />
                    <input
                      type="text"
                      placeholder="Filter themes (e.g. Dracula, Nord, Dark)..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-[var(--zd-border)] bg-[var(--zd-surface)] text-[var(--zd-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--zd-primary)] focus:border-[var(--zd-primary)]"
                    />
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1 bg-[var(--zd-surface)] p-1 rounded-xl border border-[var(--zd-border)]">
                      {(['all', 'dark', 'light', 'contrast', 'custom'] as const).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setFilterMode(mode)}
                          className={`px-2.5 py-1 text-xs font-semibold rounded-lg capitalize transition-colors cursor-pointer ${
                            filterMode === mode
                              ? 'bg-[var(--zd-primary)] text-[var(--zd-primary-foreground)] shadow-xs'
                              : 'text-[var(--zd-text-secondary)] hover:text-[var(--zd-text-primary)]'
                          }`}
                        >
                          {mode === 'contrast' ? 'High Contrast' : mode}
                        </button>
                      ))}
                    </div>

                    {/* Increase Contrast Toggle (GitHub style) */}
                    <button
                      type="button"
                      onClick={toggleHighContrast}
                      title={highContrast ? 'Turn off Increase Contrast' : 'Increase contrast (like GitHub high contrast)'}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer select-none ${
                        highContrast
                          ? 'bg-[var(--zd-primary)] text-[var(--zd-primary-foreground)] border-[var(--zd-primary)] shadow-xs ring-1 ring-[var(--zd-primary)]'
                          : 'bg-[var(--zd-surface)] text-[var(--zd-text-secondary)] border border-[var(--zd-border)] hover:text-[var(--zd-text-primary)] hover:border-[var(--zd-border-hover)]'
                      }`}
                    >
                      <Contrast className="w-3.5 h-3.5" />
                      <span className="hidden xs:inline">Contrast:</span>
                      <span>{highContrast ? 'Increased' : 'Standard'}</span>
                    </button>
                  </div>
                </div>

                {/* Theme Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {filteredThemes.map((t) => (
                    <ThemeCard
                      key={t.id}
                      theme={t}
                      isActive={activeThemeId === t.id}
                      isCustom={!t.isBuiltin}
                      onSelect={(id) => setThemeId(id)}
                      onCustomize={(id) => {
                        setThemeId(id);
                        setActiveTab('customize');
                      }}
                      onDuplicate={handleDuplicate}
                      onDelete={(id) => deleteCustomTheme(id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* TAB 2: CUSTOMIZE COLORS */}
            {activeTab === 'customize' && (
              <div className="flex flex-col gap-6">
                {/* Live Preview Card */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-[var(--zd-text-primary)]">
                      Live Preview & Active Theme: {activeTheme.name}
                    </span>
                    <div className="flex items-center gap-2">
                      {overrideCount > 0 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={resetThemeOverrides}
                          className="!h-7 text-xs text-[var(--zd-error)] hover:bg-[var(--zd-error)]/10 gap-1.5"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Reset Overrides ({overrideCount})</span>
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setShowSaveDialog(!showSaveDialog)}
                        className="!h-7 text-xs font-semibold gap-1.5"
                      >
                        <Save className="w-3 h-3 text-[var(--zd-primary)]" />
                        <span>Save as Custom Theme</span>
                      </Button>
                    </div>
                  </div>

                  <ThemePreviewCard
                    tokens={effectiveTokens}
                    themeName={activeTheme.name}
                  />
                </div>

                {/* Save As Custom Theme Dialog */}
                {showSaveDialog && (
                  <form
                    onSubmit={handleSaveAsCustom}
                    className="p-4 rounded-xl border border-[var(--zd-primary)]/40 bg-[var(--zd-surface)] flex flex-col sm:flex-row gap-3 items-center justify-between shadow-md"
                  >
                    <div className="flex-1 w-full">
                      <div className="text-xs font-bold text-[var(--zd-text-primary)] mb-1">
                        Save Configuration as Custom Theme
                      </div>
                      <input
                        type="text"
                        placeholder="My Custom Dark Theme..."
                        value={newThemeName}
                        onChange={(e) => setNewThemeName(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-[var(--zd-border)] bg-[var(--zd-bg)] text-xs text-[var(--zd-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--zd-primary)]"
                        autoFocus
                      />
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 pt-2 sm:pt-4">
                      <Button
                        size="sm"
                        variant="ghost"
                        type="button"
                        onClick={() => setShowSaveDialog(false)}
                        className="!h-8 text-xs"
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        variant="primary"
                        type="submit"
                        disabled={!newThemeName.trim()}
                        className="!h-8 text-xs font-semibold gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Save Theme</span>
                      </Button>
                    </div>
                  </form>
                )}

                {/* Token Categories */}
                <div className="space-y-6">
                  {TOKEN_CATEGORIES.map((category) => (
                    <div key={category.id} className="flex flex-col gap-2.5">
                      <div className="border-b border-[var(--zd-border)] pb-1.5">
                        <h4 className="text-xs font-bold text-[var(--zd-text-primary)] uppercase tracking-wider">
                          {category.label}
                        </h4>
                        <p className="text-[11px] text-[var(--zd-text-muted)]">
                          {category.description}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        {category.tokens.map((token) => {
                          const currentValue =
                            effectiveTokens[token.key] || activeTheme.tokens[token.key] || '#000000';
                          const defaultValue = activeTheme.tokens[token.key] || '#000000';
                          const isOverridden = Boolean(themeOverrides[token.key]);

                          return (
                            <ColorTokenEditor
                              key={token.key}
                              tokenKey={token.key}
                              label={token.label}
                              description={token.description}
                              currentValue={currentValue}
                              defaultValue={defaultValue}
                              isOverridden={isOverridden}
                              onChange={(key, val) => setThemeOverride(key, val)}
                              onReset={(key) => {
                                const newOverrides = { ...themeOverrides };
                                delete newOverrides[key];
                                setThemeOverride(key, defaultValue);
                              }}
                            />
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 3: VS CODE SYNC & EXPORT */}
            {activeTab === 'vscode' && (
              <VsCodeSyncPanel
                activeTheme={activeTheme}
                effectiveTokens={effectiveTokens}
                onImportSuccess={(importedTheme) => {
                  saveCustomTheme(importedTheme);
                  setActiveTab('browse');
                }}
              />
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
