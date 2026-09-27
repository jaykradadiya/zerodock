import React, { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  FileJson,
  X,
  Columns2,
  Rows,
  ArrowLeftRight,
  GripVertical,
  GripHorizontal,
} from 'lucide-react';
import { CodeEditor } from '../../../../shared/components/CodeEditor';
import { cn } from '../../../../shared/components/ui';
import type { FileTab } from '../store/workspaceStore';
import { JsonTabBar } from './JsonTabBar';
import { JsonPaneToolbar, type PaneViewMode } from './JsonPaneToolbar';
import { TreeView } from './TreeView';
import { TableView } from './TableView';
import { PathPanel } from '../panels/PathPanel';
import { SchemaPanel } from './SchemaPanel';
import type { ValidationError } from '../validate.worker';

export interface SplitEditorViewProps {
  primaryTabId: string | null;
  secondaryTabId: string | null;
  primaryContent?: string;
  secondaryContent?: string;
  allTabs: FileTab[];
  group1Tabs: FileTab[];
  group2Tabs: FileTab[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  primaryEditorRef?: React.MutableRefObject<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  secondaryEditorRef?: React.MutableRefObject<any>;
  focusedPane: 'primary' | 'secondary';
  onFocusPane: (pane: 'primary' | 'secondary') => void;
  onPrimaryChange?: (val?: string) => void;
  onSecondaryChange?: (val?: string) => void;
  onSelectPrimaryTab: (tabId: string) => void;
  onSelectSecondaryTab: (tabId: string) => void;
  onAddTab: (group: 1 | 2) => void;
  onCloseTab: (id: string, group: 1 | 2) => void;
  onRenameTab: (id: string, newName: string) => void;
  editingTabId: string | null;
  setEditingTabId: (id: string | null) => void;
  editingTabName: string;
  setEditingTabName: (name: string) => void;
  onMoveToOtherGroup?: (id: string, currentGroup: 1 | 2) => void;
  splitDirection: 'horizontal' | 'vertical';
  onToggleSplitDirection: () => void;
  onSwapPanes: () => void;
  onCloseSplit: () => void;
  splitRatio: number;
  onSplitRatioChange: (ratio: number) => void;
  // Toolbar format / processing
  isProcessing?: boolean;
  onProcessJson?: (pane: 'primary' | 'secondary', action: 'format' | 'minify') => void;
  onRepairJson?: (pane: 'primary' | 'secondary') => void;
  indent?: number | 'tab';
  sortKeys?: boolean;
  smartFormat?: boolean;
  onIndentChange?: (val: number | 'tab') => void;
  onSortKeysChange?: (val: boolean) => void;
  onSmartFormatChange?: (val: boolean) => void;
  // Schema validation
  schema?: string;
  onSchemaChange?: (val: string) => void;
  validationErrors?: ValidationError[];
  isValidating?: boolean;
  onInferSchema?: () => void;
  onJumpToError?: (err: ValidationError) => void;
}

export function SplitEditorView({
  primaryTabId,
  secondaryTabId,
  primaryContent = '',
  secondaryContent = '',
  allTabs,
  group1Tabs,
  group2Tabs,
  primaryEditorRef,
  secondaryEditorRef,
  focusedPane,
  onFocusPane,
  onPrimaryChange,
  onSecondaryChange,
  onSelectPrimaryTab,
  onSelectSecondaryTab,
  onAddTab,
  onCloseTab,
  onRenameTab,
  editingTabId,
  setEditingTabId,
  editingTabName,
  setEditingTabName,
  onMoveToOtherGroup,
  splitDirection,
  onToggleSplitDirection,
  onSwapPanes,
  onCloseSplit,
  splitRatio,
  onSplitRatioChange,
  isProcessing = false,
  onProcessJson,
  onRepairJson,
  indent = 2,
  sortKeys = false,
  smartFormat = false,
  onIndentChange = () => {},
  onSortKeysChange = () => {},
  onSmartFormatChange = () => {},
  schema = '',
  onSchemaChange = () => {},
  validationErrors = [],
  isValidating = false,
  onInferSchema = () => {},
  onJumpToError = () => {},
}: SplitEditorViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [mobileActivePane, setMobileActivePane] = useState<'primary' | 'secondary'>('primary');

  // Individual pane view modes (Editor / Tree / Table / Path)
  const [primaryView, setPrimaryView] = useState<PaneViewMode>('editor');
  const [secondaryView, setSecondaryView] = useState<PaneViewMode>('editor');

  // Individual pane schema panels
  const [showPrimarySchema, setShowPrimarySchema] = useState(false);
  const [showSecondarySchema, setShowSecondarySchema] = useState(false);

  const primaryTab = allTabs.find((t) => t.id === primaryTabId);
  const secondaryTab = allTabs.find((t) => t.id === secondaryTabId) || primaryTab;

  // Handle Resizer Dragging
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      setIsDragging(true);

      const startX = e.clientX;
      const startY = e.clientY;
      const startRatio = splitRatio;
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const handlePointerMove = (moveEvent: PointerEvent) => {
        if (!rect) return;
        const delta =
          splitDirection === 'horizontal'
            ? moveEvent.clientX - startX
            : moveEvent.clientY - startY;
        const totalSize = splitDirection === 'horizontal' ? rect.width : rect.height;
        const deltaPercent = (delta / totalSize) * 100;
        const newRatio = startRatio + deltaPercent;
        onSplitRatioChange(Math.min(85, Math.max(15, newRatio)));
      };

      const handlePointerUp = () => {
        setIsDragging(false);
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
      };

      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    },
    [splitDirection, splitRatio, onSplitRatioChange]
  );

  const handleResetRatio = useCallback(() => {
    onSplitRatioChange(50);
  }, [onSplitRatioChange]);

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative flex-1 min-h-0 min-w-0 w-full h-full flex overflow-hidden bg-[var(--zd-bg)] select-none',
        splitDirection === 'horizontal' ? 'flex-col md:flex-row' : 'flex-col'
      )}
    >
      {/* Invisible overlay while dragging to prevent iframe/monaco event-swallowing */}
      {isDragging && (
        <div
          className={cn(
            'fixed inset-0 z-50 select-none',
            splitDirection === 'horizontal' ? 'cursor-col-resize' : 'cursor-row-resize'
          )}
        />
      )}

      {/* Mobile Segmented Pane Switcher (only shown on small screens) */}
      <div className="flex md:hidden items-center justify-between px-3 py-1.5 bg-[var(--zd-surface-raised)] border-b border-[var(--zd-border)] shrink-0 z-20">
        <div className="flex items-center gap-1 bg-[var(--zd-surface)] p-0.5 rounded-lg border border-[var(--zd-border)] flex-1 mr-2">
          <button
            type="button"
            onClick={() => {
              setMobileActivePane('primary');
              onFocusPane('primary');
            }}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-1 px-2 rounded-md text-xs font-medium transition-colors cursor-pointer',
              mobileActivePane === 'primary'
                ? 'bg-[var(--zd-primary-soft)] text-[var(--zd-primary)] font-semibold shadow-2xs'
                : 'text-[var(--zd-text-muted)] hover:text-[var(--zd-text-primary)]'
            )}
          >
            <FileJson className="w-3.5 h-3.5 text-[var(--zd-primary)]" />
            <span className="truncate max-w-[120px]">{primaryTab?.name || 'Editor 1'}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMobileActivePane('secondary');
              onFocusPane('secondary');
            }}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-1 px-2 rounded-md text-xs font-medium transition-colors cursor-pointer',
              mobileActivePane === 'secondary'
                ? 'bg-[var(--zd-primary-soft)] text-[var(--zd-primary)] font-semibold shadow-2xs'
                : 'text-[var(--zd-text-muted)] hover:text-[var(--zd-text-primary)]'
            )}
          >
            <FileJson className="w-3.5 h-3.5 text-[var(--zd-primary)]" />
            <span className="truncate max-w-[120px]">{secondaryTab?.name || 'Editor 2'}</span>
          </button>
        </div>
        <button
          type="button"
          onClick={onCloseSplit}
          title="Close split mode"
          aria-label="Close split mode"
          className="p-1.5 text-[var(--zd-text-muted)] hover:text-[var(--zd-text-primary)] hover:bg-[var(--zd-surface)] rounded-md transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Primary Editor Pane (Pane 1) */}
      <motion.div
        layout
        className={cn(
          'flex flex-col min-h-0 min-w-0 h-full overflow-hidden transition-all duration-75',
          mobileActivePane !== 'primary' && 'hidden md:flex'
        )}
        style={{
          [splitDirection === 'horizontal' ? 'width' : 'height']:
            typeof window !== 'undefined' && window.innerWidth >= 768 ? `${splitRatio}%` : '100%',
        }}
        onClickCapture={() => onFocusPane('primary')}
      >
        {/* Pane 1 Tab Bar */}
        <JsonTabBar
          tabs={group1Tabs}
          allWorkspaceTabs={allTabs}
          activeTabId={primaryTabId}
          setActiveTab={(id) => {
            onSelectPrimaryTab(id);
            onFocusPane('primary');
          }}
          addTab={() => onAddTab(1)}
          removeTab={(id) => onCloseTab(id, 1)}
          renameTab={onRenameTab}
          editingTabId={editingTabId}
          setEditingTabId={setEditingTabId}
          editingTabName={editingTabName}
          setEditingTabName={setEditingTabName}
          isSplit={true}
          isActivePane={focusedPane === 'primary'}
          onFocusPane={() => onFocusPane('primary')}
          paneLabel="Pane 1"
          onMoveToOtherGroup={onMoveToOtherGroup ? (id) => onMoveToOtherGroup(id, 1) : undefined}
          moveToGroupLabel="Move to Right Pane"
        />

        {/* Pane 1 Action Toolbar: [ Format | Minify | Repair ] [ Tree | Table | Path ] [ Validate | Options ] */}
        <JsonPaneToolbar
          paneId="primary"
          activeTabId={primaryTabId}
          isProcessing={isProcessing}
          onFormat={() => onProcessJson?.('primary', 'format')}
          onMinify={() => onProcessJson?.('primary', 'minify')}
          onRepair={() => onRepairJson?.('primary')}
          currentView={primaryView}
          onViewChange={setPrimaryView}
          showSchema={showPrimarySchema}
          onToggleSchema={() => setShowPrimarySchema((prev) => !prev)}
          indent={indent}
          sortKeys={sortKeys}
          smartFormat={smartFormat}
          onIndentChange={onIndentChange}
          onSortKeysChange={onSortKeysChange}
          onSmartFormatChange={onSmartFormatChange}
        />

        {/* Pane 1 Body (CodeEditor / TreeView / TableView / PathPanel) */}
        <div className="flex-1 min-h-0 w-full relative overflow-hidden flex flex-col md:flex-row">
          {showPrimarySchema && (
            <SchemaPanel
              schema={schema}
              onChange={onSchemaChange}
              errors={validationErrors}
              isValidating={isValidating}
              onClose={() => setShowPrimarySchema(false)}
              onInferSchema={onInferSchema}
              onErrorClick={onJumpToError}
            />
          )}

          <div className="flex-1 min-h-0 min-w-0 h-full relative">
            {primaryView === 'editor' && (
              primaryTabId ? (
                <CodeEditor
                  modelId={primaryTabId}
                  language="json"
                  editorRef={primaryEditorRef}
                  onChange={onPrimaryChange}
                  onFocus={() => onFocusPane('primary')}
                  className="h-full"
                />
              ) : (
                <div className="h-full flex items-center justify-center text-[var(--zd-text-muted)] bg-[var(--zd-surface)] text-xs">
                  No tab selected
                </div>
              )
            )}

            {primaryView === 'tree' && (
              <TreeView
                jsonString={primaryContent}
                tabId={primaryTabId || undefined}
                panelLayout="full"
              />
            )}

            {primaryView === 'table' && (
              <TableView
                jsonString={primaryContent}
                panelLayout="full"
              />
            )}

            {primaryView === 'path' && (
              <PathPanel
                sourceJson={primaryContent}
                onClose={() => setPrimaryView('editor')}
                panelLayout="full"
              />
            )}
          </div>
        </div>
      </motion.div>

      {/* Resizable Splitter Gutter */}
      <div
        onPointerDown={handlePointerDown}
        onDoubleClick={handleResetRatio}
        title="Drag to resize panes • Double-click to reset to 50/50"
        className={cn(
          'hidden md:flex items-center justify-center relative z-20 shrink-0 transition-colors duration-150 select-none',
          splitDirection === 'horizontal'
            ? 'w-2 cursor-col-resize border-x border-[var(--zd-border)] bg-[var(--zd-surface)] hover:bg-[var(--zd-primary-soft)] group'
            : 'h-2 cursor-row-resize border-y border-[var(--zd-border)] bg-[var(--zd-surface)] hover:bg-[var(--zd-primary-soft)] group',
          isDragging && 'bg-[var(--zd-primary-soft)] border-[var(--zd-primary)]/40 shadow-xs'
        )}
      >
        {splitDirection === 'horizontal' ? (
          <GripVertical className="w-3 h-3 text-[var(--zd-text-muted)] group-hover:text-[var(--zd-primary)] transition-colors opacity-70 group-hover:opacity-100" />
        ) : (
          <GripHorizontal className="w-3 h-3 text-[var(--zd-text-muted)] group-hover:text-[var(--zd-primary)] transition-colors opacity-70 group-hover:opacity-100" />
        )}
      </div>

      {/* Secondary Editor Pane (Pane 2) */}
      <motion.div
        layout
        className={cn(
          'flex flex-col min-h-0 min-w-0 h-full overflow-hidden transition-all duration-75',
          mobileActivePane !== 'secondary' && 'hidden md:flex'
        )}
        style={{
          [splitDirection === 'horizontal' ? 'width' : 'height']:
            typeof window !== 'undefined' && window.innerWidth >= 768
              ? `${100 - splitRatio}%`
              : '100%',
        }}
        onClickCapture={() => onFocusPane('secondary')}
      >
        {/* Pane 2 Tab Bar */}
        <JsonTabBar
          tabs={group2Tabs}
          allWorkspaceTabs={allTabs}
          activeTabId={secondaryTabId}
          setActiveTab={(id) => {
            onSelectSecondaryTab(id);
            onFocusPane('secondary');
          }}
          addTab={() => onAddTab(2)}
          removeTab={(id) => onCloseTab(id, 2)}
          renameTab={onRenameTab}
          editingTabId={editingTabId}
          setEditingTabId={setEditingTabId}
          editingTabName={editingTabName}
          setEditingTabName={setEditingTabName}
          isSplit={true}
          isActivePane={focusedPane === 'secondary'}
          onFocusPane={() => onFocusPane('secondary')}
          paneLabel="Pane 2"
          onMoveToOtherGroup={onMoveToOtherGroup ? (id) => onMoveToOtherGroup(id, 2) : undefined}
          moveToGroupLabel="Move to Left Pane"
          rightActions={
            <div className="flex items-center gap-1">
              {/* Swap Panes Button */}
              <button
                type="button"
                onClick={onSwapPanes}
                title="Swap Left and Right Panes"
                aria-label="Swap Panes"
                className="p-1 rounded-md text-[var(--zd-text-muted)] hover:text-[var(--zd-primary)] hover:bg-[var(--zd-surface)] transition-colors cursor-pointer"
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
              </button>

              {/* Split Direction Toggle */}
              <button
                type="button"
                onClick={onToggleSplitDirection}
                title={
                  splitDirection === 'horizontal'
                    ? 'Switch to Stacked / Vertical Split (Rows)'
                    : 'Switch to Side-by-Side / Horizontal Split (Columns)'
                }
                aria-label="Toggle split orientation"
                className="p-1 rounded-md text-[var(--zd-text-muted)] hover:text-[var(--zd-primary)] hover:bg-[var(--zd-surface)] transition-colors cursor-pointer"
              >
                {splitDirection === 'horizontal' ? (
                  <Rows className="w-3.5 h-3.5" />
                ) : (
                  <Columns2 className="w-3.5 h-3.5" />
                )}
              </button>

              <div className="h-3.5 w-px bg-[var(--zd-border)] mx-0.5" />

              {/* Close Split Button */}
              <button
                type="button"
                onClick={onCloseSplit}
                title="Close Split Editor (⌘\)"
                aria-label="Close Split Editor"
                className="p-1 rounded-md text-[var(--zd-text-muted)] hover:text-[var(--zd-primary)] hover:bg-[var(--zd-primary-soft)] transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          }
        />

        {/* Pane 2 Action Toolbar: [ Format | Minify | Repair ] [ Tree | Table | Path ] [ Validate | Options ] */}
        <JsonPaneToolbar
          paneId="secondary"
          activeTabId={secondaryTabId}
          isProcessing={isProcessing}
          onFormat={() => onProcessJson?.('secondary', 'format')}
          onMinify={() => onProcessJson?.('secondary', 'minify')}
          onRepair={() => onRepairJson?.('secondary')}
          currentView={secondaryView}
          onViewChange={setSecondaryView}
          showSchema={showSecondarySchema}
          onToggleSchema={() => setShowSecondarySchema((prev) => !prev)}
          indent={indent}
          sortKeys={sortKeys}
          smartFormat={smartFormat}
          onIndentChange={onIndentChange}
          onSortKeysChange={onSortKeysChange}
          onSmartFormatChange={onSmartFormatChange}
        />

        {/* Pane 2 Body (CodeEditor / TreeView / TableView / PathPanel) */}
        <div className="flex-1 min-h-0 w-full relative overflow-hidden flex flex-col md:flex-row">
          {showSecondarySchema && (
            <SchemaPanel
              schema={schema}
              onChange={onSchemaChange}
              errors={validationErrors}
              isValidating={isValidating}
              onClose={() => setShowSecondarySchema(false)}
              onInferSchema={onInferSchema}
              onErrorClick={onJumpToError}
            />
          )}

          <div className="flex-1 min-h-0 min-w-0 h-full relative">
            {secondaryView === 'editor' && (
              secondaryTabId ? (
                <CodeEditor
                  modelId={secondaryTabId}
                  language="json"
                  editorRef={secondaryEditorRef}
                  onChange={onSecondaryChange}
                  onFocus={() => onFocusPane('secondary')}
                  className="h-full"
                />
              ) : (
                <div className="h-full flex items-center justify-center text-[var(--zd-text-muted)] bg-[var(--zd-surface)] text-xs">
                  No tab selected
                </div>
              )
            )}

            {secondaryView === 'tree' && (
              <TreeView
                jsonString={secondaryContent}
                tabId={secondaryTabId || undefined}
                panelLayout="full"
              />
            )}

            {secondaryView === 'table' && (
              <TableView
                jsonString={secondaryContent}
                panelLayout="full"
              />
            )}

            {secondaryView === 'path' && (
              <PathPanel
                sourceJson={secondaryContent}
                onClose={() => setSecondaryView('editor')}
                panelLayout="full"
              />
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
