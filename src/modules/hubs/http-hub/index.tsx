import { lazy } from 'react';
import { Network } from 'lucide-react';
import { ToolHubShell } from '../ToolHubShell';

const HUB_ROUTE = '/http';

const TABS = [
  { id: 'tester', label: 'API Tester' },
  { id: 'curl', label: 'cURL Converter' },
];

const ApiTester = lazy(() => import('../../tools/api-tester'));
const CurlConverter = lazy(() => import('../../tools/curl-converter'));

function HttpHub({ initialTab = 'tester' }: { initialTab?: string }) {
  return (
    <ToolHubShell
      hubRoute={HUB_ROUTE}
      tabs={TABS}
      initialTab={initialTab}
      icon={Network}
      title="HTTP Workshop"
      description="Test APIs and convert cURL commands to code — client-side HTTP tooling."
      toolId="http"
      fullWidth
      renderContent={(tab) => (
        tab === 'curl' ? <CurlConverter /> : <ApiTester />
      )}
    />
  );
}

export default HttpHub;
export const HttpHubCurl = () => <HttpHub initialTab="curl" />;
