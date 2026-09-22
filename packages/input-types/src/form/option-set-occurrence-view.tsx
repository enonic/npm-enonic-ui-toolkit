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
import type { FormItem, FormOptionSet } from '../schema';
import { ItemLabel } from './item-label';
import {
  isLockedSingleOccurrence,
  useOptionSetHasBody,
  useOptionSetSelection,
} from './option-set-selection';
import {
  OptionSetConfirmAdd,
  SetConfirmDelete,
  SetConfirmOverlay,
  useConfirmPosition,
} from './set-confirmation';
import { useIsNewOccurrence } from './set-hooks';
import { SetOccurrenceHeader } from './set-occurrence-header';
import { useCloseOnScroll } from './use-close-on-scroll';
import { useSetOccurrenceLabel } from './use-set-occurrence-label';

const OPTION_SET_OCCURRENCE_VIEW_NAME = 'OptionSetOccurrenceView';

export type OptionSetOccurrenceViewProps = {
  index: number;
  grip: ReactNode;
  propertySet: PropertySet;
  optionSet: FormOptionSet;
  formItems: FormItem[];
  fallbackLabel: string;
  expanded: boolean;
  isNew?: boolean;
  canAdd: boolean;
  canRemove: boolean;
  hasErrors: boolean;
  onAddAbove: (index: number, selectedName?: string) => void;
  onAddBelow: (index: number, selectedName?: string) => void;
  onToggle: (index: number) => void;
  onRemove: (index: number) => void;
  /** Clears the selection instead of removing, for an occurrence that must stay. */
  onReset?: (index: number) => void;
  children: ReactNode;
};

/**
 * One occurrence of an option set. Adding next to a radio occurrence asks which option first,
 * since a radio occurrence without a choice is nothing yet.
 */
export const OptionSetOccurrenceView = forwardRef<HTMLDivElement, OptionSetOccurrenceViewProps>(
  (
    {
      index,
      grip,
      propertySet,
      optionSet,
      formItems,
      fallbackLabel,
      expanded,
      isNew: isNewProp = false,
      canAdd,
      canRemove,
      hasErrors,
      onAddAbove,
      onAddBelow,
      onToggle,
      onRemove,
      onReset,
      children,
    },
    ref,
  ): ReactElement => {
    const anchorRef = useRef<HTMLDivElement>(null);
    const confirmationRef = useRef<HTMLDivElement>(null);
    const [confirmingAdd, setConfirmingAdd] = useState<'above' | 'below' | undefined>(undefined);
    const [confirmingDelete, setConfirmingDelete] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);

    const isNew = useIsNewOccurrence(isNewProp);
    const hasBody = useOptionSetHasBody(optionSet, propertySet);
    const { selectedNames } = useOptionSetSelection(optionSet, propertySet);
    const canDelete = canRemove || (onReset !== undefined && selectedNames.length > 0);
    const label = useSetOccurrenceLabel(propertySet, formItems, fallbackLabel);

    const isRadio = optionSet.isRadioSelection();
    const showHeader = !isLockedSingleOccurrence(optionSet);
    const showBody = expanded || !showHeader;
    const expandedChrome = expanded && hasBody;
    const isConfirming = confirmingDelete || confirmingAdd !== undefined;
    const confirmationPosition = useConfirmPosition({
      enabled: isConfirming,
      anchorRef,
      confirmationRef,
    });

    useCloseOnScroll(menuOpen, () => setMenuOpen(false));
    usePortalFocusContainer(confirmationRef, isConfirming);

    const handleRequestAddAbove = useCallback(() => {
      if (isRadio) setConfirmingAdd('above');
      else onAddAbove(index);
    }, [isRadio, onAddAbove, index]);
    const handleRequestAddBelow = useCallback(() => {
      if (isRadio) setConfirmingAdd('below');
      else onAddBelow(index);
    }, [isRadio, onAddBelow, index]);
    const handleCancelAdd = useCallback(() => setConfirmingAdd(undefined), []);
    const handleConfirmAdd = useCallback(
      (selectedName: string) => {
        const mode = confirmingAdd;
        setConfirmingAdd(undefined);
        if (mode === 'above') onAddAbove(index, selectedName);
        else if (mode === 'below') onAddBelow(index, selectedName);
      },
      [confirmingAdd, onAddAbove, onAddBelow, index],
    );
    const handleToggle = useCallback(() => {
      if (hasBody) onToggle(index);
    }, [hasBody, onToggle, index]);
    const handleRemove = useCallback(() => {
      if (!canDelete) return;
      if (!expanded) onToggle(index);
      setConfirmingDelete(true);
    }, [canDelete, expanded, onToggle, index]);
    const handleCancelDelete = useCallback(() => setConfirmingDelete(false), []);
    const handleConfirmDelete = useCallback(() => {
      setConfirmingDelete(false);
      if (canRemove) onRemove(index);
      else onReset?.(index);
    }, [canRemove, onRemove, onReset, index]);

    return (
      <div
        ref={ref}
        className={cn('w-full', isNew && 'animate-in fade-in duration-500')}
        data-component={OPTION_SET_OCCURRENCE_VIEW_NAME}
        data-confirming={isConfirming}
      >
        {isConfirming && <SetConfirmOverlay />}
        <div
          className={cn(
            isConfirming && 'pointer-events-none select-none',
            confirmingDelete && 'relative z-40 bg-surface-neutral',
          )}
          inert={isConfirming}
        >
          {confirmingDelete && (
            <SetConfirmDelete
              ref={confirmationRef}
              position={confirmationPosition}
              onCancel={handleCancelDelete}
              onConfirm={handleConfirmDelete}
            />
          )}
          {confirmingAdd !== undefined && (
            <OptionSetConfirmAdd
              ref={confirmationRef}
              position={confirmationPosition}
              optionSet={optionSet}
              onCancel={handleCancelAdd}
              onConfirm={handleConfirmAdd}
            />
          )}
          {showHeader && (
            <SetOccurrenceHeader
              anchorRef={anchorRef}
              grip={grip}
              expanded={expanded}
              expandedChrome={expandedChrome}
              hasErrors={hasErrors}
              canToggle={hasBody}
              canAdd={canAdd}
              canDelete={canDelete}
              menuOpen={menuOpen}
              onMenuOpenChange={setMenuOpen}
              onToggle={handleToggle}
              onAddAbove={handleRequestAddAbove}
              onAddBelow={handleRequestAddBelow}
              onDelete={handleRemove}
            >
              <ItemLabel primary={label.primary} secondary={label.secondary} className="min-w-0" />
            </SetOccurrenceHeader>
          )}
          {showBody && hasBody && (
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
OptionSetOccurrenceView.displayName = OPTION_SET_OCCURRENCE_VIEW_NAME;
