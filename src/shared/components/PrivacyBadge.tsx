import { Globe2, LockKeyhole, Network } from 'lucide-react';
import type { ToolProcessing } from '../../types/tool';
import { Badge } from './ui/Badge';

export function PrivacyBadge({ processing }: { processing: ToolProcessing }) {
  const isLocal = processing.mode === 'LOCAL';
  const Icon = isLocal ? LockKeyhole : processing.mode === 'NETWORK' ? Globe2 : Network;
  const label = isLocal ? 'Local' : processing.mode === 'NETWORK' ? 'Network' : 'Mixed';

  return (
    <span title={processing.networkDetail || 'Processed in your browser.'}>
      <Badge variant={isLocal ? 'primary' : 'accent'} className="gap-1.5 normal-case tracking-normal">
        <Icon className="w-3 h-3" aria-hidden />
        {label}
      </Badge>
    </span>
  );
}
