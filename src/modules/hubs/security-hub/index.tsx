import { lazy } from 'react';
import { Shield } from 'lucide-react';
import { ToolHubShell } from '../ToolHubShell';

const HUB_ROUTE = '/security';

const TABS = [
  { id: 'hash', label: 'Hash' },
  { id: 'jwt', label: 'JWT' },
];

const HashGenerator = lazy(() => import('../../tools/hash-generator'));
const JwtDecoder = lazy(() => import('../../tools/jwt-decoder'));

function SecurityHub({ initialTab = 'hash' }: { initialTab?: string }) {
  return (
    <ToolHubShell
      hubRoute={HUB_ROUTE}
      tabs={TABS}
      initialTab={initialTab}
      icon={Shield}
      title="Security Suite"
      description="Hash strings and decode JWTs — all processed locally."
      toolId="security"
      renderContent={(tab) => {
        if (tab === 'jwt') return <JwtDecoder />;
        return <HashGenerator />;
      }}
    />
  );
}

export default SecurityHub;
export const SecurityHubJwt = () => <SecurityHub initialTab="jwt" />;
