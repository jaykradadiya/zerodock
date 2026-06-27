import { useState, useEffect } from 'react';
import { Link } from '@tanstack/react-router';
import { usePreferenceStore } from '../../core/store/usePreferenceStore';
import { useUIStore } from '../../core/store/useUIStore';
import { Moon, Sun, Star } from 'lucide-react';

const GithubIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24" {...props}>
    <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
  </svg>
);

export function Navbar() {
  const { theme, toggleTheme } = usePreferenceStore();
  const { setCommandPaletteOpen } = useUIStore();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 16);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const [stars, setStars] = useState<string>('Star');

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
    <header
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        height: '64px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 clamp(16px, 4vw, 48px)',
        backgroundColor: scrolled ? 'var(--zd-nav-bg)' : 'transparent',
        backdropFilter: scrolled ? 'blur(16px) saturate(180%)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(16px) saturate(180%)' : 'none',
        borderBottom: scrolled ? '1px solid var(--zd-border)' : '1px solid transparent',
        transition: 'background-color 0.3s ease, border-color 0.3s ease, backdrop-filter 0.3s ease',
      }}
    >
      {/* Logo */}
      <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
        <img
          src="/favicon.svg"
          alt="ZeroDock Logo"
          width="26"
          height="26"
          style={{
            objectFit: 'contain',
            borderRadius: '4px',
          }}
        />
        <span
          style={{
            fontSize: '18px',
            fontWeight: 800,
            letterSpacing: '-0.03em',
            color: 'var(--zd-text-primary)',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          Zero
          <span style={{
            background: 'linear-gradient(135deg, var(--zd-primary) 0%, var(--zd-accent) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            Dock
          </span>
        </span>
      </Link>

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <a
          href="https://github.com/jayradadiya/ZeroDock"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex',
            alignItems: 'center',
            textDecoration: 'none',
            height: '32px',
            borderRadius: '6px',
            border: '1px solid var(--zd-border)',
            background: 'var(--zd-surface-raised)',
            color: 'var(--zd-text-primary)',
            fontSize: '13px',
            fontWeight: 600,
            overflow: 'hidden',
            transition: 'border-color 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--zd-text-muted)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--zd-border)';
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0 10px' }}>
            <GithubIcon width={14} height={14} />
            <span>GitHub</span>
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '0 10px',
            borderLeft: '1px solid var(--zd-border)',
            background: 'var(--zd-surface)',
            height: '100%',
            color: 'var(--zd-text-secondary)',
          }}>
            <Star size={12} style={{ fill: 'currentColor' }} />
            <span>{stars}</span>
          </div>
        </a>

        <div style={{ width: '1px', height: '20px', backgroundColor: 'var(--zd-border)', margin: '0 4px' }} />

        <button
          onClick={() => setCommandPaletteOpen(true)}
          aria-label="Search tools and commands"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            height: '36px',
            padding: '0 12px',
            borderRadius: 'var(--zd-radius-sm)',
            border: '1px solid var(--zd-border)',
            background: 'var(--zd-surface-raised)',
            color: 'var(--zd-text-muted)',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 500,
            transition: 'border-color 0.2s ease, color 0.2s ease, background-color 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--zd-primary)';
            e.currentTarget.style.color = 'var(--zd-text-primary)';
            e.currentTarget.style.backgroundColor = 'var(--zd-primary-soft)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--zd-border)';
            e.currentTarget.style.color = 'var(--zd-text-muted)';
            e.currentTarget.style.backgroundColor = 'var(--zd-surface-raised)';
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <span style={{ display: 'inline' }}>Search tools...</span>
          <kbd
            style={{
              fontSize: '10px',
              fontFamily: 'inherit',
              padding: '2px 4px',
              borderRadius: '4px',
              background: 'var(--zd-surface)',
              border: '1px solid var(--zd-border)',
              color: 'var(--zd-text-muted)',
              lineHeight: 1,
            }}
          >
            ⌘K
          </kbd>
        </button>

        <button
          onClick={toggleTheme}
          aria-label="Toggle theme"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '36px',
            height: '36px',
            borderRadius: 'var(--zd-radius-sm)',
            border: 'none',
            background: 'transparent',
            color: 'var(--zd-text-muted)',
            cursor: 'pointer',
            transition: 'color 0.2s ease, background-color 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--zd-text-primary)';
            e.currentTarget.style.backgroundColor = 'var(--zd-primary-soft)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--zd-text-muted)';
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>
    </header>
  );
}


