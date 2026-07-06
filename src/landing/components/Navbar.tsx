import { useState, useEffect } from 'react';
import { Link } from '@tanstack/react-router';
import { usePreferenceStore } from '../../core/store/usePreferenceStore';
import { useUIStore } from '../../core/store/useUIStore';
import { Moon, Sun, Star, Search, History } from 'lucide-react';
import { motion } from 'framer-motion';
import { useHistoryStore } from '../../core/store/useHistoryStore';
import { HistoryDrawer } from '../../shared/components/HistoryDrawer';

const GithubIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24" {...props}>
    <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
  </svg>
);

export function Navbar() {
  const { theme, toggleTheme } = usePreferenceStore();
  const { setCommandPaletteOpen, setHistoryDrawerOpen } = useUIStore();
  const { items: historyItems } = useHistoryStore();
  const [scrolled, setScrolled] = useState(false);
  const [stars, setStars] = useState<string>('Star');

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 16);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const fetchStars = async () => {
      try {
        const cached = localStorage.getItem('zerodock-github-stars');
        const cachedTime = localStorage.getItem('zerodock-github-stars-time');

        if (cached && cachedTime && Date.now() - parseInt(cachedTime) < 3600000) {
          setStars(cached);
          return;
        }

        const res = await fetch('https://api.github.com/repos/jayradadiya/ZeroDock');
        if (res.ok) {
          const data = await res.json();
          const starCount = data.stargazers_count > 999
            ? (data.stargazers_count / 1000).toFixed(1) + 'k'
            : data.stargazers_count.toString();
          setStars(starCount);
          localStorage.setItem('zerodock-github-stars', starCount);
          localStorage.setItem('zerodock-github-stars-time', Date.now().toString());
        }
      } catch (e) {
        // fail silently in restricted envs
      }
    };
    fetchStars();
  }, []);

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 h-16 2xl:h-18 flex items-center justify-between px-4 sm:px-8 md:px-12 2xl:px-16 3xl:px-24 transition-all duration-300 ${
          scrolled
            ? 'bg-[var(--zd-surface)]/80 backdrop-blur-md border-b border-[var(--zd-border)] shadow-sm'
            : 'bg-transparent border-b border-transparent'
        }`}
      >
      {/* Logo */}
      <Link to="/" className="flex items-center gap-2.5 no-underline group">
        <div className="w-8 h-8 rounded-lg bg-[var(--zd-primary-soft)] border border-[var(--zd-primary)]/30 flex items-center justify-center shadow-[0_0_15px_var(--zd-glow)] transition-transform group-hover:scale-105">
          <img
            src="/favicon.svg"
            alt="ZeroDock Logo"
            width="20"
            height="20"
            className="object-contain"
          />
        </div>
        <span className="text-lg font-extrabold tracking-tight text-[var(--zd-text-primary)] flex items-center">
          Zero
          <span className="bg-gradient-to-r from-[var(--zd-primary)] to-[var(--zd-accent)] bg-clip-text text-transparent">
            Dock
          </span>
        </span>
      </Link>

      {/* Right controls */}
      <div className="flex items-center gap-3">
        {/* History Trigger */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setHistoryDrawerOpen(true)}
          aria-label="View operation history"
          className="flex items-center gap-2 h-9 px-3 rounded-xl border border-[var(--zd-border)] bg-[var(--zd-surface-raised)] hover:bg-[var(--zd-primary-soft)] hover:border-[var(--zd-primary)]/50 text-xs font-medium text-[var(--zd-text-secondary)] hover:text-[var(--zd-text-primary)] transition-all cursor-pointer shadow-sm group"
        >
          <History className="w-3.5 h-3.5 text-[var(--zd-primary)] transition-transform group-hover:rotate-45" />
          <span className="hidden md:inline font-semibold">History</span>
          {historyItems.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-[var(--zd-primary-soft)] text-[var(--zd-primary)] text-[10px] font-mono font-bold">
              {historyItems.length}
            </span>
          )}
        </motion.button>

        {/* Search trigger */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setCommandPaletteOpen(true)}
          aria-label="Search tools and commands"
          className="flex items-center gap-2 h-9 px-3 rounded-xl border border-[var(--zd-border)] bg-[var(--zd-surface-raised)] hover:bg-[var(--zd-primary-soft)] hover:border-[var(--zd-primary)]/50 text-xs font-medium text-[var(--zd-text-secondary)] hover:text-[var(--zd-text-primary)] transition-all cursor-pointer shadow-sm group"
        >
          <Search className="w-3.5 h-3.5 text-[var(--zd-primary)] transition-transform group-hover:scale-110" />
          <span className="hidden sm:inline">Search tools...</span>
          <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--zd-surface)] border border-[var(--zd-border)] text-[var(--zd-text-muted)] group-hover:border-[var(--zd-primary)]/30">
            ⌘K
          </kbd>
        </motion.button>

        {/* GitHub Star Pill */}
        <a
          href="https://github.com/jayradadiya/ZeroDock"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden sm:flex items-center no-underline h-9 rounded-xl border border-[var(--zd-border)] hover:border-[var(--zd-border-hover)] bg-[var(--zd-surface-raised)] text-[var(--zd-text-primary)] text-xs font-semibold overflow-hidden transition-all shadow-sm group"
        >
          <div className="flex items-center gap-1.5 px-2.5 group-hover:text-[var(--zd-primary)] transition-colors">
            <GithubIcon />
            <span>GitHub</span>
          </div>
          <div className="flex items-center gap-1 px-2.5 border-l border-[var(--zd-border)] bg-[var(--zd-surface)] h-full text-[var(--zd-text-secondary)] font-mono">
            <Star size={12} className="fill-current text-[#E17055]" />
            <span>{stars}</span>
          </div>
        </a>

        {/* Theme Toggle */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="flex items-center justify-center w-9 h-9 rounded-xl border border-[var(--zd-border)] bg-[var(--zd-surface-raised)] hover:bg-[var(--zd-primary-soft)] hover:border-[var(--zd-primary)]/50 text-[var(--zd-text-secondary)] hover:text-[var(--zd-text-primary)] transition-all cursor-pointer shadow-sm"
        >
          {theme === 'dark' ? <Sun size={16} className="text-[#FDCB6E]" /> : <Moon size={16} className="text-[var(--zd-primary)]" />}
        </motion.button>
      </div>
    </header>
    <HistoryDrawer />
    </>
  );
}



