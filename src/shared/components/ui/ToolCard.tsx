import { Link } from '@tanstack/react-router';
import type { LucideIcon } from 'lucide-react';
import { ChevronRight, Star } from 'lucide-react';
import { motion, type Variants } from 'framer-motion';
import { IconBox } from './IconBox';
import { Badge } from './Badge';
import { cn } from './cn';

interface ToolCardProps {
  title: string;
  description?: string;
  category?: string;
  tags?: string[];
  route: string;
  icon: LucideIcon;
  isFavorite?: boolean;
  onFavoriteToggle?: (e: React.MouseEvent) => void;
  viewMode?: 'grid' | 'list';
  className?: string;
  variants?: Variants;
}

export function ToolCard({
  title,
  description,
  category,
  tags,
  route,
  icon,
  isFavorite = false,
  onFavoriteToggle,
  viewMode = 'grid',
  className = '',
  variants,
}: ToolCardProps) {
  const isList = viewMode === 'list';

  return (
    <Link to={route as '/'} className="no-underline block h-full group">
      <motion.div
        variants={variants}
        className={cn(
          'relative p-5 rounded-2xl bg-[var(--zd-surface)] border border-[var(--zd-border)] h-full flex',
          'shadow-[var(--zd-shadow-sm)]',
          'transition-[transform,box-shadow,border-color] duration-150 ease-out',
          'hover:-translate-y-0.5 hover:shadow-[var(--zd-shadow-md)] hover:border-[var(--zd-primary)]/35',
          'active:translate-y-0 active:scale-[0.99] active:duration-75',
          isList ? 'flex-row items-center gap-6' : 'flex-col justify-between',
          className
        )}
      >
        <div className={cn('flex flex-col flex-1', isList ? 'gap-2' : 'gap-4')}>
          <div className="flex items-start justify-between">
            <IconBox
              icon={icon}
              size="sm"
              className="transition-colors duration-150 group-hover:bg-[var(--zd-primary)] group-hover:text-white"
            />

            {onFavoriteToggle && (
              <button
                onClick={onFavoriteToggle}
                aria-label="Toggle favorite"
                className={cn(
                  'p-2 rounded-lg transition-colors duration-150 cursor-pointer',
                  isFavorite
                    ? 'text-[var(--zd-primary)] hover:bg-[var(--zd-primary-soft)]'
                    : 'text-[var(--zd-text-muted)] opacity-0 group-hover:opacity-100 hover:text-[var(--zd-text-secondary)] hover:bg-[var(--zd-surface-raised)]'
                )}
              >
                <Star size={16} className={isFavorite ? 'fill-current' : ''} />
              </button>
            )}
          </div>

          <div>
            <h3 className="text-base font-bold text-[var(--zd-text-primary)] group-hover:text-[var(--zd-primary)] transition-colors duration-150 tracking-tight m-0 mb-1.5">
              {title}
            </h3>
            {description && (
              <p className="text-xs sm:text-sm text-[var(--zd-text-muted)] leading-relaxed line-clamp-2 m-0">
                {description}
              </p>
            )}
          </div>
        </div>

        <div
          className={cn(
            'flex items-center justify-between pt-4 mt-4 border-t border-[var(--zd-border)]/60',
            isList && 'pt-0 mt-0 border-t-0 shrink-0 min-w-[200px]'
          )}
        >
          <div className="flex items-center gap-1.5 flex-wrap">
            {category && <Badge variant="outline">{category}</Badge>}
            {tags?.map((tag) => (
              <span
                key={tag}
                className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--zd-surface-raised)] text-[var(--zd-text-muted)]"
              >
                #{tag}
              </span>
            ))}
          </div>
          <ChevronRight className="w-4 h-4 text-[var(--zd-text-muted)] group-hover:text-[var(--zd-primary)] group-hover:translate-x-0.5 transition-[color,transform] duration-150 shrink-0" />
        </div>
      </motion.div>
    </Link>
  );
}
