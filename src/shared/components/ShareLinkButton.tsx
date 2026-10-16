import { useState } from 'react';
import { Link2, Check } from 'lucide-react';
import { useLocation } from '@tanstack/react-router';
import { Button } from './ui';
import { useToastStore } from '../../core/store/useToastStore';
import { useToolRoute } from '../context/ToolRouteContext';
import { toolRegistry } from '../../core/registry/tools';

export function ShareLinkButton({
  className = '',
  supportsShareOverride,
}: {
  className?: string;
  supportsShareOverride?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const addToast = useToastStore((s) => s.addToast);
  const route = useToolRoute();
  const location = useLocation();

  const activeTool = toolRegistry.find(
    (t) => t.route === location.pathname || (t.route !== '/' && location.pathname.startsWith(t.route))
  );

  const supportsShare = supportsShareOverride ?? route?.supportsShare ?? (activeTool ? (activeTool.metadata.supportsShare ?? true) : false);

  if (!supportsShare) return null;

  const handleShare = async () => {
    try {
      // Workspace contents deliberately stay out of URLs. They can include private
      // data and make links too long for browsers and messaging clients.
      const cleanUrl = `${window.location.origin}${window.location.pathname}${window.location.search}`;
      await navigator.clipboard.writeText(cleanUrl);
      setCopied(true);
      addToast('Clean link copied', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      addToast('Could not copy link', 'error');
    }
  };

  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={handleShare}
      title="Copy clean shareable link"
      aria-label="Copy shareable link"
      className={className}
    >
      {copied ? <Check className="w-3.5 h-3.5 text-[var(--zd-success)]" /> : <Link2 className="w-3.5 h-3.5" />}
      <span className="hidden sm:inline">Share</span>
    </Button>
  );
}
