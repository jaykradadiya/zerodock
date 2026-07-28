import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';

interface Feature {
  stat: string;
  label: string;
  description: string;
  accentColor: string;
}

const features: Feature[] = [
  {
    stat: '0 bytes',
    label: 'sent to any server',
    description:
      'Every tool runs in your browser using Web Workers and local APIs. Your data never touches a server. Not even ours.',
    accentColor: 'var(--zd-primary)',
  },
  {
    stat: '< 50ms',
    label: 'average operation time',
    description:
      'No round-trips, no spinners. Tools process data in-memory at native speed. Large files are handled with streaming.',
    accentColor: 'var(--zd-accent)',
  },
  {
    stat: '0 accounts',
    label: 'required, ever',
    description:
      'No sign-up, no email, no tracking pixels. Open the page, use the tool, close the tab. Open-source and auditable.',
    accentColor: '#E17055',
  },
];

function FeatureBlock({ feature, index }: { feature: Feature; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.12, ease: [0.22, 1, 0.36, 1] }}
      className="group relative p-6 sm:p-8 2xl:p-10 rounded-2xl border border-[var(--zd-border)] bg-[var(--zd-surface)] transition-[border-color,box-shadow] duration-200 hover:border-[var(--zd-border-hover)] hover:shadow-[var(--zd-shadow-md)]"
    >
      {/* Bottom accent line on hover */}
      <div
        className="absolute bottom-0 left-4 right-4 h-[2px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: feature.accentColor }}
        aria-hidden="true"
      />

      {/* Stat number */}
      <div className="mb-4">
        <span
          className="zd-stat text-3xl sm:text-4xl 2xl:text-5xl"
          style={{ color: feature.accentColor }}
        >
          {feature.stat}
        </span>
      </div>

      {/* Label */}
      <p className="text-sm font-semibold text-[var(--zd-text-primary)] tracking-tight mb-3">
        {feature.label}
      </p>

      {/* Description */}
      <p className="text-sm leading-relaxed text-[var(--zd-text-secondary)] m-0">
        {feature.description}
      </p>
    </motion.div>
  );
}

export function FeaturesSection() {
  return (
    <section className="relative py-20 sm:py-28 2xl:py-36 px-4 sm:px-8 md:px-12 2xl:px-16 overflow-hidden max-w-7xl 2xl:max-w-[1600px] 3xl:max-w-[1900px] mx-auto">
      <div className="relative z-10">
        {/* Section header — left-aligned, opinionated */}
        <div className="mb-14 2xl:mb-18">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-start gap-3"
          >
            <span className="font-mono text-[11px] tracking-[0.14em] uppercase text-[var(--zd-primary)] font-semibold">
              Zero compromises
            </span>
            <h2 className="text-3xl sm:text-5xl 2xl:text-6xl font-black tracking-[-0.03em] text-[var(--zd-text-primary)] leading-tight">
              Built different, on purpose.
            </h2>
            <p className="text-base sm:text-lg text-[var(--zd-text-secondary)] max-w-lg leading-relaxed">
              Not another SaaS. Just tools that respect your data and your time.
            </p>
          </motion.div>
        </div>

        {/* Feature blocks — stat-driven, not generic icon cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 2xl:gap-6">
          {features.map((feature, i) => (
            <FeatureBlock key={feature.stat} feature={feature} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
