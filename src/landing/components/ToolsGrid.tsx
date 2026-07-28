import { useState } from 'react';
import { motion } from 'framer-motion';
import { toolRegistry } from '../../core/registry/tools';
import { getLandingTools } from '../../types/tool';
import { LayoutGrid, List, type LucideIcon } from 'lucide-react';
import type { Tool } from '../../types/tool';
import { usePreferenceStore } from '../../core/store/usePreferenceStore';
import { playSound } from '../../shared/utils/sound';
import { Badge, Button, ToolCard } from '../../shared/components/ui';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.04, delayChildren: 0 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] as const } },
};

const FEATURED_ORDER = [
  'json-toolkit',
  'encode-decode',
  'security',
  'diff-checker',
  'epoch-converter',
];

/** Category → icon color so each tool visually stands apart */
const CATEGORY_ICON_STYLES: Record<string, string> = {
  Data: '!bg-[rgba(99,102,241,0.12)] !text-[#818CF8]',
  Network: '!bg-[var(--zd-accent-soft)] !text-[var(--zd-accent)]',
  Encoding: '!bg-[rgba(56,189,248,0.1)] !text-[#38BDF8]',
  Security: '!bg-[rgba(225,112,85,0.1)] !text-[#E17055]',
  Text: '!bg-[rgba(52,211,153,0.1)] !text-[#34D399]',
  Converters: '!bg-[rgba(14,165,233,0.1)] !text-[#0EA5E9]',
  Generators: '!bg-[rgba(236,72,153,0.1)] !text-[#EC4899]',
};

const allLandingTools = getLandingTools(toolRegistry);

/** Sort tools: featured first (in FEATURED_ORDER), then the rest alphabetically */
function sortTools(tools: Tool[]): Tool[] {
  return [...tools].sort((a, b) => {
    const aFeat = FEATURED_ORDER.indexOf(a.id);
    const bFeat = FEATURED_ORDER.indexOf(b.id);
    if (aFeat !== -1 && bFeat !== -1) return aFeat - bFeat;
    if (aFeat !== -1) return -1;
    if (bFeat !== -1) return 1;
    return a.name.localeCompare(b.name);
  });
}

export function ToolsGrid() {
  const { favoriteTools, viewMode, setViewMode } = usePreferenceStore();
  const [activeCategory, setActiveCategory] = useState<string>('All');

  const categories = ['All', ...Array.from(new Set(allLandingTools.map((t) => t.category)))];

  const filtered =
    activeCategory === 'All'
      ? allLandingTools
      : allLandingTools.filter((t) => t.category === activeCategory);

  const sorted = sortTools(filtered);

  const handleFavoriteToggle = (toolId: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const state = usePreferenceStore.getState();
    state.toggleFavoriteTool(toolId);
    if (state.soundEnabled) playSound('tick');
  };

  const isList = viewMode === 'list';
  const gridClass = isList
    ? 'grid-cols-1'
    : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4';

  return (
    <section
      id="tools"
      className="py-20 sm:py-28 2xl:py-36 px-4 sm:px-8 md:px-12 2xl:px-16 max-w-7xl 2xl:max-w-[1600px] 3xl:max-w-[1900px] mx-auto w-full"
    >
      {/* Section header */}
      <div className="mb-14 2xl:mb-18">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          className="flex flex-col items-start gap-3"
        >
          <span className="font-mono text-[11px] tracking-[0.14em] uppercase text-[var(--zd-primary)] font-semibold">
            The toolkit
          </span>
          <h2 className="text-3xl sm:text-5xl 2xl:text-6xl font-black tracking-[-0.03em] text-[var(--zd-text-primary)] leading-tight">
            Pick a tool. Start building.
          </h2>
          <p className="text-base sm:text-lg text-[var(--zd-text-secondary)] max-w-lg leading-relaxed">
            Every tool runs locally in your browser. No data leaves your machine.
          </p>
        </motion.div>
      </div>

      {/* Filters + view toggle */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8 pb-4 border-b border-[var(--zd-border)]">
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
        <div className="flex items-center gap-3 shrink-0">
          <Badge variant="outline" className="!text-xs !font-mono !normal-case">
            {sorted.length} tools
          </Badge>
          <div className="flex items-center gap-1 p-1 bg-[var(--zd-surface)] rounded-xl border border-[var(--zd-border)]">
            <Button
              variant="icon"
              size="sm"
              onClick={() => setViewMode('grid')}
              aria-label="Grid view"
              className={
                viewMode === 'grid'
                  ? '!bg-[var(--zd-surface-raised)] !text-[var(--zd-primary)] shadow-sm'
                  : ''
              }
            >
              <LayoutGrid size={18} />
            </Button>
            <Button
              variant="icon"
              size="sm"
              onClick={() => setViewMode('list')}
              aria-label="List view"
              className={
                viewMode === 'list'
                  ? '!bg-[var(--zd-surface-raised)] !text-[var(--zd-primary)] shadow-sm'
                  : ''
              }
            >
              <List size={18} />
            </Button>
          </div>
        </div>
      </div>

      {/* Single unified grid — featured tools first, bento layout for the hero */}
      {sorted.length === 0 ? (
        <p className="text-center py-12 text-[var(--zd-text-muted)] text-sm">
          No tools match this category.
        </p>
      ) : (
        <motion.div
          key={activeCategory}
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className={`grid gap-5 2xl:gap-6 ${gridClass}`}
        >
          {sorted.map((tool, i) => {
            /* First featured tool gets 2-col span in grid view on lg+ */
            const isHeroCard =
              i === 0 &&
              activeCategory === 'All' &&
              !isList &&
              FEATURED_ORDER.includes(tool.id);

            return (
              <motion.div
                key={tool.id}
                variants={itemVariants}
                className={isHeroCard ? 'sm:col-span-2 lg:col-span-2' : ''}
              >
              <ToolCard
                  title={tool.name}
                  description={tool.metadata.description}
                  category={tool.category}
                  tags={tool.metadata.tags.slice(0, isHeroCard ? 3 : 2)}
                  route={tool.route}
                  icon={tool.icon as LucideIcon}
                  viewMode={viewMode}
                  isFavorite={favoriteTools.includes(tool.id)}
                  onFavoriteToggle={handleFavoriteToggle(tool.id)}
                  iconClassName={CATEGORY_ICON_STYLES[tool.category]}
                />
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </section>
  );
}
