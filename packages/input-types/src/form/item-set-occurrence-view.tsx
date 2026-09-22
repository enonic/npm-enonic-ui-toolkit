import { cn, usePortalFocusContainer } from '@enonic/ui';
import {
  forwardRef,
  type ReactElement,
  type ReactNode,
  useCallback,
  useRef,
  useState,
} from 'react';

import type { PropertySet } from '../data';
import type { FormItem, Occurrences } from '../schema';
import { SetConfirmDelete, SetConfirmOverlay, useConfirmPosition } from './set-confirmation';
import { useIsNewOccurrence } from './set-hooks';
import { SetOccurrenceHeader } from './set-occurrence-header';
import { useCloseOnScroll } from './use-close-on-scroll';
import { useSetOccurrenceLabel } from './use-set-occurrence-label';

const ITEM_SET_OCCURRENCE_VIEW_NAME = 'ItemSetOccurrenceView';

export type ItemSetOccurrenceViewProps = {
  index: number;
  grip: ReactNode;
  propertySet: PropertySet;
  formItems: FormItem[];
  fallbackLabel: string;
  expanded: boolean;
  isNew?: boolean;
  canAdd: boolean;
  canRemove: boolean;
  occurrences: Occurrences;
  hasErrors: boolean;
  onAddAbove: (index: number) => void;
  onAddBelow: (index: number) => void;
  onToggle: (index: number) => void;
  onRemove: (index: number) => void;
  children: ReactNode;
};

/** One occurrence of an item set: a collapsible header over its items, and a delete to confirm. */
export const ItemSetOccurrenceView = forwardRef<HTMLDivElement, ItemSetOccurrenceViewProps>(
  (
    {
      index,
      grip,
      propertySet,
      formItems,
      fallbackLabel,
      expanded,
      isNew: isNewProp = false,
      canAdd,
      canRemove,
      occurrences,
      hasErrors,
      onAddAbove,
      onAddBelow,
      onToggle,
      onRemove,
      children,
    },
    ref,
  ): ReactElement => {
    const anchorRef = useRef<HTMLDivElement>(null);
    const confirmationRef = useRef<HTMLDivElement>(null);
    const [confirmingDelete, setConfirmingDelete] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);

    const showHeader = occurrences.getMinimum() !== 1 || occurrences.getMaximum() !== 1;
    const label = useSetOccurrenceLabel(propertySet, formItems, fallbackLabel);
    const isNew = useIsNewOccurrence(isNewProp);
    const confirmationPosition = useConfirmPosition({
      enabled: confirmingDelete,
      anchorRef,
      confirmationRef,
    });

    useCloseOnScroll(menuOpen, () => setMenuOpen(false));
    usePortalFocusContainer(confirmationRef, confirmingDelete);

    const handleAddAbove = useCallback(() => onAddAbove(index), [onAddAbove, index]);
    const handleAddBelow = useCallback(() => onAddBelow(index), [onAddBelow, index]);
    const handleToggle = useCallback(() => onToggle(index), [onToggle, index]);
    const handleRemove = useCallback(() => {
      if (propertySet.isEmpty()) {
        onRemove(index);
        return;
      }
      if (!expanded) onToggle(index);
      setConfirmingDelete(true);
    }, [propertySet, expanded, onToggle, index, onRemove]);
    const handleCancelDelete = useCallback(() => setConfirmingDelete(false), []);
    const handleConfirmDelete = useCallback(() => {
      setConfirmingDelete(false);
      onRemove(index);
    }, [onRemove, index]);

    return (
      <div
        ref={ref}
        className={cn('w-full', isNew && 'animate-in fade-in duration-500')}
        data-component={ITEM_SET_OCCURRENCE_VIEW_NAME}
        data-confirming={confirmingDelete}
      >
        {confirmingDelete && <SetConfirmOverlay />}
        <div
          className={cn(
            confirmingDelete && 'pointer-events-none relative z-40 bg-surface-neutral select-none',
          )}
          inert={confirmingDelete}
        >
          {confirmingDelete && (
            <SetConfirmDelete
              ref={confirmationRef}
              position={confirmationPosition}
              onCancel={handleCancelDelete}
              onConfirm={handleConfirmDelete}
            />
          )}
          {showHeader && (
            <SetOccurrenceHeader
              anchorRef={anchorRef}
              grip={grip}
              expanded={expanded}
              expandedChrome={expanded}
              hasErrors={hasErrors}
              canToggle
              canAdd={canAdd}
              canDelete={canRemove}
              menuOpen={menuOpen}
              onMenuOpenChange={setMenuOpen}
              onToggle={handleToggle}
              onAddAbove={handleAddAbove}
              onAddBelow={handleAddBelow}
              onDelete={handleRemove}
            >
              <span className="truncate text-base font-semibold">{label.primary}</span>
            </SetOccurrenceHeader>
          )}
          {(expanded || !showHeader) && (
            <div
              className={cn(
                'flex flex-col gap-7.5 border border-bdr-soft px-4 py-4',
                showHeader ? 'border-t-0' : 'rounded',
              )}
            >
              {children}
            </div>
          )}
        </div>
      </div>
    );
  },
);
ItemSetOccurrenceView.displayName = ITEM_SET_OCCURRENCE_VIEW_NAME;
