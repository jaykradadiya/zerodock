/**
 * ZeroDock Analytics Client
 *
 * Privacy-first, cookie-less analytics integration tailored for Cloudflare Web Analytics
 * and in-app anonymous telemetry without collecting PII or inspecting user input payloads.
 */

import { useEffect } from 'react';
import { useLocation } from '@tanstack/react-router';

declare global {
  interface Window {
    __cfBeacon?: {
      send?: (event: string, data?: Record<string, unknown>) => void;
      [key: string]: unknown;
    };
  }
}

export interface AnalyticsEvent {
  category: string;
  action: string;
  label?: string;
  value?: number;
}

/**
 * Dispatches an anonymous pageview signal.
 * Cloudflare Web Analytics beacon with `spa: true` hooks into pushState/Navigation API,
 * but this helper guarantees cross-environment consistency.
 */
export function trackPageView(pathname?: string, title?: string): void {
  const path = pathname || window.location.pathname;
  const pageTitle = title || document.title;

  if (import.meta.env.DEV) {
    console.debug(`[ZeroDock Analytics] PageView: ${path} — "${pageTitle}"`);
  }

  // Cloudflare Web Analytics Beacon SPA notification if available
  if (typeof window !== 'undefined' && window.__cfBeacon && typeof window.__cfBeacon.send === 'function') {
    try {
      window.__cfBeacon.send('pageview', { path, title: pageTitle });
    } catch {
      // Ignore if beacon is not ready or blocked
    }
  }
}

/**
 * Dispatches a privacy-preserving custom event.
 * Never pass sensitive content, user input data, or tokens into events.
 */
export function trackEvent(category: string, action: string, label?: string, value?: number): void {
  if (import.meta.env.DEV) {
    console.debug(`[ZeroDock Analytics] Event: [${category}] ${action}${label ? ` - ${label}` : ''}`, value ?? '');
  }

  if (typeof window !== 'undefined' && window.__cfBeacon && typeof window.__cfBeacon.send === 'function') {
    try {
      window.__cfBeacon.send('event', { category, action, label, value });
    } catch {
      // Ignore silently
    }
  }
}

/**
 * React hook that triggers a pageview track on every route location change.
 */
export function usePageTracking(): void {
  const location = useLocation();

  useEffect(() => {
    // Defer slightly to ensure document.title has been updated by route components
    const timer = setTimeout(() => {
      trackPageView(location.pathname, document.title);
    }, 50);

    return () => clearTimeout(timer);
  }, [location.pathname]);
}
