import { motion } from 'framer-motion';
import { Link } from '@tanstack/react-router';
import { toolRegistry } from '../../core/registry/tools';
import { ChevronRight, type LucideIcon } from 'lucide-react';
import type { Tool } from '../../types/tool';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
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

export function ToolsGrid() {
  return (
    <section
      id="tools"
      style={{
        padding: 'clamp(64px, 10vh, 120px) clamp(16px, 5vw, 48px)',
        maxWidth: '1200px',
        margin: '0 auto',
        width: '100%',
      }}
    >
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
          Toolbox
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
          Everything you need, nothing you don't
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5, delay: 0.1 }}
          style={{
            fontSize: '16px',
            color: 'var(--zd-text-secondary)',
            maxWidth: '480px',
            margin: '0 auto',
            lineHeight: 1.6,
          }}
        >
          A curated set of developer tools, each designed to do one thing well.
        </motion.p>
      </div>

      {/* Grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-60px' }}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '20px',
        }}
      >
        {toolRegistry.map((tool) => (
          <ToolCard key={tool.id} tool={tool} />
        ))}
      </motion.div>
    </section>
  );
}

function ToolCard({ tool }: { tool: Tool }) {
  const Icon = tool.icon as LucideIcon;

  const cardContent = (
    <motion.div
      variants={itemVariants}
      whileHover={{ y: -3 }}
      style={{
        position: 'relative',
        padding: '28px',
        borderRadius: 'var(--zd-radius-lg)',
        backgroundColor: 'var(--zd-surface)',
        border: '1px solid var(--zd-border)',
        cursor: 'pointer',
        transition: 'border-color 0.25s ease, box-shadow 0.25s ease',
        height: '100%',
        display: 'flex',
        flexDirection: 'column' as const,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--zd-primary)';
        e.currentTarget.style.boxShadow = 'var(--zd-shadow-lg), 0 0 0 1px var(--zd-primary)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--zd-border)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Icon */}
      <div
        style={{
          width: '44px',
          height: '44px',
          borderRadius: 'var(--zd-radius-md)',
          backgroundColor: 'var(--zd-primary-soft)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '20px',
          transition: 'transform 0.25s ease',
        }}
      >
        <Icon size={20} style={{ color: 'var(--zd-primary)' }} />
      </div>

      {/* Title row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
        <h3
          style={{
            fontSize: '16px',
            fontWeight: 600,
            color: 'var(--zd-text-primary)',
            margin: 0,
            letterSpacing: '-0.01em',
          }}
        >
          {tool.name}
        </h3>
      </div>

      {/* Description */}
      <p
        style={{
          fontSize: '14px',
          lineHeight: 1.55,
          color: 'var(--zd-text-muted)',
          margin: 0,
          flex: 1,
        }}
      >
        {tool.metadata.description}
      </p>

      {/* Category tag */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: '20px',
          paddingTop: '16px',
          borderTop: '1px solid var(--zd-border)',
        }}
      >
        <span
          style={{
            fontSize: '12px',
            fontWeight: 500,
            color: 'var(--zd-text-muted)',
            letterSpacing: '0.02em',
          }}
        >
          {tool.category}
        </span>
        <ChevronRight
          size={14}
          style={{
            color: 'var(--zd-primary)',
            opacity: 0.6,
            transition: 'opacity 0.2s ease, transform 0.2s ease',
          }}
        />
      </div>
    </motion.div>
  );

  return (
    <Link to={tool.route} style={{ textDecoration: 'none', display: 'block', height: '100%' }}>
      {cardContent}
    </Link>
  );
}
