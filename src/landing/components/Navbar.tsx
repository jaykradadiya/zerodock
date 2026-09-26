import { useState, useEffect } from 'react';
import { Link, useLocation } from '@tanstack/react-router';
import { usePreferenceStore } from '../../core/store/usePreferenceStore';
import { useUIStore } from '../../core/store/useUIStore';
import { toolRegistry } from '../../core/registry/tools';
import { Moon, Sun, Star, Search, ChevronRight, Lock, FileJson, Maximize } from 'lucide-react';
import { Button } from '../../shared/components/ui';
import { ShareLinkButton } from '../../shared/components/ShareLinkButton';

const GithubIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24" {...props}>
    <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
  </svg>
);

export function Navbar() {
  const { theme, toggleTheme } = usePreferenceStore();
  const { setCommandPaletteOpen, setZenMode } = useUIStore();
  const [scrolled, setScrolled] = useState(false);
  const [stars, setStars] = useState<string>('Star');

  const location = useLocation();
  const currentPath = location.pathname;

  const activeTool = toolRegistry.find(
    (t) => t.route === currentPath || (t.route !== '/' && currentPath.startsWith(t.route))
  );

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

        const res = await fetch('https://api.github.com/repos/jaykradadiya/zerodock');
        if (res.ok) {
          const data = await res.json();
          const starCount =
            data.stargazers_count > 999
              ? (data.stargazers_count / 1000).toFixed(1) + 'k'
              : data.stargazers_count.toString();
          setStars(starCount);
          localStorage.setItem('zerodock-github-stars', starCount);
          localStorage.setItem('zerodock-github-stars-time', Date.now().toString());
        }
      } catch {
        // fail silently in restricted envs
      }
    };
    fetchStars();
  }, []);

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 h-14 2xl:h-16 flex items-center justify-between px-3 sm:px-6 md:px-8 transition-all duration-300 ${
          scrolled || activeTool
            ? 'bg-[var(--zd-surface)]/90 backdrop-blur-md border-b border-[var(--zd-border)] shadow-xs'
            : 'bg-transparent border-b border-transparent'
        }`}
      >
        {/* Left: Brand + Merged Active Tool Navigation */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Link to="/" className="flex items-center gap-2 no-underline group shrink-0">
            <div className="zd-icon-ring w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center shadow-[0_0_12px_var(--zd-glow)] transition-transform group-hover:scale-105">
              <img
                src="/favicon.svg"
                alt="ZeroDock Logo"
                width="18"
                height="18"
                className="object-contain"
              />
            </div>
            <span className="text-base sm:text-lg font-extrabold tracking-tight text-[var(--zd-text-primary)] hidden sm:flex items-center">
              Zero
              <span className="bg-gradient-to-r from-[var(--zd-primary)] to-[var(--zd-accent)] bg-clip-text text-transparent">
                Dock
              </span>
            </span>
          </Link>

          {activeTool && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-[var(--zd-text-muted)] shrink-0" />
              <div className="flex items-center gap-2 min-w-0">
                {activeTool.icon && (
                  <div className="w-6.5 h-6.5 rounded-lg bg-[var(--zd-primary-soft)] text-[var(--zd-primary)] flex items-center justify-center shrink-0">
                    <activeTool.icon className="w-3.5 h-3.5" />
                  </div>
                )}
                <span className="text-xs sm:text-sm font-bold text-[var(--zd-text-primary)] truncate tracking-tight">
                  {activeTool.name}
                </span>
                <span className="hidden md:flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--zd-accent-soft)] border border-[var(--zd-accent)]/20 text-[var(--zd-accent)] text-[10px] font-semibold">
                  <Lock className="w-3 h-3" />
                  <span>100% Local</span>
                </span>
              </div>
            </>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Tool Actions: Share & Focus */}
          {activeTool && (
            <div className="flex items-center gap-1 sm:gap-1.5">
              <ShareLinkButton className="!h-8 sm:!h-9 text-xs font-semibold" />
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setZenMode(true)}
                title="Focus mode (⌘.)"
                aria-label="Enter focus mode"
                className="!h-8 sm:!h-9 group text-xs font-semibold"
              >
                <Maximize className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Focus</span>
              </Button>
              <div className="h-4 w-px bg-[var(--zd-border)] mx-0.5 hidden sm:block" />
            </div>
          )}

          <Link
            to="/json-toolkit"
            className={`flex items-center gap-1.5 h-8 sm:h-9 px-2.5 sm:px-3 rounded-xl border text-xs font-semibold no-underline transition-all shadow-xs ${
              currentPath.startsWith('/json-toolkit')
                ? 'bg-[var(--zd-primary-soft)] border-[var(--zd-primary)] text-[var(--zd-primary)]'
                : 'bg-[var(--zd-surface-raised)] border-[var(--zd-border)] hover:border-[var(--zd-primary)]/50 hover:bg-[var(--zd-primary-soft)]/50 text-[var(--zd-text-primary)] hover:text-[var(--zd-primary)]'
            }`}
            title="Go to JSON Toolkit"
          >
            <FileJson className="w-3.5 h-3.5 text-[var(--zd-primary)] shrink-0" />
            <span className="hidden sm:inline">JSON Toolkit</span>
          </Link>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setCommandPaletteOpen(true)}
            aria-label="Search tools and commands"
            data-command-trigger
            className="!h-8 sm:!h-9 group text-xs"
          >
            <Search className="w-3.5 h-3.5 text-[var(--zd-primary)] transition-transform group-hover:scale-110" />
            <span className="hidden sm:inline">Search tools...</span>
            <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--zd-surface)] border border-[var(--zd-border)] text-[var(--zd-text-muted)] group-hover:border-[var(--zd-primary)]/30">
              ⌘K
            </kbd>
          </Button>

          <a
            href="https://github.com/jaykradadiya/zerodock"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center no-underline h-8 sm:h-9 rounded-xl border border-[var(--zd-border)] hover:border-[var(--zd-border-hover)] bg-[var(--zd-surface-raised)] text-[var(--zd-text-primary)] text-xs font-semibold overflow-hidden transition-all shadow-xs group"
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

          <Button
            variant="icon"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="!w-8 !h-8 sm:!w-9 sm:!h-9 !rounded-xl border border-[var(--zd-border)] bg-[var(--zd-surface-raised)] hover:bg-[var(--zd-primary-soft)] hover:border-[var(--zd-primary)]/50 shadow-xs"
          >
            {theme === 'dark' ? (
              <Sun size={15} className="text-[#FDCB6E]" />
            ) : (
              <Moon size={15} className="text-[var(--zd-primary)]" />
            )}
          </Button>
        </div>
      </header>
    </>
  );
}
