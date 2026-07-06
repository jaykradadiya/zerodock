import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from '@tanstack/react-router';
import { toolRegistry } from '../../core/registry/tools';
import { ChevronRight, Clock, Star, LayoutGrid, List, Sparkles, type LucideIcon } from 'lucide-react';
import type { Tool } from '../../types/tool';
import { usePreferenceStore } from '../../core/store/usePreferenceStore';
import { playSound } from '../../shared/utils/sound';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 280, damping: 22 } as any,
  },
};

export function ToolsGrid() {
  const { recentTools, favoriteTools, viewMode, setViewMode } = usePreferenceStore();
  const [activeCategory, setActiveCategory] = useState<string>('All');
  
  const categories = ['All', ...Array.from(new Set(toolRegistry.map(t => t.category)))];
  
  const recentToolObjects = recentTools
    .map(id => toolRegistry.find(t => t.id === id))
    .filter(Boolean) as Tool[];

  const favoriteToolObjects = favoriteTools
    .map(id => toolRegistry.find(t => t.id === id))
    .filter(Boolean) as Tool[];

  const filteredTools = activeCategory === 'All'
    ? toolRegistry.filter(t => !favoriteTools.includes(t.id))
    : toolRegistry.filter(t => t.category === activeCategory && !favoriteTools.includes(t.id));

  return (
    <section
      id="tools"
      className="py-20 sm:py-28 2xl:py-36 px-4 sm:px-8 md:px-12 2xl:px-16 max-w-7xl 2xl:max-w-[1600px] 3xl:max-w-[1900px] mx-auto w-full"
    >
      {/* Section header */}
      <div className="text-center mb-16">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--zd-primary-soft)] border border-[var(--zd-primary)]/30 text-xs font-mono font-semibold text-[var(--zd-primary)] uppercase tracking-widest mb-4"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Utilitarian Suite</span>
        </motion.div>
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5, delay: 0.05 }}
          className="text-3xl sm:text-5xl 2xl:text-6xl font-extrabold tracking-tight text-[var(--zd-text-primary)] mb-4"
        >
          Everything you need, nothing you don't
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-base sm:text-lg 2xl:text-xl text-[var(--zd-text-secondary)] max-w-xl 2xl:max-w-2xl mx-auto leading-relaxed"
        >
          A curated engineering toolkit. High density, instant responsiveness, and zero server communication.
        </motion.p>
      </div>

      {/* Filters & View Toggle Row */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-10 pb-4 border-b border-[var(--zd-border)]">
        {/* Categories Filter */}
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 no-scrollbar">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                activeCategory === cat
                  ? 'bg-[var(--zd-primary)] text-white shadow-[0_0_15px_var(--zd-glow)] font-bold'
                  : 'bg-[var(--zd-surface)] text-[var(--zd-text-secondary)] hover:text-[var(--zd-text-primary)] hover:bg-[var(--zd-surface-raised)] border border-[var(--zd-border)]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-1 p-1 bg-[var(--zd-surface)] rounded-xl border border-[var(--zd-border)] self-end md:self-auto shrink-0">
          <button
            onClick={() => setViewMode('grid')}
            aria-label="Grid view"
            className={`p-2 rounded-lg cursor-pointer transition-colors ${
              viewMode === 'grid'
                ? 'bg-[var(--zd-surface-raised)] text-[var(--zd-primary)] shadow-sm'
                : 'text-[var(--zd-text-muted)] hover:text-[var(--zd-text-secondary)]'
            }`}
          >
            <LayoutGrid size={18} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            aria-label="List view"
            className={`p-2 rounded-lg cursor-pointer transition-colors ${
              viewMode === 'list'
                ? 'bg-[var(--zd-surface-raised)] text-[var(--zd-primary)] shadow-sm'
                : 'text-[var(--zd-text-muted)] hover:text-[var(--zd-text-secondary)]'
            }`}
          >
            <List size={18} />
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeCategory}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.25 }}
        >
          {/* Favorites Section */}
          {activeCategory === 'All' && favoriteToolObjects.length > 0 && (
            <div className="mb-14">
              <div className="flex items-center gap-2 mb-6">
                <div className="p-1.5 rounded-lg bg-[var(--zd-primary-soft)] text-[var(--zd-primary)]">
                  <Star size={16} className="fill-current" />
                </div>
                <h3 className="text-lg font-bold text-[var(--zd-text-primary)] tracking-tight">Starred Favorites</h3>
              </div>
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className={`grid gap-5 2xl:gap-6 ${
                  viewMode === 'grid'
                    ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4'
                    : 'grid-cols-1'
                }`}
              >
                {favoriteToolObjects.map((tool) => (
                  <ToolCard key={`fav-${tool.id}`} tool={tool} viewMode={viewMode} />
                ))}
              </motion.div>
              <div className="h-px bg-[var(--zd-border)] mt-12" />
            </div>
          )}

          {/* Recently Used Section */}
          {activeCategory === 'All' && recentToolObjects.length > 0 && (
            <div className="mb-14">
              <div className="flex items-center gap-2 mb-6">
                <div className="p-1.5 rounded-lg bg-[var(--zd-primary-soft)] text-[var(--zd-primary)]">
                  <Clock size={16} />
                </div>
                <h3 className="text-lg font-bold text-[var(--zd-text-primary)] tracking-tight">Recently Used</h3>
              </div>
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className={`grid gap-5 2xl:gap-6 ${
                  viewMode === 'grid'
                    ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4'
                    : 'grid-cols-1'
                }`}
              >
                {recentToolObjects.map((tool) => (
                  <ToolCard key={`recent-${tool.id}`} tool={tool} viewMode={viewMode} />
                ))}
              </motion.div>
              <div className="h-px bg-[var(--zd-border)] mt-12" />
            </div>
          )}

          {/* Grid Section */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-[var(--zd-text-primary)] tracking-tight">
              {activeCategory === 'All' ? 'All Tools' : `${activeCategory} Tools`}
            </h3>
            <span className="text-xs font-mono text-[var(--zd-text-muted)] bg-[var(--zd-surface)] px-2.5 py-1 rounded-md border border-[var(--zd-border)]">
              {filteredTools.length} {filteredTools.length === 1 ? 'tool' : 'tools'}
            </span>
          </div>

          <motion.div
            key={activeCategory}
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className={`grid gap-5 2xl:gap-6 ${
              viewMode === 'grid'
                ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4'
                : 'grid-cols-1'
            }`}
          >
            {filteredTools.map((tool) => (
              <ToolCard key={tool.id} tool={tool} viewMode={viewMode} />
            ))}
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </section>
  );
}

function ToolCard({ tool, viewMode = 'grid' }: { tool: Tool, viewMode?: 'grid' | 'list' }) {
  const Icon = tool.icon as LucideIcon;
  const isFavorite = usePreferenceStore((s) => s.favoriteTools.includes(tool.id));

  return (
    <Link to={tool.route} className="no-underline block h-full group">
      <motion.div
        variants={itemVariants}
        whileHover={{ y: -6, boxShadow: '0 16px 40px rgba(0,0,0,0.18), 0 0 24px var(--zd-glow)' }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 380, damping: 28 }}
        className={`relative p-6 rounded-2xl bg-[var(--zd-surface)] border border-[var(--zd-border)] h-full flex transition-[border-color,background-color] duration-200 group-hover:border-[var(--zd-primary)]/60 ${
          viewMode === 'grid' ? 'flex-col justify-between' : 'flex-row items-center gap-6'
        }`}
      >
        <div className={`flex flex-col flex-1 ${viewMode === 'grid' ? 'gap-4' : 'gap-2'}`}>
          {/* Top row: Icon & Star button */}
          <div className="flex items-start justify-between">
            <motion.div
              className="w-11 h-11 rounded-xl bg-[var(--zd-primary-soft)] border border-[var(--zd-primary)]/30 flex items-center justify-center text-[var(--zd-primary)] shadow-sm transition-[background-color,color,border-color] duration-200 group-hover:bg-[var(--zd-primary)] group-hover:text-[var(--zd-bg)]"
              whileHover={{ scale: 1.12 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            >
              <Icon size={20} />
            </motion.div>

            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const state = usePreferenceStore.getState();
                state.toggleFavoriteTool(tool.id);
                if (state.soundEnabled) playSound('tick');
              }}
              aria-label="Toggle favorite"
              className={`p-2 rounded-lg transition-[color,background-color,opacity] duration-150 cursor-pointer ${
                isFavorite
                  ? 'text-[var(--zd-primary)] hover:bg-[var(--zd-primary-soft)]'
                  : 'text-[var(--zd-text-muted)] opacity-0 group-hover:opacity-100 hover:text-[var(--zd-text-secondary)] hover:bg-[var(--zd-surface-raised)]'
              }`}
            >
              <Star size={16} className={isFavorite ? 'fill-current' : ''} />
            </button>
          </div>

          {/* Title & Description */}
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <h3 className="text-base font-bold text-[var(--zd-text-primary)] group-hover:text-[var(--zd-primary)] transition-colors duration-150 tracking-tight m-0">
                {tool.name}
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-[var(--zd-text-muted)] leading-relaxed line-clamp-2 m-0">
              {tool.metadata.description}
            </p>
          </div>
        </div>

        {/* Bottom row: Monospace tags & arrow */}
        <div className={`flex items-center justify-between pt-4 mt-4 border-t border-[var(--zd-border)]/60 ${viewMode === 'list' ? 'pt-0 mt-0 border-t-0 shrink-0 min-w-[200px]' : ''}`}>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--zd-surface-raised)] border border-[var(--zd-border)] text-[var(--zd-text-secondary)]">
              {tool.category}
            </span>
            {tool.metadata.tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--zd-surface-raised)]/40 text-[var(--zd-text-muted)]"
              >
                #{tag}
              </span>
            ))}
          </div>
          <ChevronRight className="w-4 h-4 text-[var(--zd-text-muted)] group-hover:text-[var(--zd-primary)] group-hover:translate-x-1 transition-[color,transform] duration-200 shrink-0" />
        </div>
      </motion.div>
    </Link>
  );
}
