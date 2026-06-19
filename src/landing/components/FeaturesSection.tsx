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
    <section
      style={{
        position: 'relative',
        padding: 'clamp(64px, 10vh, 120px) clamp(16px, 5vw, 48px)',
        overflow: 'hidden',
      }}
    >
      {/* Subtle background gradient */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(180deg, transparent 0%, var(--zd-primary-soft) 50%, transparent 100%)',
          opacity: 0.3,
          pointerEvents: 'none',
        }}
      />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: '1200px', margin: '0 auto' }}>
        {/* Section header */}
        <div style={{ textAlign: 'center', marginBottom: '64px' }}>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5 }}
            style={{
              fontSize: '13px',
              fontWeight: 600,
              textTransform: 'uppercase' as const,
              letterSpacing: '0.08em',
              color: 'var(--zd-primary)',
              marginBottom: '12px',
            }}
          >
            Why ZeroDock
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5, delay: 0.05 }}
            style={{
              fontSize: 'clamp(24px, 4vw, 36px)',
              fontWeight: 700,
              lineHeight: 1.15,
              letterSpacing: '-0.025em',
              color: 'var(--zd-text-primary)',
              margin: '0 0 16px',
            }}
          >
            Built different, on purpose
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5, delay: 0.1 }}
            style={{
              fontSize: '16px',
              color: 'var(--zd-text-secondary)',
              maxWidth: '460px',
              margin: '0 auto',
              lineHeight: 1.6,
            }}
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
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '24px',
          }}
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
      style={{
        padding: '36px 32px',
        borderRadius: 'var(--zd-radius-lg)',
        backgroundColor: 'var(--zd-surface)',
        border: '1px solid var(--zd-border)',
        transition: 'border-color 0.25s ease, box-shadow 0.25s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--zd-border-hover)';
        e.currentTarget.style.boxShadow = 'var(--zd-shadow-md)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--zd-border)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Icon */}
      <div
        style={{
          width: '48px',
          height: '48px',
          borderRadius: 'var(--zd-radius-md)',
          backgroundColor: feature.accentBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '24px',
        }}
      >
        <Icon size={22} style={{ color: feature.accent }} />
      </div>

      {/* Title */}
      <h3
        style={{
          fontSize: '18px',
          fontWeight: 600,
          color: 'var(--zd-text-primary)',
          margin: '0 0 12px',
          letterSpacing: '-0.01em',
        }}
      >
        {feature.title}
      </h3>

      {/* Description */}
      <p
        style={{
          fontSize: '15px',
          lineHeight: 1.65,
          color: 'var(--zd-text-secondary)',
          margin: 0,
        }}
      >
        {feature.description}
      </p>
    </motion.div>
  );
}
