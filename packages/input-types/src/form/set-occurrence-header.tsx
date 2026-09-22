import { cn, ContextMenu, FilledOctagonAlert } from '@enonic/ui';
import { MoreVertical } from 'lucide-react';
import { type JSX, type ReactElement, type ReactNode, type RefObject, useCallback } from 'react';

import { useInputTypesPhrases } from '../i18n/use-phrases';

export type SetOccurrenceHeaderProps = {
  anchorRef: RefObject<HTMLDivElement>;
  grip: ReactNode;
  expanded: boolean;
  /** Whether the header takes the expanded look; an occurrence without a body never does. */
  expandedChrome: boolean;
  hasErrors: boolean;
  canToggle: boolean;
  canAdd: boolean;
  canDelete: boolean;
  menuOpen: boolean;
  onMenuOpenChange: (open: boolean) => void;
  onToggle: () => void;
  onAddAbove: () => void;
  onAddBelow: () => void;
  onDelete: () => void;
  children: ReactNode;
};

/** The row above an occurrence's body: its label, an error badge, and the menu with its actions. */
export const SetOccurrenceHeader = ({
  anchorRef,
  grip,
  expanded,
  expandedChrome,
  hasErrors,
  canToggle,
  canAdd,
  canDelete,
  menuOpen,
  onMenuOpenChange,
  onToggle,
  onAddAbove,
  onAddBelow,
  onDelete,
  children,
}: SetOccurrenceHeaderProps): ReactElement => {
  const t = useInputTypesPhrases();

  // The dots open the same menu a right click does, at the same place.
  const handleDotsClick: JSX.MouseEventHandler<HTMLButtonElement> = useCallback((event) => {
    event.stopPropagation();
    event.currentTarget.dispatchEvent(
      new MouseEvent('contextmenu', {
        bubbles: true,
        clientX: event.clientX,
        clientY: event.clientY,
      }),
    );
  }, []);

  return (
    <div
      className={cn(
        'group flex rounded border border-transparent',
        expandedChrome &&
          'rounded-bl-none rounded-br-none border-bdr-soft bg-surface-selected [&_svg:first-child]:text-alt',
        expandedChrome && menuOpen && 'bg-surface-selected-hover',
        expandedChrome && !menuOpen && 'hover:bg-surface-selected-hover',
        !expandedChrome && menuOpen && 'bg-surface-neutral-hover',
        !expandedChrome && !menuOpen && 'hover:bg-surface-neutral-hover',
      )}
      data-tone={expandedChrome ? 'inverse' : undefined}
    >
      {grip && <div className="flex items-center justify-center pl-2.5">{grip}</div>}
      <ContextMenu open={menuOpen} onOpenChange={onMenuOpenChange}>
        <ContextMenu.Trigger className="flex w-full">
          <div
            ref={anchorRef}
            className={cn(
              'grid min-w-0 flex-1 grid-cols-[1fr_auto] items-center rounded',
              expandedChrome && 'rounded-b-none text-alt',
            )}
          >
            <button
              type="button"
              className={cn(
                'flex min-w-0 items-center gap-1.5 truncate p-2.5 pr-0 text-left',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                canToggle ? 'cursor-pointer' : 'cursor-default',
              )}
              aria-expanded={canToggle ? expanded : undefined}
              onClick={onToggle}
            >
              {children}
              {hasErrors && !expanded && (
                <FilledOctagonAlert size={16} className="shrink-0 text-error" />
              )}
            </button>
            <button
              type="button"
              onClick={handleDotsClick}
              aria-label={t('enonic.inputTypes.set.moreActions')}
              className="my-1.5 mr-2.5 cursor-pointer rounded p-2 text-subtle hover:bg-surface-selected hover:text-alt group-data-[tone=inverse]:text-alt"
            >
              <MoreVertical size={20} absoluteStrokeWidth />
            </button>
          </div>
        </ContextMenu.Trigger>
        <ContextMenu.Portal>
          <ContextMenu.Content>
            <ContextMenu.Item disabled={!canAdd} onClick={onAddAbove}>
              <span>{t('enonic.inputTypes.set.addAbove')}</span>
            </ContextMenu.Item>
            <ContextMenu.Item disabled={!canAdd} onClick={onAddBelow}>
              <span>{t('enonic.inputTypes.set.addBelow')}</span>
            </ContextMenu.Item>
            <ContextMenu.Item disabled={!canDelete} onClick={onDelete}>
              <span>{t('enonic.inputTypes.set.delete')}</span>
            </ContextMenu.Item>
          </ContextMenu.Content>
        </ContextMenu.Portal>
      </ContextMenu>
    </div>
  );
};
SetOccurrenceHeader.displayName = 'SetOccurrenceHeader';
