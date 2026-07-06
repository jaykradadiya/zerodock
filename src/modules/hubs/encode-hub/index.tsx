import { lazy } from 'react';
import { Binary } from 'lucide-react';
import { ToolHubShell } from '../ToolHubShell';

const HUB_ROUTE = '/encode-decode';

const TABS = [
  { id: 'base64', label: 'Base64' },
  { id: 'url', label: 'URL' },
];

const Base64Codec = lazy(() => import('../../tools/base64-codec'));
const UrlEncoder = lazy(() => import('../../tools/url-encoder'));

function EncodeHub({ initialTab = 'base64' }: { initialTab?: string }) {
  return (
    <ToolHubShell
      hubRoute={HUB_ROUTE}
      tabs={TABS}
      initialTab={initialTab}
      icon={Binary}
      title="Encode / Decode"
      description="Encode and decode Base64 strings and URL components — entirely in your browser."
      toolId="encode-decode"
      renderContent={(tab) => (
        tab === 'url' ? <UrlEncoder /> : <Base64Codec />
      )}
    />
  );
}

export default EncodeHub;
export const EncodeHubUrl = () => <EncodeHub initialTab="url" />;
