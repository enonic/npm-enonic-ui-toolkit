import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  type DragStartEvent,
  KeyboardSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { cn } from '@enonic/ui';
import { GripVertical } from 'lucide-react';
import type { JSX, ReactElement, ReactNode } from 'react';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import {
  FULL_ROW_TOUCH_SENSOR_OPTIONS,
  HANDLE_TOUCH_SENSOR_OPTIONS,
  MOUSE_SENSOR_OPTIONS,
  PrimaryButtonMouseSensor,
} from './sortable-sensors';

/** What `renderItem` and `itemClassName` get per row. */
export type SortableGridListItemContext<T> = {
  item: T;
  index: number;
  /** This row is being dragged. */
  isDragging: boolean;
  /** Some row is being dragged. */
  isDragActive: boolean;
  /** The row or something in it has focus. */
  isFocused: boolean;
  isMovable: boolean;
};

/**
 * A vertical drag-to-reorder list of rows that are themselves editable — the occurrences of an
 * input. One row is the tab stop; arrows move between rows and between the controls of a row,
 * so the list is one stop in the page's tab order however many inputs it holds.
 */
export type SortableGridListProps<T> = {
  'data-component'?: string;
  items: T[];
  /** A stable id per item for dnd-kit. */
  keyExtractor: (item: T, index: number) => string;
  onMove: (fromIndex: number, toIndex: number) => void;
  enabled: boolean;
  /** Per row; every row when there are two or more by default. */
  isItemMovable?: (item: T, index: number) => boolean;
  /** The whole row drags, not only the grip. */
  fullRowDraggable?: boolean;
  renderItem: (context: SortableGridListItemContext<T>) => ReactNode;
  /** The grip's accessible label. */
  dragLabel?: string;
  itemClassName?: string | ((context: SortableGridListItemContext<T>) => string);
  className?: string;
};

type Transform = { x: number; y: number; scaleX: number; scaleY: number };

// Scale is left out on purpose: `@dnd-kit/utilities` is not a dependency.
function toTransformCSS(transform: Transform | null): string | undefined {
  if (transform == null) return undefined;
  return `translate3d(${Math.round(transform.x)}px, ${Math.round(transform.y)}px, 0)`;
}

function restrictToVerticalAxis({ transform }: { transform: Transform }): Transform {
  return { ...transform, x: 0 };
}

function isKeyboardDragPressed(value: unknown): boolean {
  return value === true || value === 'true';
}

const COMPOSITE_NAVIGATION_TARGET_SELECTOR = '[data-sortable-list-composite-target="true"]';
const NAVIGATION_TARGET_SELECTOR =
  'a[href], button, iframe, input:not([type="hidden"]), select, textarea, [contenteditable], [tabindex]';
const ROW_NAVIGATION_TARGET_SELECTOR = `${COMPOSITE_NAVIGATION_TARGET_SELECTOR}, ${NAVIGATION_TARGET_SELECTOR}`;
const NAVIGATION_TARGET_TABINDEX_ATTR = 'data-sortable-list-navigation-target-tabindex';
const NAVIGATION_TARGET_TABINDEX_IMPLICIT = '__implicit__';
const NAVIGATION_TARGET_EFFECTIVE_TABINDEX_ATTR = 'data-sortable-list-effective-tabindex';
const NON_EDITABLE_INPUT_TYPES = new Set([
  'button',
  'checkbox',
  'color',
  'file',
  'hidden',
  'image',
  'radio',
  'range',
  'reset',
  'submit',
]);
const KEYBOARD_SENSOR_OPTIONS = { coordinateGetter: sortableKeyboardCoordinates };

function clampIndex(index: number, itemCount: number): number {
  if (itemCount <= 0) return 0;
  return Math.min(Math.max(index, 0), itemCount - 1);
}

type ElementLike = {
  tabIndex?: number;
  getAttribute?: (name: string) => string | null;
};

function getNavigationTargetTabIndex(element: ElementLike): number {
  if (typeof element.tabIndex === 'number') return element.tabIndex;
  const attr = element.getAttribute?.('tabindex');
  if (attr == null) return 0;
  const parsed = Number(attr);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function getEffectiveNavigationTargetTabIndex(element: ElementLike): number {
  const stored = element.getAttribute?.(NAVIGATION_TARGET_EFFECTIVE_TABINDEX_ATTR);
  if (stored == null) return getNavigationTargetTabIndex(element);
  const parsed = Number(stored);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function isEditableNavigationTarget(target: EventTarget | null): boolean {
  if (target == null || typeof target !== 'object') return false;
  const element = target as {
    getAttribute?: (name: string) => string | null;
    isContentEditable?: boolean;
    tagName?: string;
    type?: string;
  };
  if (element.isContentEditable) return true;
  const role = element.getAttribute?.('role');
  if (role === 'textbox' || role === 'combobox' || role === 'spinbutton') return true;
  switch (element.tagName?.toUpperCase()) {
    case 'INPUT':
      return !NON_EDITABLE_INPUT_TYPES.has((element.type ?? 'text').toLowerCase());
    case 'SELECT':
    case 'TEXTAREA':
      return true;
    default:
      return false;
  }
}

function getRowNavigationTargets(row: HTMLDivElement | null): HTMLElement[] {
  if (row == null) return [];
  const descendants = Array.from(
    row.querySelectorAll<HTMLElement>(ROW_NAVIGATION_TARGET_SELECTOR),
  ).filter((target) => {
    if (target === row) return false;
    const composite = target.closest<HTMLElement>(COMPOSITE_NAVIGATION_TARGET_SELECTOR);
    if (composite != null && composite !== target) return false;
    if (getEffectiveNavigationTargetTabIndex(target) < 0) return false;
    if ((target as HTMLButtonElement).disabled) return false;
    if (target.getAttribute('aria-hidden') === 'true') return false;
    return target.closest('[hidden], [aria-hidden="true"]') == null;
  });
  return [row, ...descendants];
}

function getRowNavigationTargetIndex(row: HTMLDivElement, target: EventTarget | null): number {
  const targets = getRowNavigationTargets(row);
  if (targets.length === 0 || target == null || typeof target !== 'object') return 0;
  const exact = targets.indexOf(target as HTMLElement);
  if (exact !== -1) return exact;
  const containing = targets.findIndex(
    (candidate) => candidate !== row && candidate.contains(target as Node),
  );
  return containing === -1 ? 0 : containing;
}

function resolveFocusedIndexAfterMove(
  focusedIndex: number,
  oldIndex: number,
  newIndex: number,
): number {
  if (focusedIndex === oldIndex) return newIndex;
  if (oldIndex < focusedIndex && focusedIndex <= newIndex) return focusedIndex - 1;
  if (newIndex <= focusedIndex && focusedIndex < oldIndex) return focusedIndex + 1;
  return focusedIndex;
}

function restoreNavigationTargetTabIndex(target: HTMLElement): void {
  const original = target.getAttribute(NAVIGATION_TARGET_TABINDEX_ATTR);
  if (original == null) return;
  if (original === NAVIGATION_TARGET_TABINDEX_IMPLICIT) {
    target.removeAttribute('tabindex');
  } else {
    target.setAttribute('tabindex', original);
  }
  target.removeAttribute(NAVIGATION_TARGET_TABINDEX_ATTR);
  target.removeAttribute(NAVIGATION_TARGET_EFFECTIVE_TABINDEX_ATTR);
}

function restoreRowNavigationTargetsTabIndex(row: HTMLDivElement | null): void {
  if (row == null) return;
  for (const target of Array.from(
    row.querySelectorAll<HTMLElement>(ROW_NAVIGATION_TARGET_SELECTOR),
  )) {
    if (target !== row) restoreNavigationTargetTabIndex(target);
  }
}

/** Takes the row's controls out of the tab order while the list navigates by arrows, remembering their own. */
function syncRowNavigationTargetsTabIndex(row: HTMLDivElement | null, isNavigable: boolean): void {
  if (row == null) return;
  const descendants = Array.from(
    row.querySelectorAll<HTMLElement>(ROW_NAVIGATION_TARGET_SELECTOR),
  ).filter(
    (target) =>
      target !== row &&
      target.getAttribute('aria-hidden') !== 'true' &&
      target.closest('[hidden], [aria-hidden="true"]') == null,
  );
  for (const target of descendants) {
    if (!isNavigable) {
      restoreNavigationTargetTabIndex(target);
      continue;
    }
    if (target.getAttribute(NAVIGATION_TARGET_TABINDEX_ATTR) == null) {
      target.setAttribute(
        NAVIGATION_TARGET_TABINDEX_ATTR,
        target.getAttribute('tabindex') ?? NAVIGATION_TARGET_TABINDEX_IMPLICIT,
      );
      target.setAttribute(
        NAVIGATION_TARGET_EFFECTIVE_TABINDEX_ATTR,
        String(getNavigationTargetTabIndex(target)),
      );
    }
    target.tabIndex = -1;
  }
}

type SortableGridListItemProps<T> = {
  id: string;
  item: T;
  index: number;
  isMovable: boolean;
  isNavigable: boolean;
  isDragActive: boolean;
  enabled: boolean;
  fullRowDraggable: boolean;
  isTabStop: boolean;
  registerRowRef: (index: number, node: HTMLDivElement | null) => void;
  onFocusRow: (index: number, targetIndex: number) => void;
  onNavigate: (index: number, targetIndex: number) => void;
  onTabNavigate: (index: number, targetIndex: number, isBackward: boolean) => boolean;
  dragLabel?: string;
  renderItem: (context: SortableGridListItemContext<T>) => ReactNode;
  itemClassName?: string | ((context: SortableGridListItemContext<T>) => string);
};

const SortableGridListItem = <T,>({
  id,
  item,
  index,
  isMovable,
  isNavigable,
  isDragActive,
  enabled,
  fullRowDraggable,
  isTabStop,
  registerRowRef,
  onFocusRow,
  onNavigate,
  onTabNavigate,
  dragLabel,
  renderItem,
  itemClassName,
}: SortableGridListItemProps<T>): ReactElement => {
  const [isFocused, setIsFocused] = useState(false);
  const rowRef = useRef<HTMLDivElement | null>(null);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: !enabled || !isMovable,
  });

  const handleNodeRef = (node: HTMLDivElement | null): void => {
    if (node == null) {
      restoreRowNavigationTargetsTabIndex(rowRef.current);
      rowRef.current = null;
      setNodeRef(null);
      registerRowRef(index, null);
      return;
    }
    rowRef.current = node;
    setNodeRef(node);
    registerRowRef(index, node);
    syncRowNavigationTargetsTabIndex(node, isNavigable);
  };

  useEffect(() => {
    syncRowNavigationTargetsTabIndex(rowRef.current, isNavigable);
  }, [isNavigable]);

  const handleKeyDown: JSX.KeyboardEventHandler<HTMLDivElement> = (e) => {
    syncRowNavigationTargetsTabIndex(e.currentTarget, isNavigable);
    const isKeyboardDragging = isKeyboardDragPressed(attributes['aria-pressed']);
    const targetIndex = getRowNavigationTargetIndex(e.currentTarget, e.target);
    if (!isKeyboardDragging && isNavigable && e.key === 'Tab' && e.target !== e.currentTarget) {
      if (onTabNavigate(index, targetIndex, e.shiftKey)) {
        e.preventDefault();
        return;
      }
    }
    if (!isKeyboardDragging && !isEditableNavigationTarget(e.target)) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        onNavigate(index + 1, targetIndex);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        onNavigate(index - 1, targetIndex);
        return;
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        const targets = getRowNavigationTargets(e.currentTarget);
        const nextTargetIndex = clampIndex(
          targetIndex + (e.key === 'ArrowRight' ? 1 : -1),
          targets.length,
        );
        if (nextTargetIndex !== targetIndex) {
          e.preventDefault();
          targets[nextTargetIndex]?.focus();
          return;
        }
      }
    }
    if (e.target !== e.currentTarget) return;
    (listeners?.onKeyDown as JSX.KeyboardEventHandler<HTMLDivElement> | undefined)?.(e);
  };

  // With the whole row draggable, dnd-kit's own key handler must not replace the guarded one.
  let rowListeners: Omit<NonNullable<typeof listeners>, 'onKeyDown'> | undefined;
  if (fullRowDraggable && isMovable && listeners != null) {
    const { onKeyDown: _ignored, ...rest } = listeners;
    rowListeners = rest;
  }

  const handleFocus: JSX.FocusEventHandler<HTMLDivElement> = (e) => {
    syncRowNavigationTargetsTabIndex(e.currentTarget, isNavigable);
    setIsFocused(true);
    onFocusRow(index, getRowNavigationTargetIndex(e.currentTarget, e.target));
  };

  const handleBlur: JSX.FocusEventHandler<HTMLDivElement> = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsFocused(false);
  };

  const context: SortableGridListItemContext<T> = {
    item,
    index,
    isDragging,
    isDragActive,
    isFocused,
    isMovable,
  };
  const resolvedClassName =
    typeof itemClassName === 'function' ? itemClassName(context) : itemClassName;

  // dnd-kit's attributes are spread one by one: its `role` is a string, not React's `AriaRole`.
  return (
    <div
      ref={handleNodeRef}
      onKeyDown={handleKeyDown}
      onFocus={handleFocus}
      onBlur={handleBlur}
      role={isMovable ? (attributes.role as JSX.AriaRole) : undefined}
      tabIndex={isNavigable ? (isTabStop ? 0 : -1) : undefined}
      aria-disabled={isMovable ? attributes['aria-disabled'] : undefined}
      aria-pressed={isMovable ? attributes['aria-pressed'] : undefined}
      aria-roledescription={isMovable ? attributes['aria-roledescription'] : undefined}
      aria-describedby={isMovable ? attributes['aria-describedby'] : undefined}
      style={{
        transform: toTransformCSS(transform),
        transition: transition ?? undefined,
        zIndex: isDragging ? 999 : undefined,
      }}
      className={cn(
        'relative flex items-center rounded outline-none',
        'focus-visible:ring-2 focus-visible:ring-ring/25 focus-visible:ring-inset',
        isDragging && 'bg-surface-neutral shadow-[0_2px_8px_2px] ring-1 shadow-main/10 ring-main/5',
        enabled && fullRowDraggable && isMovable && 'select-none',
        enabled &&
          fullRowDraggable &&
          isMovable &&
          (isDragging ? 'cursor-grabbing' : 'cursor-grab'),
        resolvedClassName,
      )}
      {...rowListeners}
    >
      {isMovable && (
        <button
          type="button"
          className={cn(
            'flex shrink-0 items-center text-subtle',
            fullRowDraggable
              ? 'pointer-events-none'
              : cn(
                  'cursor-grab touch-none',
                  'hover:text-foreground',
                  isDragging && 'cursor-grabbing',
                ),
            'focus-visible:outline-none',
            !enabled && 'pointer-events-none opacity-30',
          )}
          tabIndex={-1}
          disabled={!enabled}
          aria-label={dragLabel}
          {...(fullRowDraggable ? undefined : listeners)}
        >
          <GripVertical className="size-5" />
        </button>
      )}
      {renderItem(context)}
    </div>
  );
};

const SORTABLE_GRID_LIST_NAME = 'SortableGridList';

export const SortableGridList = <T,>({
  items,
  keyExtractor,
  onMove,
  enabled,
  isItemMovable,
  fullRowDraggable = false,
  dragLabel,
  renderItem,
  itemClassName,
  className,
  'data-component': dataComponent = SORTABLE_GRID_LIST_NAME,
}: SortableGridListProps<T>): ReactElement => {
  const ids = useMemo(() => items.map((item, i) => keyExtractor(item, i)), [items, keyExtractor]);
  const isNavigable = items.length >= 2;
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [focusedTargetIndex, setFocusedTargetIndex] = useState(0);
  const [focusedItemId, setFocusedItemId] = useState<string | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const hasFocusWithinRef = useRef(false);
  const pendingBlurClearVersionRef = useRef(0);

  const sensors = useSensors(
    useSensor(PrimaryButtonMouseSensor, MOUSE_SENSOR_OPTIONS),
    useSensor(
      TouchSensor,
      fullRowDraggable ? FULL_ROW_TOUCH_SENSOR_OPTIONS : HANDLE_TOUCH_SENSOR_OPTIONS,
    ),
    useSensor(KeyboardSensor, KEYBOARD_SENSOR_OPTIONS),
  );

  const getIsItemMovable = useCallback(
    (item: T, index: number) => isItemMovable?.(item, index) ?? isNavigable,
    [isItemMovable, isNavigable],
  );

  const focusRowByIndex = useCallback(
    (index: number, targetIndex: number) => {
      if (items.length === 0) return;
      pendingBlurClearVersionRef.current += 1;
      hasFocusWithinRef.current = true;
      requestAnimationFrame(() => {
        const row = rowRefs.current[clampIndex(index, items.length)] ?? null;
        syncRowNavigationTargetsTabIndex(row, isNavigable);
        const targets = getRowNavigationTargets(row);
        targets[clampIndex(targetIndex, targets.length)]?.focus();
      });
    },
    [isNavigable, items.length],
  );

  const registerRowRef = useCallback((index: number, node: HTMLDivElement | null) => {
    rowRefs.current[index] = node;
  }, []);

  const handleListFocus = useCallback(() => {
    pendingBlurClearVersionRef.current += 1;
    hasFocusWithinRef.current = true;
  }, []);

  const handleListBlur: JSX.FocusEventHandler<HTMLDivElement> = useCallback((e) => {
    if (e.relatedTarget != null && !e.currentTarget.contains(e.relatedTarget as Node)) {
      pendingBlurClearVersionRef.current += 1;
      hasFocusWithinRef.current = false;
      return;
    }
    if (e.relatedTarget != null) return;
    const blurVersion = pendingBlurClearVersionRef.current + 1;
    pendingBlurClearVersionRef.current = blurVersion;
    queueMicrotask(() => {
      if (pendingBlurClearVersionRef.current !== blurVersion) return;
      hasFocusWithinRef.current = false;
    });
  }, []);

  const handleFocusRow = useCallback(
    (index: number, targetIndex: number) => {
      setFocusedIndex(index);
      setFocusedTargetIndex(targetIndex);
      setFocusedItemId(ids[index] ?? null);
    },
    [ids],
  );

  const handleNavigate = useCallback(
    (index: number, targetIndex: number) => {
      if (items.length === 0) return;
      const nextFocusedIndex = clampIndex(index, items.length);
      setFocusedIndex(nextFocusedIndex);
      setFocusedTargetIndex(targetIndex);
      setFocusedItemId(ids[nextFocusedIndex] ?? null);
      focusRowByIndex(nextFocusedIndex, targetIndex);
    },
    [focusRowByIndex, ids, items.length],
  );

  const handleTabNavigate = useCallback(
    (index: number, targetIndex: number, isBackward: boolean): boolean => {
      if (items.length === 0) return false;
      const currentTargets = getRowNavigationTargets(rowRefs.current[index] ?? null);
      const nextTargetIndex = targetIndex + (isBackward ? -1 : 1);
      if (nextTargetIndex >= 0 && nextTargetIndex < currentTargets.length) {
        setFocusedIndex(index);
        setFocusedTargetIndex(nextTargetIndex);
        setFocusedItemId(ids[index] ?? null);
        focusRowByIndex(index, nextTargetIndex);
        return true;
      }
      if (isBackward) {
        for (let previousIndex = index - 1; previousIndex >= 0; previousIndex -= 1) {
          const previousTargets = getRowNavigationTargets(rowRefs.current[previousIndex] ?? null);
          if (previousTargets.length > 0) {
            const previousTargetIndex = previousTargets.length - 1;
            setFocusedIndex(previousIndex);
            setFocusedTargetIndex(previousTargetIndex);
            setFocusedItemId(ids[previousIndex] ?? null);
            focusRowByIndex(previousIndex, previousTargetIndex);
            return true;
          }
        }
        return false;
      }
      for (let nextIndex = index + 1; nextIndex < items.length; nextIndex += 1) {
        const nextTargets = getRowNavigationTargets(rowRefs.current[nextIndex] ?? null);
        if (nextTargets.length > 0) {
          setFocusedIndex(nextIndex);
          setFocusedTargetIndex(0);
          setFocusedItemId(ids[nextIndex] ?? null);
          focusRowByIndex(nextIndex, 0);
          return true;
        }
      }
      return false;
    },
    [focusRowByIndex, ids, items.length],
  );

  // Keeps the tab stop on the same item as rows come, go and move.
  useLayoutEffect(() => {
    rowRefs.current = rowRefs.current.slice(0, items.length);
    if (items.length === 0) {
      pendingBlurClearVersionRef.current += 1;
      hasFocusWithinRef.current = false;
      if (focusedIndex !== 0) setFocusedIndex(0);
      if (focusedTargetIndex !== 0) setFocusedTargetIndex(0);
      if (focusedItemId !== null) setFocusedItemId(null);
      return;
    }
    if (focusedItemId == null) {
      const nextFocusedIndex = clampIndex(focusedIndex, items.length);
      if (focusedIndex !== nextFocusedIndex) setFocusedIndex(nextFocusedIndex);
      return;
    }
    const nextFocusedIndex = ids.indexOf(focusedItemId);
    if (nextFocusedIndex === -1) {
      const fallbackFocusedIndex = clampIndex(focusedIndex, items.length);
      const fallbackFocusedItemId = ids[fallbackFocusedIndex] ?? null;
      if (focusedIndex !== fallbackFocusedIndex) setFocusedIndex(fallbackFocusedIndex);
      if (focusedItemId !== fallbackFocusedItemId) setFocusedItemId(fallbackFocusedItemId);
      if (hasFocusWithinRef.current) focusRowByIndex(fallbackFocusedIndex, focusedTargetIndex);
      return;
    }
    if (focusedIndex !== nextFocusedIndex) setFocusedIndex(nextFocusedIndex);
  }, [focusRowByIndex, focusedIndex, focusedItemId, focusedTargetIndex, ids, items.length]);

  const handleDragStart = useCallback((_event: DragStartEvent) => {
    setIsDragActive(true);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setIsDragActive(false);
      const { active, over } = event;
      if (over == null || active.id === over.id) return;
      const oldIndex = ids.indexOf(String(active.id));
      const newIndex = ids.indexOf(String(over.id));
      if (oldIndex === -1 || newIndex === -1) return;
      if (focusedItemId == null) {
        onMove(oldIndex, newIndex);
        return;
      }
      const nextFocusedIndex = resolveFocusedIndexAfterMove(focusedIndex, oldIndex, newIndex);
      setFocusedIndex(nextFocusedIndex);
      onMove(oldIndex, newIndex);
      if (hasFocusWithinRef.current) focusRowByIndex(nextFocusedIndex, focusedTargetIndex);
    },
    [focusRowByIndex, focusedIndex, focusedItemId, focusedTargetIndex, ids, onMove],
  );

  const handleDragCancel = useCallback(() => {
    setIsDragActive(false);
  }, []);

  return (
    <div
      data-component={dataComponent}
      data-drag-active={isDragActive || undefined}
      className={cn(isDragActive && '[&_*]:pointer-events-none', className)}
      onFocus={handleListFocus}
      onBlur={handleListBlur}
    >
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis]}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          {items.map((item, i) => (
            <SortableGridListItem
              key={ids[i]}
              id={ids[i] ?? String(i)}
              item={item}
              index={i}
              isMovable={getIsItemMovable(item, i)}
              isNavigable={isNavigable}
              isDragActive={isDragActive}
              enabled={enabled}
              fullRowDraggable={fullRowDraggable}
              isTabStop={focusedIndex === i}
              registerRowRef={registerRowRef}
              onFocusRow={handleFocusRow}
              onNavigate={handleNavigate}
              onTabNavigate={handleTabNavigate}
              dragLabel={dragLabel}
              renderItem={renderItem}
              itemClassName={itemClassName}
            />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  );
};
SortableGridList.displayName = SORTABLE_GRID_LIST_NAME;
