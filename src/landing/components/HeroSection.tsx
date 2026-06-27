import { motion } from 'framer-motion';
import { Link } from '@tanstack/react-router';
import { ArrowRight, Shield } from 'lucide-react';
import { toolRegistry } from '../../core/registry/tools';

export function HeroSection() {
  return (
    <section
      style={{
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: 'clamp(120px, 18vh, 200px) clamp(16px, 5vw, 48px) clamp(80px, 12vh, 140px)',
        minHeight: '90vh',
      }}
    >
      {/* Background orbs */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          overflow: 'hidden',
        }}
      >
        {/* Primary orb */}
        <div
          style={{
            position: 'absolute',
            top: '15%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 'clamp(400px, 50vw, 700px)',
            height: 'clamp(400px, 50vw, 700px)',
            borderRadius: '50%',
            background: 'radial-gradient(circle, var(--zd-primary) 0%, transparent 70%)',
            opacity: 0.08,
            filter: 'blur(80px)',
            animation: 'float 8s ease-in-out infinite',
          }}
        />
        {/* Accent orb */}
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            right: '15%',
            width: 'clamp(200px, 25vw, 400px)',
            height: 'clamp(200px, 25vw, 400px)',
            borderRadius: '50%',
            background: 'radial-gradient(circle, var(--zd-accent) 0%, transparent 70%)',
            opacity: 0.06,
            filter: 'blur(60px)',
            animation: 'float-delayed 10s ease-in-out infinite',
          }}
        />
        {/* Dot grid */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'radial-gradient(circle at 1px 1px, var(--zd-text-muted) 1px, transparent 0)',
            backgroundSize: '40px 40px',
            opacity: 0.04,
            animation: 'grid-fade 6s ease-in-out infinite',
          }}
        />
      </div>

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1, maxWidth: '800px' }}>
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
          style={{
            display: 'inline-flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 12px 6px 6px', backgroundColor: 'var(--zd-surface)', border: '1px solid var(--zd-border)', borderRadius: '999px', fontSize: '12px', fontWeight: 600, color: 'var(--zd-text-secondary)', marginBottom: '8px' }}>
            <span style={{ backgroundColor: 'var(--zd-primary)', color: 'white', padding: '2px 8px', borderRadius: '999px', fontSize: '11px', letterSpacing: '0.02em' }}>NEW</span>
            <span>{toolRegistry.length} developer tools now available locally</span>
          </div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 16px',
              borderRadius: '100px',
              border: '1px solid var(--zd-border)',
              backgroundColor: 'var(--zd-surface)',
              fontSize: '13px',
              fontWeight: 500,
              color: 'var(--zd-text-secondary)',
              marginBottom: '32px',
              boxShadow: 'var(--zd-shadow-sm)',
            }}
          >
            <Shield size={14} style={{ color: 'var(--zd-accent)' }} />
            100% client-side · Zero data sent to servers
          </div>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ y: 20 }}
          animate={{ y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
          style={{
            fontSize: 'clamp(36px, 6vw, 56px)',
            fontWeight: 800,
            lineHeight: 1.08,
            letterSpacing: '-0.03em',
            color: 'var(--zd-text-primary)',
            margin: '0 0 24px',
          }}
        >
          Developer tools that
          <br />
          <span
            style={{
              background: 'linear-gradient(135deg, var(--zd-primary) 0%, var(--zd-accent) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            never leave your device
          </span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
          style={{
            fontSize: 'clamp(16px, 2vw, 19px)',
            lineHeight: 1.6,
            color: 'var(--zd-text-secondary)',
            maxWidth: '580px',
            margin: '0 auto 40px',
          }}
        >
          Format, convert, encode, decode — a growing collection of
          essential utilities that run entirely in your browser.
          No uploads. No accounts. No tracking.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            flexWrap: 'wrap',
          }}
        >
          <Link
            to="/"
            hash="tools"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '14px 28px',
              borderRadius: 'var(--zd-radius-md)',
              background: 'linear-gradient(135deg, var(--zd-primary) 0%, #9D90F9 100%)',
              color: '#FFFFFF',
              fontSize: '15px',
              fontWeight: 600,
              textDecoration: 'none',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(108, 92, 231, 0.3), 0 1px 3px rgba(0, 0, 0, 0.1)',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px) scale(1.02)';
              e.currentTarget.style.boxShadow = '0 6px 24px rgba(108, 92, 231, 0.4), 0 2px 6px rgba(0, 0, 0, 0.12)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0) scale(1)';
              e.currentTarget.style.boxShadow = '0 4px 16px rgba(108, 92, 231, 0.3), 0 1px 3px rgba(0, 0, 0, 0.1)';
            }}
            onClick={() => {
              const el = document.getElementById('tools');
              if (el) {
                el.scrollIntoView({ behavior: 'smooth' });
              }
            }}
          >
            Explore Tools
            <ArrowRight size={16} />
          </Link>
          <a
            href="https://github.com/jayradadiya/ZeroDock"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '14px 28px',
              borderRadius: 'var(--zd-radius-md)',
              backgroundColor: 'var(--zd-surface)',
              color: 'var(--zd-text-primary)',
              fontSize: '15px',
              fontWeight: 600,
              textDecoration: 'none',
              border: '1px solid var(--zd-border)',
              cursor: 'pointer',
              boxShadow: 'var(--zd-shadow-sm)',
              transition: 'transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.borderColor = 'var(--zd-border-hover)';
              e.currentTarget.style.boxShadow = 'var(--zd-shadow-md)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.borderColor = 'var(--zd-border)';
              e.currentTarget.style.boxShadow = 'var(--zd-shadow-sm)';
            }}
          >
            <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
            </svg>
            View on GitHub
          </a>
        </motion.div>
      </div>
    </section>
  );
}
