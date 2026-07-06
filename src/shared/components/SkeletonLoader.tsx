interface SkeletonProps {
  toolName?: string;
}

export function SkeletonLoader({ toolName: _toolName }: SkeletonProps) {
  const baseColor = 'var(--zd-surface-raised)';

  return (
    <div className="flex-1 flex flex-col items-center p-3 sm:p-4 xl:p-8 w-full max-w-7xl mx-auto h-full min-h-0">
      <div className="w-full flex items-center gap-4 mb-6 shrink-0">
        <div className="w-12 h-12 rounded-xl zd-icon-ring animate-pulse opacity-60" />
        <div className="flex flex-col gap-2 flex-1">
          <div className="w-48 h-7 rounded-lg animate-pulse" style={{ backgroundColor: baseColor }} />
          <div className="w-72 h-4 rounded-md animate-pulse opacity-70" style={{ backgroundColor: baseColor }} />
        </div>
      </div>

      <div className="w-full flex flex-col flex-1 min-h-0 zd-workspace">
        <div className="px-4 py-3 border-b border-[var(--zd-border)] bg-[var(--zd-surface-raised)] flex justify-between">
          <div className="w-36 h-8 rounded-lg animate-pulse" style={{ backgroundColor: baseColor }} />
          <div className="w-24 h-8 rounded-lg animate-pulse" style={{ backgroundColor: baseColor }} />
        </div>
        <div className="flex-1 flex flex-col md:flex-row min-h-0">
          <div className="flex-1 border-b md:border-b-0 md:border-r border-[var(--zd-border)] m-3 rounded-xl animate-pulse min-h-[200px]" style={{ backgroundColor: baseColor }} />
          <div className="flex-1 m-3 rounded-xl animate-pulse min-h-[200px]" style={{ backgroundColor: baseColor }} />
        </div>
      </div>
    </div>
  );
}
