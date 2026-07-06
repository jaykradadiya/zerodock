import { motion } from 'framer-motion';
import { ArrowRight, Shield, Search, Sparkles } from 'lucide-react';
import { toolRegistry } from '../../core/registry/tools';
import { getLandingTools } from '../../types/tool';
import { useUIStore } from '../../core/store/useUIStore';
import { Badge, Button } from '../../shared/components/ui';

export function HeroSection() {
  return (
    <section className="relative overflow-hidden flex flex-col items-center justify-center text-center px-4 sm:px-8 md:px-12 pt-12 sm:pt-20 2xl:pt-28 3xl:pt-36 pb-16 sm:pb-20 2xl:pb-28 min-h-[calc(100vh-4rem)]">
      <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 mb-8"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[var(--zd-surface)] border border-[var(--zd-border)] rounded-full text-xs font-semibold text-[var(--zd-text-secondary)] shadow-sm">
            <span>{getLandingTools(toolRegistry).length} privacy-first tools</span>
          </div>
          <Badge variant="accent" className="!px-3 !py-1.5 !text-xs !font-medium !normal-case !tracking-normal !rounded-full gap-1.5">
            <Shield className="w-3.5 h-3.5" />
            100% Client-Side · Zero Server Uploads
          </Badge>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.05 }}
          className="text-4xl sm:text-6xl lg:text-7xl 2xl:text-8xl 3xl:text-[9rem] font-extrabold tracking-tight text-[var(--zd-text-primary)] leading-[1.06] mb-6 max-w-3xl 2xl:max-w-5xl 3xl:max-w-6xl"
        >
          Developer tools that{' '}
          <span className="bg-gradient-to-r from-[var(--zd-primary)] via-[#A892FF] to-[var(--zd-accent)] bg-clip-text text-transparent">
            never leave your device
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.1 }}
          className="text-base sm:text-lg lg:text-xl 2xl:text-2xl text-[var(--zd-text-secondary)] max-w-2xl 2xl:max-w-3xl leading-relaxed mb-10 font-normal"
        >
          Format, convert, encode, decode, and test APIs — an engineering-grade suite of utilities running entirely inside your browser. No accounts. No tracking.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.15 }}
          className="w-full max-w-xl 2xl:max-w-2xl mb-10"
        >
            <Button
              variant="secondary"
              size="lg"
              onClick={() => useUIStore.getState().setCommandPaletteOpen(true)}
              className="w-full !justify-start gap-3.5 !px-6 !py-4 !rounded-2xl bg-[var(--zd-surface-raised)] hover:border-[var(--zd-primary)]/50 text-[var(--zd-text-muted)] hover:text-[var(--zd-text-secondary)] shadow-[var(--zd-shadow-sm)] hover:shadow-[var(--zd-shadow-md)] group transition-[box-shadow,border-color,color] duration-150"
            >
              <Search className="w-5 h-5 text-[var(--zd-primary)] transition-transform group-hover:scale-110 shrink-0" />
              <span className="flex-1 truncate text-left font-medium">Search or jump to any tool...</span>
              <div className="flex items-center gap-1 shrink-0">
                <kbd className="px-2 py-1 rounded-md bg-[var(--zd-surface)] border border-[var(--zd-border)] text-xs font-mono text-[var(--zd-text-muted)] group-hover:border-[var(--zd-primary)]/40">
                  ⌘
                </kbd>
                <kbd className="px-2 py-1 rounded-md bg-[var(--zd-surface)] border border-[var(--zd-border)] text-xs font-mono text-[var(--zd-text-muted)] group-hover:border-[var(--zd-primary)]/40">
                  K
                </kbd>
              </div>
            </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.2 }}
          className="flex flex-wrap items-center justify-center gap-4"
        >
            <Button
              variant="primary"
              size="lg"
              onClick={() => {
                const el = document.getElementById('tools');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="!bg-gradient-to-r !from-[var(--zd-primary)] !to-[#6C5CE7] !border-transparent shadow-[var(--zd-shadow-md)]"
            >
              <Sparkles className="w-4 h-4" />
              Explore All Tools
              <ArrowRight className="w-4 h-4 ml-0.5" />
            </Button>

            <Button
              variant="secondary"
              size="lg"
              className="!text-[var(--zd-text-primary)]"
              onClick={() => window.open('https://github.com/jayradadiya/ZeroDock', '_blank', 'noopener,noreferrer')}
            >
              <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
              </svg>
              View on GitHub
            </Button>
        </motion.div>
      </div>
    </section>
  );
}
