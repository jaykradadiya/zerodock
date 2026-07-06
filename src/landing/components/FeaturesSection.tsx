import { motion } from 'framer-motion';
import { ShieldCheck, Zap, UserX } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
  accent: string;
  accentBg: string;
}

const features: Feature[] = [
  {
    icon: ShieldCheck,
    title: 'Privacy by architecture',
    description:
      'Every tool runs in your browser using Web Workers and local APIs. No data is transmitted, stored, or logged. Your files never touch a server.',
    accent: 'var(--zd-accent)',
    accentBg: 'var(--zd-accent-soft)',
  },
  {
    icon: Zap,
    title: 'Instant performance',
    description:
      'No round-trips, no loading spinners. Tools process data in-memory at native speed. Large files are handled with streaming and chunking.',
    accent: 'var(--zd-primary)',
    accentBg: 'var(--zd-primary-soft)',
  },
  {
    icon: UserX,
    title: 'No accounts, ever',
    description:
      'No sign-up, no email, no tracking pixels. Open the page, use the tool, close the tab. It\'s that simple. Open-source and auditable.',
    accent: '#E17055',
    accentBg: 'rgba(225, 112, 85, 0.1)',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 260, damping: 24 } as any,
  },
};

export function FeaturesSection() {
  return (
    <section className="relative py-20 sm:py-28 2xl:py-36 px-4 sm:px-8 md:px-12 2xl:px-16 overflow-hidden max-w-7xl 2xl:max-w-[1600px] 3xl:max-w-[1900px] mx-auto">
      {/* Subtle background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[var(--zd-primary-soft)] to-transparent opacity-30 pointer-events-none" />

      <div className="relative z-10">
        {/* Section header */}
        <div className="text-center mb-16 2xl:mb-20">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5 }}
            className="text-xs font-mono font-semibold uppercase tracking-widest text-[var(--zd-primary)] mb-3"
          >
            Why ZeroDock
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="text-3xl sm:text-5xl 2xl:text-6xl font-extrabold tracking-tight text-[var(--zd-text-primary)] mb-4"
          >
            Built different, on purpose
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-base sm:text-lg 2xl:text-xl text-[var(--zd-text-secondary)] max-w-lg 2xl:max-w-xl mx-auto leading-relaxed"
          >
            Not another SaaS. Just tools that respect your data and your time.
          </motion.p>
        </div>

        {/* Feature cards */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 2xl:gap-8"
        >
          {features.map((feature) => (
            <FeatureCard key={feature.title} feature={feature} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function FeatureCard({ feature }: { feature: Feature }) {
  const Icon = feature.icon;

  return (
    <motion.div
      variants={itemVariants}
      whileHover={{ y: -4 }}
      className="p-8 2xl:p-10 rounded-2xl bg-[var(--zd-surface)] border border-[var(--zd-border)] hover:border-[var(--zd-primary)]/50 hover:shadow-lg transition-[border-color,box-shadow] duration-200 flex flex-col"
    >
      {/* Icon */}
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center mb-6 shadow-sm"
        style={{ backgroundColor: feature.accentBg }}
      >
        <Icon size={22} style={{ color: feature.accent }} />
      </div>

      {/* Title */}
      <h3 className="text-lg font-bold text-[var(--zd-text-primary)] mb-3 tracking-tight">
        {feature.title}
      </h3>

      {/* Description */}
      <p className="text-sm sm:text-base leading-relaxed text-[var(--zd-text-secondary)] m-0">
        {feature.description}
      </p>
    </motion.div>
  );
}
