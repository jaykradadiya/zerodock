import {
  createRouter,
  createRoute,
  createRootRoute,
  RouterProvider,
  Outlet,
} from '@tanstack/react-router';
import { toolRegistry } from '../registry/tools';
import { Suspense, lazy, useEffect } from 'react';
import { useGlobalStore } from '../store/useGlobalStore';
import { Navbar } from '../../landing/components/Navbar';
import { ErrorBoundary } from '../../shared/components/ErrorBoundary';

import { LandingPage } from '../../landing/LandingPage';
const LazyCommandPalette = lazy(() => import('../../shared/components/CommandPalette').then(m => ({ default: m.CommandPalette })));
const LazyStorageWarningModal = lazy(() => import('../../shared/components/StorageWarningModal').then(m => ({ default: m.StorageWarningModal })));

/*
 * RootLayout — site-wide shell.
 * The Navbar is rendered here so it persists across all routes.
 * Tool pages get a self-contained layout; the landing page renders its own footer.
 */
function RootLayout() {
  const { theme, commandPaletteOpen, setCommandPaletteOpen, storageWarning } = useGlobalStore();

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
      <Navbar />
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Outlet />
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
    </div>
  );
}

/*
 * ToolLayout — wraps individual tool pages with consistent spacing and header.
 */
function ToolLoadingFallback({ toolName }: { toolName: string }) {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--zd-text-muted)',
        fontSize: '15px',
        fontWeight: 500,
        gap: '8px',
      }}
    >
      <div
        style={{
          width: '16px',
          height: '16px',
          border: '2px solid var(--zd-border)',
          borderTopColor: 'var(--zd-primary)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }}
      />
      Loading {toolName}…
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// useEffect is imported at the top

interface SEOWrapperProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

function SEOWrapper({ title, description, children }: SEOWrapperProps) {
  useEffect(() => {
    const originalTitle = document.title;
    
    const metaDesc = document.querySelector('meta[name="description"]');
    const originalDesc = metaDesc ? metaDesc.getAttribute('content') : '';

    const ogTitle = document.querySelector('meta[property="og:title"]');
    const originalOgTitle = ogTitle ? ogTitle.getAttribute('content') : '';

    const ogDesc = document.querySelector('meta[property="og:description"]');
    const originalOgDesc = ogDesc ? ogDesc.getAttribute('content') : '';

    // Set dynamic SEO tags
    document.title = `${title} | ZeroDock`;
    if (metaDesc) metaDesc.setAttribute('content', description);
    if (ogTitle) ogTitle.setAttribute('content', `${title} | ZeroDock`);
    if (ogDesc) ogDesc.setAttribute('content', description);

    return () => {
      // Restore on unmount
      document.title = originalTitle;
      if (metaDesc && originalDesc) metaDesc.setAttribute('content', originalDesc);
      if (ogTitle && originalOgTitle) ogTitle.setAttribute('content', originalOgTitle);
      if (ogDesc && originalOgDesc) ogDesc.setAttribute('content', originalOgDesc);
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
      description="Format JSON, convert epochs, merge PDFs, generate UUIDs, encode URLs, check diffs, and inspect JWT tokens — all processed 100% locally in your browser."
    >
      <LandingPage />
    </SEOWrapper>
  ),
});

/* Dynamic routes for each registered tool */
const toolRoutes = toolRegistry.map((tool) => {
  const LazyComponent = lazy(tool.component);
  return createRoute({
    getParentRoute: () => rootRoute,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    path: tool.route as any,
    component: () => (
      <SEOWrapper
        title={tool.name}
        description={tool.metadata.description}
      >
        <Suspense fallback={<ToolLoadingFallback toolName={tool.name} />}>
          <ErrorBoundary>
            <div style={{ paddingTop: '64px', flex: 1, display: 'flex', flexDirection: 'column' }}>
              <LazyComponent />
            </div>
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
