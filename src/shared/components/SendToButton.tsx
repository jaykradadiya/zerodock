import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Send, ChevronDown } from 'lucide-react';
import { usePipelineStore } from '../../core/store/usePipelineStore';
import { useNavigate } from '@tanstack/react-router';
import { motion, AnimatePresence } from 'framer-motion';

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
      <button
        ref={buttonRef}
        onClick={toggleDropdown}
        className="text-xs flex items-center gap-1.5 text-orange-600 dark:text-orange-400 hover:underline transition-colors relative"
      >
        <Send className="w-3 h-3" />
        Send to
        <ChevronDown className="w-3 h-3" />
      </button>

      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isOpen && (
            <>
              <div className="fixed inset-0 z-[100]" onClick={() => setIsOpen(false)} />
              <motion.div
                initial={{ opacity: 0, y: 5, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 5, scale: 0.95 }}
                transition={{ duration: 0.1 }}
                style={{ top: coords.top, right: coords.right }}
                className="fixed w-48 bg-[var(--zd-surface-raised)] border border-[var(--zd-border)] rounded-md shadow-lg z-[101] py-1 overflow-hidden"
              >
                {targets.map((target) => (
                  <button
                    key={target.id}
                    onClick={() => {
                      handleSend(target.route);
                      setIsOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-[var(--zd-text-secondary)] hover:text-[var(--zd-text-primary)] hover:bg-[var(--zd-primary-soft)] transition-colors focus-ring"
                  >
                    {target.name}
                  </button>
                ))}
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
