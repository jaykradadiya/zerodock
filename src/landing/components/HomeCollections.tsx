import { Link } from '@tanstack/react-router';
import { Clock3, Star } from 'lucide-react';
import type { ElementType } from 'react';
import { toolRegistry } from '../../core/registry/tools';
import { usePreferenceStore } from '../../core/store/usePreferenceStore';

function ToolCollection({ title, icon: Icon, toolIds }: { title: string; icon: typeof Star; toolIds: string[] }) {
  const tools = toolIds
    .map((id) => toolRegistry.find((tool) => tool.id === id))
    .filter(Boolean)
    .slice(0, 3);
  if (!tools.length) return null;

  return (
    <section aria-labelledby={`${title.toLowerCase()}-tools`} className="mb-8">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 text-[var(--zd-primary)]" aria-hidden />
        <h2 id={`${title.toLowerCase()}-tools`} className="text-sm font-semibold text-[var(--zd-text-primary)]">{title}</h2>
        <span className="font-mono text-xs text-[var(--zd-text-muted)]">local only</span>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {tools.map((tool) => (
          <Link
            key={tool!.id}
            to={tool!.route as '/'}
            className="focus-ring group flex min-w-0 items-center gap-3 rounded-xl border border-[var(--zd-border)] bg-[var(--zd-surface)] px-3 py-3 no-underline transition-colors hover:border-[var(--zd-border-glow)] hover:bg-[var(--zd-primary-soft)]"
          >
            <CollectionIcon icon={tool!.icon} />
            <span className="truncate text-sm font-medium text-[var(--zd-text-primary)] group-hover:text-[var(--zd-primary)]">{tool!.name}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function CollectionIcon({ icon: Icon }: { icon: ElementType | undefined }) {
  return Icon ? <Icon className="h-4 w-4 shrink-0 text-[var(--zd-primary)]" aria-hidden /> : null;
}

export function HomeCollections() {
  const { favoriteTools, recentTools } = usePreferenceStore();
  if (!favoriteTools.length && !recentTools.length) return null;
  return (
    <div className="mb-10">
      <ToolCollection title="Favorites" icon={Star} toolIds={favoriteTools} />
      <ToolCollection title="Recent" icon={Clock3} toolIds={recentTools} />
    </div>
  );
}
