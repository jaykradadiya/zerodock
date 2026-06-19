import { useState, useEffect, useRef } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Search, Terminal, Sun, Moon, Sparkles, CornerDownLeft } from 'lucide-react';
import { toolRegistry } from '../../core/registry/tools';
import { useGlobalStore } from '../../core/store/useGlobalStore';

const GithubIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24" {...props}>
    <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
  </svg>
);

export function CommandPalette() {
  const { theme, toggleTheme, commandPaletteOpen, setCommandPaletteOpen } = useGlobalStore();
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [activeCategory, setActiveCategory] = useState<'All' | 'Tools' | 'Preferences' | 'External'>('All');
  
  const navigate = useNavigate();
  const paletteRef = useRef<HTMLDivElement | null>(null);

  // Toggle Command Palette on Cmd+K or Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(!commandPaletteOpen);
        setSearch('');
        setSelectedIndex(0);
        setActiveCategory('All');
      } else if (e.key === 'Escape') {
        setCommandPaletteOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [commandPaletteOpen]);

  // Dismiss on click outside
  useEffect(() => {
    if (!commandPaletteOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (paletteRef.current && !paletteRef.current.contains(event.target as Node)) {
        setCommandPaletteOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [commandPaletteOpen]);

  // Command items definitions
  const toolItems = toolRegistry.map((tool) => ({
    id: tool.id,
    name: tool.name,
    description: tool.metadata.description,
    icon: tool.icon,
    category: 'Tools',
    action: () => {
      navigate({ to: tool.route as any });
      setCommandPaletteOpen(false);
    },
  }));

  const actionItems = [
    {
      id: 'toggle-theme',
      name: `Toggle Theme`,
      description: `Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`,
      icon: theme === 'dark' ? Sun : Moon,
      category: 'Preferences',
      action: () => {
        toggleTheme();
        setCommandPaletteOpen(false);
      },
    },
    {
      id: 'github',
      name: 'View GitHub Repository',
      description: 'Explore the source code on GitHub',
      icon: GithubIcon,
      category: 'External',
      action: () => {
        window.open('https://github.com/jayradadiya/ZeroDock', '_blank');
        setCommandPaletteOpen(false);
      },
    },
  ];

  const allItems = [...toolItems, ...actionItems];

  // Filter items based on search query and selected category tab
  const filteredItems = allItems.filter((item) => {
    const matchesSearch = 
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.description.toLowerCase().includes(search.toLowerCase());
      
    if (activeCategory === 'All') return matchesSearch;
    return matchesSearch && item.category === activeCategory;
  });

  // Keyboard navigation inside options list
  useEffect(() => {
    const handleListKeyDown = (e: KeyboardEvent) => {
      if (!commandPaletteOpen || filteredItems.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredItems.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % filteredItems.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        filteredItems[selectedIndex].action();
      }
    };
    window.addEventListener('keydown', handleListKeyDown);
    return () => window.removeEventListener('keydown', handleListKeyDown);
  }, [commandPaletteOpen, filteredItems, selectedIndex]);

  // Reset selected index when search query or category filter updates
  useEffect(() => {
    setSelectedIndex(0);
  }, [search, activeCategory]);

  if (!commandPaletteOpen) return null;

  return (
    <div className="fixed inset-0 z-100 flex items-start justify-center pt-[15vh] p-4 bg-slate-950/40 backdrop-blur-xs">
      <div 
        ref={paletteRef}
        className="w-full max-w-xl bg-[var(--zd-surface)] border border-[var(--zd-border)] rounded-2xl shadow-[var(--zd-shadow-lg)] overflow-hidden flex flex-col max-h-[70vh] focus:outline-none animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 border-b border-[var(--zd-border)]">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Type a command or search tools..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 py-4 text-sm bg-transparent outline-none border-0 text-slate-900 dark:text-slate-100 placeholder-slate-400"
            autoFocus
          />
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded border border-[var(--zd-border)] bg-[var(--zd-surface-raised)] text-[10px] font-semibold text-slate-400 shrink-0 select-none">
            ESC
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex items-center gap-1.5 px-4 py-2 border-b border-[var(--zd-border)] bg-[var(--zd-surface-raised)]/30 overflow-x-auto shrink-0 select-none">
          {(['All', 'Tools', 'Preferences', 'External'] as const).map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                activeCategory === cat 
                  ? 'bg-[var(--zd-primary)] text-white shadow-sm' 
                  : 'text-slate-500 hover:text-[var(--zd-primary)] hover:bg-[var(--zd-primary-soft)] bg-transparent'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
          {filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400">
              <Sparkles className="w-8 h-8 mb-3 text-slate-300 dark:text-slate-600 animate-pulse" />
              <span className="text-sm">No results matches your search</span>
            </div>
          ) : (
            filteredItems.map((item, index) => {
              const Icon = (item.icon || Terminal) as React.ComponentType<any>;
              const isSelected = index === selectedIndex;
              const showHeaders = activeCategory === 'All';
              const isFirstOfCategory = showHeaders && (index === 0 || filteredItems[index - 1].category !== item.category);

              return (
                <div key={item.id}>
                  {isFirstOfCategory && (
                    <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mt-3 first:mt-1 select-none border-b border-[var(--zd-border)]/20 pb-1 mb-1">
                      {item.category === 'Tools' ? 'Developer Tools' : item.category === 'Preferences' ? 'Preferences' : 'External Links'}
                    </div>
                  )}
                  <div
                    onClick={item.action}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer text-sm transition-all select-none ${
                      isSelected 
                        ? 'bg-[var(--zd-primary-soft)] text-[var(--zd-primary)]' 
                        : 'text-slate-600 dark:text-slate-400 hover:bg-[var(--zd-primary-soft)]/40'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`p-1.5 rounded-lg shrink-0 ${isSelected ? 'bg-[var(--zd-primary-soft)]' : 'bg-[var(--zd-surface-raised)]'}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold truncate text-slate-900 dark:text-slate-100">{item.name}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">{item.description}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-4">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 bg-[var(--zd-surface-raised)] border border-[var(--zd-border)] px-1.5 py-0.5 rounded">
                        {item.category}
                      </span>
                      {isSelected && (
                        <CornerDownLeft className="w-3.5 h-3.5 text-[var(--zd-primary)] animate-pulse" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info bar */}
        <div className="px-4 py-2.5 bg-[var(--zd-surface-raised)] border-t border-[var(--zd-border)] flex items-center justify-between text-[11px] text-slate-400 select-none shrink-0">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Enter select</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span>Close command menu:</span>
            <span className="border border-[var(--zd-border)] px-1 rounded bg-[var(--zd-surface)] text-[9px] font-bold">Esc</span>
          </div>
        </div>
      </div>
    </div>
  );
}
