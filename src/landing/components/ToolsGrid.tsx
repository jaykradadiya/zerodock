import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react';
import { toolRegistry } from '../../core/registry/tools';
import { getFeaturedTools, getLandingTools } from '../../types/tool';
import { Clock, Star, LayoutGrid, List, Sparkles, type LucideIcon } from 'lucide-react';
import type { Tool } from '../../types/tool';
import { usePreferenceStore } from '../../core/store/usePreferenceStore';
import { playSound } from '../../shared/utils/sound';
import { Badge, Button, SectionLabel, ToolCard } from '../../shared/components/ui';
import { fuzzyFilter } from '../../shared/utils/fuzzySearch';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.02, delayChildren: 0 },
  },
};

const itemVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.15 } },
};

const landingTools = getLandingTools(toolRegistry);
const featuredTools = getFeaturedTools(toolRegistry);

export function ToolsGrid() {
  const { recentTools, favoriteTools, viewMode, setViewMode } = usePreferenceStore();
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const categories = ['All', ...Array.from(new Set(landingTools.map((t) => t.category)))];

  const recentToolObjects = recentTools
    .map((id) => toolRegistry.find((t) => t.id === id))
    .filter((t): t is Tool => Boolean(t) && !t!.metadata.hiddenFromBrowse);

  const favoriteToolObjects = favoriteTools
    .map((id) => toolRegistry.find((t) => t.id === id))
    .filter((t): t is Tool => Boolean(t) && !t!.metadata.hiddenFromBrowse);

  const standardTools = landingTools.filter((t) => t.metadata.tier !== 'featured');

  const filteredTools =
    activeCategory === 'All'
      ? standardTools.filter((t) => !favoriteTools.includes(t.id))
      : standardTools.filter((t) => t.category === activeCategory && !favoriteTools.includes(t.id));

  const searchIn = (tools: Tool[]) =>
    searchQuery.trim()
      ? fuzzyFilter(tools, searchQuery, (t) =>
          `${t.name} ${t.category} ${t.metadata.tags.join(' ')} ${t.metadata.description}`
        )
      : tools;

  const displayedFeatured = searchIn(featuredTools);
  const displayedFavorites = searchIn(favoriteToolObjects);
  const displayedRecent = searchIn(recentToolObjects);
  const displayedFiltered = searchIn(filteredTools);

  const handleFavoriteToggle = (toolId: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const state = usePreferenceStore.getState();
    state.toggleFavoriteTool(toolId);
    if (state.soundEnabled) playSound('tick');
  };

  const gridClass =
    viewMode === 'grid'
      ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4'
      : 'grid-cols-1';

  const renderToolCard = (tool: Tool, keyPrefix = '') => (
    <ToolCard
      key={`${keyPrefix}${tool.id}`}
      title={tool.name}
      description={tool.metadata.description}
      category={tool.category}
      tags={tool.metadata.tags.slice(0, 2)}
      route={tool.route}
      icon={tool.icon as LucideIcon}
      viewMode={viewMode}
      isFavorite={favoriteTools.includes(tool.id)}
      onFavoriteToggle={handleFavoriteToggle(tool.id)}
      variants={itemVariants}
    />
  );

  const renderGrid = (tools: Tool[], prefix = '') => (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className={`grid gap-5 2xl:gap-6 ${gridClass}`}
    >
      {tools.map((tool) => renderToolCard(tool, prefix))}
    </motion.div>
  );

  return (
    <section
      id="tools"
      className="py-20 sm:py-28 2xl:py-36 px-4 sm:px-8 md:px-12 2xl:px-16 max-w-7xl 2xl:max-w-[1600px] 3xl:max-w-[1900px] mx-auto w-full"
    >
      <div className="text-center mb-16">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--zd-primary-soft)] border border-[var(--zd-primary)]/30 mb-4"
        >
          <Sparkles className="w-3.5 h-3.5 text-[var(--zd-primary)]" />
          <SectionLabel className="!text-[var(--zd-primary)]">Core toolkit</SectionLabel>
        </motion.div>
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          className="text-3xl sm:text-5xl 2xl:text-6xl font-extrabold tracking-tight text-[var(--zd-text-primary)] mb-4"
        >
          Start with the essentials
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          className="text-base sm:text-lg text-[var(--zd-text-secondary)] max-w-xl mx-auto leading-relaxed"
        >
          JSON, HTTP, security, and encoding — the tools developers reach for daily. All local, all instant.
        </motion.p>
      </div>

      <div className="sticky top-16 z-20 -mx-4 sm:-mx-8 md:-mx-12 px-4 sm:px-8 md:px-12 py-3 mb-6 bg-[var(--zd-bg)]/90 backdrop-blur-md border-b border-[var(--zd-border)]/60">
        <div className="relative max-w-xl mx-auto">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--zd-text-muted)] pointer-events-none" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tools..."
            aria-label="Search tools"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[var(--zd-border)] bg-[var(--zd-surface)] text-sm text-[var(--zd-text-primary)] placeholder:text-[var(--zd-text-muted)] focus:outline-none focus:border-[var(--zd-primary)] focus:ring-2 focus:ring-[var(--zd-primary)]/20"
          />
        </div>
      </div>

      {activeCategory === 'All' && !searchQuery && displayedFeatured.length > 0 && (
        <div className="mb-14">
          <h3 className="text-lg font-bold text-[var(--zd-text-primary)] tracking-tight mb-6">Popular tools</h3>
          {renderGrid(displayedFeatured, 'feat-')}
          <div className="h-px bg-[var(--zd-border)] mt-12" />
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-10 pb-4 border-b border-[var(--zd-border)]">
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 no-scrollbar">
          {categories.map((cat) => (
            <Button
              key={cat}
              variant={activeCategory === cat ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setActiveCategory(cat)}
              className="whitespace-nowrap"
            >
              {cat}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-1 p-1 bg-[var(--zd-surface)] rounded-xl border border-[var(--zd-border)] shrink-0">
          <Button variant="icon" size="sm" onClick={() => setViewMode('grid')} aria-label="Grid view"
            className={viewMode === 'grid' ? '!bg-[var(--zd-surface-raised)] !text-[var(--zd-primary)] shadow-sm' : ''}>
            <LayoutGrid size={18} />
          </Button>
          <Button variant="icon" size="sm" onClick={() => setViewMode('list')} aria-label="List view"
            className={viewMode === 'list' ? '!bg-[var(--zd-surface-raised)] !text-[var(--zd-primary)] shadow-sm' : ''}>
            <List size={18} />
          </Button>
        </div>
      </div>

      <div key={activeCategory}>
        {activeCategory === 'All' && displayedFavorites.length > 0 && (
          <div className="mb-14">
            <div className="flex items-center gap-2 mb-6">
              <Star size={16} className="text-[var(--zd-primary)] fill-current" />
              <h3 className="text-lg font-bold text-[var(--zd-text-primary)]">Starred</h3>
            </div>
            {renderGrid(displayedFavorites, 'fav-')}
            <div className="h-px bg-[var(--zd-border)] mt-12" />
          </div>
        )}

        {activeCategory === 'All' && displayedRecent.length > 0 && (
          <div className="mb-14">
            <div className="flex items-center gap-2 mb-6">
              <Clock size={16} className="text-[var(--zd-primary)]" />
              <h3 className="text-lg font-bold text-[var(--zd-text-primary)]">Recently used</h3>
            </div>
            {renderGrid(displayedRecent, 'recent-')}
            <div className="h-px bg-[var(--zd-border)] mt-12" />
          </div>
        )}

        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-[var(--zd-text-primary)]">
            {activeCategory === 'All' ? 'More tools' : `${activeCategory}`}
          </h3>
          <Badge variant="outline" className="!text-xs !font-mono !normal-case">
            {displayedFiltered.length} tools
          </Badge>
        </div>

        {displayedFiltered.length === 0 ? (
          <p className="text-center py-12 text-[var(--zd-text-muted)] text-sm">No tools match your search.</p>
        ) : (
          renderGrid(displayedFiltered)
        )}
      </div>
    </section>
  );
}
