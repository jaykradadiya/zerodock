import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Button } from '../../shared/components/ui';

export function CTABanner() {
  return (
    <section className="relative px-4 sm:px-8 md:px-12 2xl:px-16 py-20 sm:py-24 2xl:py-28">
      {/* Subtle gradient background for visual separation */}
      <div className="absolute inset-0 zd-cta-bg pointer-events-none" aria-hidden="true" />

      {/* Top divider */}
      <div className="absolute top-0 left-4 right-4 sm:left-8 sm:right-8 md:left-12 md:right-12 zd-section-divider" />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.5 }}
        className="relative z-10 max-w-3xl mx-auto text-center"
      >
        <h2 className="text-2xl sm:text-4xl 2xl:text-5xl font-black tracking-[-0.03em] text-[var(--zd-text-primary)] mb-4">
          Your browser is the server.
        </h2>
        <p className="text-base sm:text-lg text-[var(--zd-text-secondary)] mb-10 max-w-md mx-auto leading-relaxed">
          No signup. No tracking. Just tools.
        </p>
        <Button
          variant="primary"
          size="lg"
          onClick={() => {
            const el = document.getElementById('tools');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
          className="!px-8 !py-3 !text-[15px] !font-bold shadow-[var(--zd-shadow-md)] hover:shadow-[var(--zd-shadow-glow)]"
        >
          Get started
          <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </motion.div>
    </section>
  );
}
