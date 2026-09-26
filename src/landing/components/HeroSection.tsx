import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, FileJson } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { toolRegistry } from '../../core/registry/tools';
import { getLandingTools } from '../../types/tool';
import { Button } from '../../shared/components/ui';

export function HeroSection() {
  const navigate = useNavigate();
  const toolCount = getLandingTools(toolRegistry).length;

  return (
    <section className="relative overflow-hidden flex flex-col items-center justify-center text-center px-4 sm:px-8 md:px-12 pt-16 sm:pt-24 2xl:pt-32 pb-20 sm:pb-28 min-h-[calc(100vh-4rem)]">
      {/* Structural grid — not blurry orbs */}
      <div className="absolute inset-0 zd-hero-grid" aria-hidden="true" />

      {/* Warm gradient wash — dual radial for depth */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: [
            'radial-gradient(ellipse 55% 45% at 45% 35%, var(--zd-primary-soft), transparent)',
            'radial-gradient(ellipse 40% 35% at 65% 50%, var(--zd-accent-soft), transparent)',
          ].join(', '),
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 max-w-3xl 2xl:max-w-4xl mx-auto flex flex-col items-center">
        {/* Status line — monospace, understated, not a flashy pill */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-3 mb-10 sm:mb-12"
        >
          <span className="flex items-center gap-2.5 font-mono text-[11px] sm:text-xs tracking-[0.14em] uppercase text-[var(--zd-text-muted)]">
            <span className="relative flex items-center justify-center w-2 h-2">
              <span className="absolute inset-0 rounded-full bg-[var(--zd-accent)] animate-ping opacity-40" />
              <span className="relative w-1.5 h-1.5 rounded-full bg-[var(--zd-accent)]" />
            </span>
            {toolCount} tools · 100% local · open source
          </span>
        </motion.div>

        {/* Headline — massive, clean, one accent (underline) */}
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.1 }}
          className="text-[2.5rem] sm:text-[3.5rem] lg:text-7xl 2xl:text-8xl font-black tracking-[-0.04em] text-[var(--zd-text-primary)] leading-[1.04] mb-7 2xl:mb-9"
        >
          Developer tools that{' '}
          <span className="relative inline-block whitespace-nowrap">
            <span className="relative z-10">never leave</span>
            <motion.span
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.7, delay: 0.75, ease: [0.22, 1, 0.36, 1] }}
              className="absolute bottom-[0.06em] left-0 right-0 h-[0.07em] bg-gradient-to-r from-[var(--zd-primary)] to-[var(--zd-accent)] origin-left rounded-full"
              aria-hidden="true"
            />
          </span>
          <br className="hidden sm:block" />
          your device.
        </motion.h1>

        {/* Subtitle — short, human, direct */}
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-base sm:text-lg 2xl:text-xl text-[var(--zd-text-secondary)] max-w-xl 2xl:max-w-2xl leading-relaxed mb-12 2xl:mb-14 font-normal"
        >
          Format JSON, test APIs, hash strings, diff code, decode JWTs — a full
          engineering toolkit that runs in your browser. No servers. No accounts.
        </motion.p>

        {/* CTAs — clean, no search bar competing for attention */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-wrap items-center justify-center gap-4"
        >
          <Button
            variant="primary"
            size="lg"
            onClick={() => {
              const el = document.getElementById('tools');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            className="!px-7 !py-3 !text-[15px] !font-bold shadow-[var(--zd-shadow-md)] hover:shadow-[var(--zd-shadow-glow)]"
          >
            <Sparkles className="w-4 h-4" />
            Explore Tools
            <ArrowRight className="w-4 h-4 ml-0.5" />
          </Button>

          <Button
            variant="secondary"
            size="lg"
            onClick={() => navigate({ to: '/json-toolkit' })}
            className="!px-7 !py-3 !text-[15px] !font-bold !text-[var(--zd-text-primary)] hover:!text-[var(--zd-primary)] border-[var(--zd-border)] hover:border-[var(--zd-primary)]/40 shadow-xs"
          >
            <FileJson className="w-4 h-4 text-[var(--zd-primary)]" />
            JSON Toolkit
          </Button>

          <Button
            variant="secondary"
            size="lg"
            className="!px-7 !py-3 !text-[15px] !font-bold !text-[var(--zd-text-primary)]"
            onClick={() =>
              window.open(
                'https://github.com/jaykradadiya/zerodock',
                '_blank',
                'noopener,noreferrer'
              )
            }
          >
            <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
              <path
                fillRule="evenodd"
                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                clipRule="evenodd"
              />
            </svg>
            View on GitHub
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
