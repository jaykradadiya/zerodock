import {
  createRouter,
  createRoute,
  createRootRoute,
  RouterProvider,
  Outlet,
  useLocation,
} from '@tanstack/react-router';
import { toolRegistry } from '../registry/tools';
import { Suspense, lazy, useEffect } from 'react';
import { Minimize } from 'lucide-react';
import { useUIStore } from '../store/useUIStore';
import { usePreferenceStore } from '../store/usePreferenceStore';
import { Navbar } from '../../landing/components/Navbar';
import { ErrorBoundary } from '../../shared/components/ErrorBoundary';
import { ToastContainer } from '../../shared/components/ToastContainer';
import { SkeletonLoader } from '../../shared/components/SkeletonLoader';
import { SkipLink } from '../../shared/components/SkipLink';
import { ToolRouteShell } from '../../shared/components/ToolRouteShell';
import { KeyboardShortcutsHelp } from '../../shared/components/KeyboardShortcutsHelp';
import { usePageTracking } from '../analytics';


import { LandingPage } from '../../landing/LandingPage';

const lazyRetry = (componentImport: () => Promise<any>) =>
  lazy(async () => {
    const pageHasAlreadyBeenForceRefreshed = JSON.parse(
      window.sessionStorage.getItem('page-has-been-force-refreshed') || 'false'
    );

    try {
      const component = await componentImport();
      window.sessionStorage.setItem('page-has-been-force-refreshed', 'false');
      return component;
    } catch (error) {
      if (!pageHasAlreadyBeenForceRefreshed) {
        window.sessionStorage.setItem('page-has-been-force-refreshed', 'true');
        return window.location.reload();
      }
      throw error;
    }
  });

const LazyCommandPalette = lazyRetry(() => import('../../shared/components/CommandPalette').then(m => ({ default: m.CommandPalette })));
const LazyStorageWarningModal = lazyRetry(() => import('../../shared/components/StorageWarningModal').then(m => ({ default: m.StorageWarningModal })));
const LazyThemeModal = lazyRetry(() => import('../../shared/components/ThemeModal').then(m => ({ default: m.ThemeModal })));
const LazyFeedbackModal = lazyRetry(() => import('../../shared/components/FeedbackModal').then(m => ({ default: m.FeedbackModal })));

/*
 * RootLayout — site-wide shell.
 * The Navbar is rendered here so it persists across all routes.
 * Tool pages get a self-contained layout; the landing page renders its own footer.
 */
function RootLayout() {
  usePageTracking();

  const {
    commandPaletteOpen,
    setCommandPaletteOpen,
    themeModalOpen,
    setThemeModalOpen,
    feedbackModalOpen,
    storageWarning,
    zenMode,
    setZenMode,
  } = useUIStore();
  const location = useLocation();
  const isLandingPage = location.pathname === '/';

  // Toggle Command Palette globally & VS Code Cmd+K Cmd+T theme chord
  useEffect(() => {
    let kPressedTimestamp = 0;
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMeta = e.metaKey || e.ctrlKey;
      if (isMeta && e.key.toLowerCase() === 'k') {
        kPressedTimestamp = Date.now();
        e.preventDefault();
        setCommandPaletteOpen(!commandPaletteOpen);
      } else if (isMeta && e.key.toLowerCase() === 't' && Date.now() - kPressedTimestamp < 1500) {
        e.preventDefault();
        kPressedTimestamp = 0;
        setCommandPaletteOpen(false);
        setThemeModalOpen(true, 'browse');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [commandPaletteOpen, setCommandPaletteOpen, setThemeModalOpen]);

  return (
    <div
      style={{
        minHeight: '100vh',
        height: isLandingPage ? undefined : '100vh',
        maxHeight: isLandingPage ? undefined : '100vh',
        overflow: isLandingPage ? 'visible' : 'hidden',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'var(--font-sans)',
        backgroundColor: 'var(--zd-bg)',
        color: 'var(--zd-text-secondary)',
        transition: 'background-color 0.3s ease, color 0.3s ease',
      }}
      className="w-full flex-1 flex flex-col min-h-0"
    >
      <SkipLink />
      {!zenMode && <Navbar />}
      {zenMode && (
        <button
          type="button"
          onClick={() => setZenMode(false)}
          title="Exit Focus Mode (Esc)"
          aria-label="Exit Focus Mode"
          className="fixed top-3 right-3 z-50 flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--zd-border)] bg-[var(--zd-surface)]/90 hover:bg-[var(--zd-surface-raised)] backdrop-blur-md text-[var(--zd-text-secondary)] hover:text-[var(--zd-text-primary)] hover:border-[var(--zd-border-hover)] text-xs font-semibold shadow-lg transition-all cursor-pointer"
        >
          <Minimize className="w-3.5 h-3.5 text-[var(--zd-primary)]" />
          <span>Exit Focus</span>
          <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--zd-bg)] border border-[var(--zd-border)] text-[var(--zd-text-muted)] font-mono ml-0.5">Esc</kbd>
        </button>
      )}
      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          boxSizing: 'border-box',
          paddingTop: zenMode ? 0 : '3.5rem',
          height: isLandingPage ? undefined : '100vh',
          maxHeight: isLandingPage ? undefined : '100vh',
          overflow: isLandingPage ? 'visible' : 'hidden',
        }}
      >
        <div className="flex flex-1 min-h-0 flex-col h-full overflow-hidden">
          <Outlet />
        </div>
      </main>
      {commandPaletteOpen && (
        <Suspense fallback={null}>
          <LazyCommandPalette />
        </Suspense>
      )}
      {storageWarning?.isOpen && (
        <Suspense fallback={null}>
          <LazyStorageWarningModal />
        </Suspense>
      )}
      {themeModalOpen && (
        <Suspense fallback={null}>
          <LazyThemeModal />
        </Suspense>
      )}
      {feedbackModalOpen && (
        <Suspense fallback={null}>
          <LazyFeedbackModal />
        </Suspense>
      )}
      <ToastContainer />
      <KeyboardShortcutsHelp />
    </div>
  );
}

/*
 * ToolLoadingFallback is now handled by SkeletonLoader
 */

// useEffect is imported at the top

interface SEOWrapperProps {
  title: string;
  description: string;
  toolId?: string;
  children: React.ReactNode;
}

function SEOWrapper({ title, description, toolId, children }: SEOWrapperProps) {
  const { addRecentTool } = usePreferenceStore();

  useEffect(() => {
    if (toolId) {
      addRecentTool(toolId);
    }
  }, [toolId, addRecentTool]);

  useEffect(() => {
    const originalTitle = document.title;
    
    const metaDesc = document.querySelector('meta[name="description"]');
    const originalDesc = metaDesc ? metaDesc.getAttribute('content') : '';

    const ogTitle = document.querySelector('meta[property="og:title"]');
    const originalOgTitle = ogTitle ? ogTitle.getAttribute('content') : '';

    const ogDesc = document.querySelector('meta[property="og:description"]');
    const originalOgDesc = ogDesc ? ogDesc.getAttribute('content') : '';

    const ogUrl = document.querySelector('meta[property="og:url"]');
    const originalOgUrl = ogUrl ? ogUrl.getAttribute('content') : '';

    document.title = `${title} | ZeroDock`;
    if (metaDesc) metaDesc.setAttribute('content', description);
    if (ogTitle) ogTitle.setAttribute('content', `${title} | ZeroDock`);
    if (ogDesc) ogDesc.setAttribute('content', description);
    if (ogUrl) ogUrl.setAttribute('content', window.location.href);

    return () => {
      document.title = originalTitle;
      if (metaDesc && originalDesc) metaDesc.setAttribute('content', originalDesc);
      if (ogTitle && originalOgTitle) ogTitle.setAttribute('content', originalOgTitle);
      if (ogDesc && originalOgDesc) ogDesc.setAttribute('content', originalOgDesc);
      if (ogUrl && originalOgUrl) ogUrl.setAttribute('content', originalOgUrl);
    };
  }, [title, description]);

  return <>{children}</>;
}

/* ──────────────── Route Tree ──────────────── */

const rootRoute = createRootRoute({
  component: RootLayout,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: () => (
    <SEOWrapper
      title="Privacy-First JSON Developer Workspace & Toolkit"
      description="Format, validate, explore, query, and diff JSON with real-time feedback — all processed 100% locally in your browser."
    >
      <LandingPage />
    </SEOWrapper>
  ),
});

/* Dynamic routes for each registered tool */
const toolRoutes = toolRegistry.map((tool) => {
  const LazyComponent = lazyRetry(tool.component);
  return createRoute({
    getParentRoute: () => rootRoute,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    path: tool.route as any,
    component: () => (
      <SEOWrapper
        title={tool.name}
        description={tool.metadata.description}
        toolId={tool.id}
      >
        <Suspense fallback={<SkeletonLoader toolName={tool.name} />}>
          <ErrorBoundary>
            <ToolRouteShell toolId={tool.id}>
              <LazyComponent />
            </ToolRouteShell>
          </ErrorBoundary>
        </Suspense>
      </SEOWrapper>
    ),
  });
});


const routeTree = rootRoute.addChildren([indexRoute, ...toolRoutes]);

export const router = createRouter({ routeTree });

export function AppRouter() {
  return <RouterProvider router={router} />;
}
