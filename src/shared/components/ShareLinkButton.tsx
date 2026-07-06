import { useState } from 'react';
import { Link2, Check } from 'lucide-react';
import { Button } from './ui';
import { useToastStore } from '../../core/store/useToastStore';
import { useToolRoute } from '../context/ToolRouteContext';

export function ShareLinkButton({ className = '' }: { className?: string }) {
  const [copied, setCopied] = useState(false);
  const addToast = useToastStore((s) => s.addToast);
  const route = useToolRoute();
  const supportsShare = route?.supportsShare ?? false;

  if (!supportsShare) return null;

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      addToast('Link copied — includes your current state', 'success');
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
      title="Copy shareable link with current state"
      aria-label="Copy shareable link"
      className={className}
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Link2 className="w-3.5 h-3.5" />}
      <span className="hidden sm:inline">Share</span>
    </Button>
  );
}
