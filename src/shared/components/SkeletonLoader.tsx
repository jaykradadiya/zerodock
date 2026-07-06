import { usePreferenceStore } from '../../core/store/usePreferenceStore';

interface SkeletonProps {
  toolName?: string;
}

export function SkeletonLoader({ toolName: _toolName }: SkeletonProps) {
  const { theme } = usePreferenceStore();
  const isDark = theme === 'dark';
  const baseColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
  const shimmerColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';

  return (
    <div className="flex-1 flex flex-col p-6 md:p-12 w-full max-w-6xl mx-auto h-full min-h-0">
      {/* Header Skeleton */}
      <div className="w-full flex items-center gap-4 mb-8 shrink-0">
        <div 
          className="w-12 h-12 rounded-xl animate-pulse"
          style={{ backgroundColor: baseColor }}
        />
        <div className="flex flex-col gap-2">
          <div className="w-48 h-6 rounded-md animate-pulse" style={{ backgroundColor: baseColor }} />
          <div className="w-64 h-4 rounded-md animate-pulse" style={{ backgroundColor: baseColor }} />
        </div>
      </div>

      {/* Main Workspace Skeleton */}
      <div 
        className="w-full flex flex-col flex-1 min-h-0 rounded-2xl border shadow-sm overflow-hidden"
        style={{ borderColor: 'var(--zd-border)', backgroundColor: 'var(--zd-bg)' }}
      >
        {/* Toolbar Skeleton */}
        <div className="p-4 border-b flex items-center justify-between shrink-0" style={{ borderColor: 'var(--zd-border)', backgroundColor: 'var(--zd-surface)' }}>
          <div className="w-32 h-8 rounded-md animate-pulse" style={{ backgroundColor: baseColor }} />
          <div className="w-24 h-8 rounded-md animate-pulse" style={{ backgroundColor: baseColor }} />
        </div>

        {/* Editor Panes Skeleton */}
        <div className="flex-1 flex w-full min-h-0 gap-1 p-1">
          <div className="flex-1 rounded-lg animate-pulse" style={{ backgroundColor: baseColor }} />
          <div className="w-[1px]" style={{ backgroundColor: 'var(--zd-border)' }} />
          <div className="flex-1 rounded-lg animate-pulse" style={{ backgroundColor: baseColor }} />
        </div>
      </div>
      
      {/* Global CSS for Shimmer */}
      <style>{`
        @keyframes shimmer {
          0% { background-position: -1000px 0; }
          100% { background-position: 1000px 0; }
        }
        .animate-pulse {
          background-image: linear-gradient(
            to right,
            ${baseColor} 0%,
            ${shimmerColor} 20%,
            ${baseColor} 40%,
            ${baseColor} 100%
          );
          background-size: 1000px 100%;
          animation: shimmer 2s infinite linear;
        }
      `}</style>
    </div>
  );
}
