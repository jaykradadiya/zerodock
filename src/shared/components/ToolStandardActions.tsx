import { Maximize, Minimize } from 'lucide-react';
import { ShareLinkButton } from './ShareLinkButton';
import { Button } from './ui';
import { useUIStore } from '../../core/store/useUIStore';

export function ToolStandardActions({ showZen = true }: { showZen?: boolean }) {
  const { zenMode, setZenMode } = useUIStore();

  return (
    <>
      <ShareLinkButton />
      {showZen && (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setZenMode(!zenMode)}
          title={zenMode ? 'Exit focus mode (Esc)' : 'Focus mode (⌘.)'}
          aria-label={zenMode ? 'Exit focus mode' : 'Enter focus mode'}
        >
          {zenMode ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">{zenMode ? 'Exit' : 'Focus'}</span>
        </Button>
      )}
    </>
  );
}
