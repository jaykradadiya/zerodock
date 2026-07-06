import { Suspense, lazy, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { FileJson } from 'lucide-react';
import { ToolPage, ToolHeader, ToolWorkspace } from '../../../shared/components/ToolLayout';
import { ToolEmbedProvider } from '../../../shared/context/ToolEmbedContext';
import type { ToolkitPanel } from '../../../shared/hooks/useToolkitPanel';

const JsonToolkit = lazy(() => import('../../tools/json-toolkit'));

function JsonToolkitRedirect({ panel }: { panel: ToolkitPanel }) {
  const navigate = useNavigate();
  useEffect(() => {
    navigate({ to: '/json-toolkit', search: { panel }, replace: true });
  }, [navigate, panel]);
  return null;
}

function JsonHub() {
  return (
    <ToolPage fullWidth>
      <ToolHeader
        icon={FileJson}
        title="JSON Toolkit"
        description="Format, validate, and explore JSON — convert YAML, generate types, and query with JMESPath in one workspace."
        toolId="json-toolkit"
      />
      <ToolWorkspace>
        <ToolEmbedProvider embedded>
          <Suspense fallback={null}>
            <div className="zd-tool-fill">
              <JsonToolkit />
            </div>
          </Suspense>
        </ToolEmbedProvider>
      </ToolWorkspace>
    </ToolPage>
  );
}

export default JsonHub;
export const JsonHubYaml = () => <JsonToolkitRedirect panel="yaml" />;
export const JsonHubTypes = () => <JsonToolkitRedirect panel="types" />;
export const JsonHubPath = () => <JsonToolkitRedirect panel="path" />;
