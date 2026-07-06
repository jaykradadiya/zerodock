import { lazy } from 'react';
import { Shield } from 'lucide-react';
import { ToolHubShell } from '../ToolHubShell';

const HUB_ROUTE = '/security';

const TABS = [
  { id: 'hash', label: 'Hash' },
  { id: 'jwt', label: 'JWT' },
  { id: 'rsa', label: 'RSA Keys' },
];

const HashGenerator = lazy(() => import('../../tools/hash-generator'));
const JwtDecoder = lazy(() => import('../../tools/jwt-decoder'));
const RsaGenerator = lazy(() => import('../../tools/rsa-generator'));

function SecurityHub({ initialTab = 'hash' }: { initialTab?: string }) {
  return (
    <ToolHubShell
      hubRoute={HUB_ROUTE}
      tabs={TABS}
      initialTab={initialTab}
      icon={Shield}
      title="Security Suite"
      description="Hash, decode JWTs, and generate RSA key pairs — all processed locally."
      toolId="security"
      renderContent={(tab) => {
        if (tab === 'jwt') return <JwtDecoder />;
        if (tab === 'rsa') return <RsaGenerator />;
        return <HashGenerator />;
      }}
    />
  );
}

export default SecurityHub;
export const SecurityHubJwt = () => <SecurityHub initialTab="jwt" />;
export const SecurityHubRsa = () => <SecurityHub initialTab="rsa" />;
