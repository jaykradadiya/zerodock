import {
  createRouter,
  createRoute,
  createRootRoute,
  RouterProvider,
  Outlet,
} from '@tanstack/react-router';
import { toolRegistry } from '../registry/tools';
import { Suspense, lazy, useEffect } from 'react';
import { useUIStore } from '../store/useUIStore';
import { usePreferenceStore } from '../store/usePreferenceStore';
import { Navbar } from '../../landing/components/Navbar';
import { ErrorBoundary } from '../../shared/components/ErrorBoundary';
import { ToastContainer } from '../../shared/components/ToastContainer';
import { SkeletonLoader } from '../../shared/components/SkeletonLoader';
import { SkipLink } from '../../shared/components/SkipLink';
import { ToolRouteShell } from '../../shared/components/ToolRouteShell';
import { KeyboardShortcutsHelp } from '../../shared/components/KeyboardShortcutsHelp';


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

/*
 * RootLayout — site-wide shell.
 * The Navbar is rendered here so it persists across all routes.
 * Tool pages get a self-contained layout; the landing page renders its own footer.
 */
function RootLayout() {
  const { theme } = usePreferenceStore();
  const { commandPaletteOpen, setCommandPaletteOpen, storageWarning, zenMode } = useUIStore();

  // Toggle Command Palette globally
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(!commandPaletteOpen);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [commandPaletteOpen, setCommandPaletteOpen]);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'var(--font-sans)',
        backgroundColor: 'var(--zd-bg)',
        color: 'var(--zd-text-secondary)',
        transition: 'background-color 0.3s ease, color 0.3s ease',
      }}
      className={theme === 'dark' ? 'dark' : ''}
    >
      <SkipLink />
      {!zenMode && <Navbar />}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', paddingTop: zenMode ? 0 : '4rem', minHeight: zenMode ? '100vh' : 'calc(100vh - 4rem)' }} className={!zenMode ? '2xl:pt-[4.5rem] 2xl:[min-height:calc(100vh-4.5rem)]' : ''}>
        <div className="flex flex-1 min-h-0 flex-col">
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
      title="Privacy-First Web Utility & Developer Toolbox"
      description="Format JSON, test APIs, convert epochs, encode URLs, check diffs, and inspect JWT tokens — all processed 100% locally in your browser."
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
