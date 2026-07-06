export interface ToolkitPanelProps {
  sourceJson: string;
  onApplyJson?: (json: string) => void;
  onClose?: () => void;
}
