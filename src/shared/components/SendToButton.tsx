import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Send, ChevronDown } from 'lucide-react';
import { usePipelineStore } from '../../core/store/usePipelineStore';
import { useNavigate } from '@tanstack/react-router';
import { Button } from './ui';

interface TargetTool {
  id: string;
  name: string;
  route: string;
}

interface SendToButtonProps {
  data: string;
  targets: TargetTool[];
}

export function SendToButton({ data, targets }: SendToButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, right: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  
  const { setPipelineData } = usePipelineStore();
  const navigate = useNavigate();

  const handleSend = (route: string) => {
    setPipelineData(data);
    navigate({ to: route as any });
  };

  const toggleDropdown = () => {
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + 4,
        right: window.innerWidth - rect.right
      });
    }
    setIsOpen(!isOpen);
  };

  return (
    <>
      <Button
        ref={buttonRef}
        variant="ghost"
        size="sm"
        onClick={toggleDropdown}
        className="!px-0 !py-0 !border-0"
      >
        <Send className="w-3 h-3" />
        Send to
        <ChevronDown className="w-3 h-3" />
      </Button>

      {typeof document !== 'undefined' && createPortal(
        <>
          {isOpen && (
            <>
              <div className="fixed inset-0 z-[100]" onClick={() => setIsOpen(false)} aria-hidden />
              <div
                style={{ top: coords.top, right: coords.right }}
                className="fixed w-48 bg-[var(--zd-surface-raised)] border border-[var(--zd-border)] rounded-md shadow-lg z-[101] py-1 overflow-hidden"
              >
                {targets.map((target) => (
                  <Button
                    key={target.id}
                    variant="ghost"
                    onClick={() => {
                      handleSend(target.route);
                      setIsOpen(false);
                    }}
                    className="w-full !justify-start !rounded-none !border-0 px-3 py-2 text-sm"
                  >
                    {target.name}
                  </Button>
                ))}
              </div>
            </>
          )}
        </>,
        document.body
      )}
    </>
  );
}
