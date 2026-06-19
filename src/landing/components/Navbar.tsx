import { useState, useEffect } from 'react';
import { Link } from '@tanstack/react-router';
import { useGlobalStore } from '../../core/store/useGlobalStore';
import { Moon, Sun } from 'lucide-react';

export function Navbar() {
  const { theme, toggleTheme, setCommandPaletteOpen } = useGlobalStore();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 16);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
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
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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


