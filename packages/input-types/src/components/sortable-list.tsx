import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  type DragMoveEvent,
  type DragOverEvent,
  DragOverlay,
  type DragStartEvent,
  KeyboardSensor,
  type MeasuringConfiguration,
  MeasuringStrategy,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  type SortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { cn } from '@enonic/ui';
import { GripVertical } from 'lucide-react';
import type { JSX, ReactElement, ReactNode } from 'react';
import { useCallback, useMemo, useState } from 'react';

import {
  getProjectionDragInfo,
  getProjectionPlaceholderIndex,
  type SortableDragDirection,
  type SortableDragInfo,
} from './projection-drag-info';
import {
  FULL_ROW_TOUCH_SENSOR_OPTIONS,
  HANDLE_TOUCH_SENSOR_OPTIONS,
  MOUSE_SENSOR_OPTIONS,
  PrimaryButtonMouseSensor,
} from './sortable-sensors';

export type {
  SortableDragDirection,
  SortableDragInfo,
  SortableDropSide,
} from './projection-drag-info';

/** What `renderItem` and `itemClassName` get per row. */
export type SortableListItemContext<T> = {
  item: T;
  index: number;
  isDragging: boolean;
  isDragActive: boolean;
  isFocused: boolean;
  isMovable: boolean;
  /** Projection mode: the indent of the dragged row's projected level, set on that row mid-drag. */
  projectedIndent?: number;
};

/** A consumer's answer to a drag state in projection mode. */
export type SortableDropHint = {
  indent: number;
  allowed: boolean;
};

export type SortableListContainerProps = {
  role?: JSX.AriaRole;
  'aria-label'?: string;
};

export type SortableListItemProps = {
  role?: JSX.AriaRole;
  tabIndex?: number;
  'aria-disabled'?: boolean;
  'aria-expanded'?: boolean;
  'aria-level'?: number;
  'aria-posinset'?: number;
  'aria-roledescription'?: string;
  'aria-selected'?: boolean;
  'aria-setsize'?: number;
};

/** A vertical drag-to-reorder list with a grip per row; the item and option sets sit on it. */
export type SortableListProps<T> = {
  'data-component'?: string;
  items: T[];
  keyExtractor: (item: T, index: number) => string;
  onDragStart?: (index: number) => void;
  /**
   * In projection mode `toIndex` is the projected placeholder, and `info` the final drag state,
   * called only when the final projection is allowed.
   */
  onMove: (fromIndex: number, toIndex: number, info?: SortableDragInfo) => void;
  enabled: boolean;
  fullRowDraggable?: boolean;
  isItemMovable?: (item: T, index: number) => boolean;
  /** Hand the grip to `renderItem` instead of rendering it first in the row. */
  controlGrip?: boolean;
  /**
   * Projection mode renders the active item twice during a drag — the in-list placeholder and
   * the inert overlay — so keep this free of side effects and mindful of duplicated ids.
   */
  renderItem: (context: SortableListItemContext<T>, grip?: ReactNode) => ReactNode;
  dragLabel?: string;
  /** Drives the dragged row's opacity while over a forbidden target. */
  isDropAllowed?: (fromIndex: number, toIndex: number) => boolean;
  animateLayoutChanges?: (args: { isSorting: boolean; wasDragging: boolean }) => boolean;
  /**
   * Projection mode for tree-shaped lists: the list reports the live drag state and applies the
   * hint's indent to the dragged row. `null` means no projection — shown as disallowed, no move.
   */
  resolveDrop?: (info: SortableDragInfo, items: T[]) => SortableDropHint | null;
  itemClassName?: string | ((context: SortableListItemContext<T>) => string);
  containerProps?: SortableListContainerProps;
  /**
   * Overriding `role` drops dnd-kit's button ARIA, so supply `aria-disabled` and
   * `aria-roledescription` too; a roving tab stop consumer returns `tabIndex`.
   */
  getItemProps?: (context: SortableListItemContext<T>) => SortableListItemProps;
  /** Whether dnd-kit returns focus to the activator after a keyboard drag. */
  restoreFocus?: boolean;
  className?: string;
};

type Transform = { x: number; y: number; scaleX: number; scaleY: number };

function toTransformCSS(transform: Transform | null): string | undefined {
  if (transform == null) return undefined;
  return `translate3d(${Math.round(transform.x)}px, ${Math.round(transform.y)}px, 0)`;
}

function restrictToVerticalAxis({ transform }: { transform: Transform }): Transform {
  return { ...transform, x: 0 };
}

// The tree collapses the dragged node and shifts rows, so the `over` rects are re-measured always.
const PROJECTION_MEASURING: MeasuringConfiguration = {
  droppable: { strategy: MeasuringStrategy.Always },
};

const KEYBOARD_SENSOR_OPTIONS = { coordinateGetter: sortableKeyboardCoordinates };

type ProjectionDragEvent = DragMoveEvent | DragEndEvent;

type ProjectionDrop = {
  info: SortableDragInfo;
  hint: SortableDropHint | null;
  toIndex: number;
};

function getOverId(event: ProjectionDragEvent): string {
  return event.over == null ? String(event.active.id) : String(event.over.id);
}

function getProjectionDragInfoFromEvent(
  event: ProjectionDragEvent,
  ids: string[],
): SortableDragInfo | null {
  const { active, over, delta } = event;
  const activeIndex = ids.indexOf(String(active.id));
  const overIndex = ids.indexOf(getOverId(event));
  if (activeIndex === -1 || overIndex === -1) return null;
  return getProjectionDragInfo({
    activeIndex,
    overIndex,
    deltaY: delta.y,
    activeTranslatedRect: active.rect.current.translated,
    activeInitialRect: active.rect.current.initial,
    overRect: over?.rect ?? null,
  });
}

function hasProjectionIntent(event: ProjectionDragEvent): boolean {
  const { active, over, delta } = event;
  const direction: SortableDragDirection = delta.y < 0 ? 'up' : 'down';
  // `over === active` carries intent only at the list edge, dragging down past the last row.
  const atOwnSlot = over == null || active.id === over.id;
  return !atOwnSlot || (direction === 'down' && delta.y > 0);
}

function getProjectionDropFromEvent<T>(
  event: ProjectionDragEvent,
  ids: string[],
  items: T[],
  resolveDrop: (info: SortableDragInfo, items: T[]) => SortableDropHint | null,
): ProjectionDrop | null {
  if (!hasProjectionIntent(event)) return null;
  const info = getProjectionDragInfoFromEvent(event, ids);
  if (info == null) return null;
  return {
    info,
    hint: resolveDrop(info, items),
    toIndex: getProjectionPlaceholderIndex(info, ids.length),
  };
}

type SortableListItemInternalProps<T> = {
  id: string;
  item: T;
  index: number;
  isMovable: boolean;
  isDragActive: boolean;
  enabled: boolean;
  controlGrip: boolean;
  fullRowDraggable: boolean;
  useDragPlaceholder: boolean;
  dropAllowed: boolean;
  projectedIndent?: number;
  dragLabel?: string;
  animateLayoutChanges?: (args: { isSorting: boolean; wasDragging: boolean }) => boolean;
  renderItem: (context: SortableListItemContext<T>, grip?: ReactNode) => ReactNode;
  itemClassName?: string | ((context: SortableListItemContext<T>) => string);
  getItemProps?: (context: SortableListItemContext<T>) => SortableListItemProps;
};

const SortableListItem = <T,>({
  id,
  item,
  index,
  isMovable,
  isDragActive,
  enabled,
  controlGrip,
  fullRowDraggable,
  useDragPlaceholder,
  dropAllowed,
  projectedIndent,
  dragLabel,
  animateLayoutChanges,
  renderItem,
  itemClassName,
  getItemProps,
}: SortableListItemInternalProps<T>): ReactElement => {
  const [isFocused, setIsFocused] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: !enabled || !isMovable,
    animateLayoutChanges,
  });

  const handleKeyDown: JSX.KeyboardEventHandler<HTMLDivElement> = (e) => {
    if (e.target !== e.currentTarget) return;
    (listeners?.onKeyDown as JSX.KeyboardEventHandler<HTMLDivElement> | undefined)?.(e);
  };

  // With the whole row draggable, dnd-kit's own key handler must not replace the guarded one.
  const rowListeners = useMemo(() => {
    if (!fullRowDraggable || !isMovable || !listeners) return undefined;
    const { onKeyDown: _ignored, ...rest } = listeners;
    return rest;
  }, [fullRowDraggable, isMovable, listeners]);

  const handleFocus = (): void => setIsFocused(true);
  const handleBlur: JSX.FocusEventHandler<HTMLDivElement> = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsFocused(false);
  };

  const context: SortableListItemContext<T> = {
    item,
    index,
    isDragging,
    isDragActive,
    isFocused,
    isMovable,
    projectedIndent: isDragging ? projectedIndent : undefined,
  };
  const resolvedClassName =
    typeof itemClassName === 'function' ? itemClassName(context) : itemClassName;
  const itemProps = getItemProps?.(context);
  const hasCustomRole = itemProps?.role != null;
  // dnd-kit's aria-disabled says "not draggable", which reads right only on its own button role.
  const defaultAriaDisabled = hasCustomRole ? !enabled || undefined : attributes['aria-disabled'];

  const grip = isMovable && (
    <button
      type="button"
      className={cn(
        'flex shrink-0 items-center text-subtle',
        fullRowDraggable
          ? 'pointer-events-none'
          : cn('cursor-grab touch-none', 'hover:text-foreground', isDragging && 'cursor-grabbing'),
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
  );

  return (
    <div
      ref={setNodeRef}
      data-drag-placeholder={(useDragPlaceholder && isDragging) || undefined}
      onKeyDown={handleKeyDown}
      onFocus={handleFocus}
      onBlur={handleBlur}
      role={itemProps?.role ?? (attributes.role as JSX.AriaRole)}
      tabIndex={itemProps?.tabIndex ?? (isMovable && enabled ? attributes.tabIndex : undefined)}
      aria-disabled={itemProps?.['aria-disabled'] ?? defaultAriaDisabled}
      aria-pressed={hasCustomRole ? undefined : attributes['aria-pressed']}
      aria-roledescription={
        itemProps?.['aria-roledescription'] ??
        (hasCustomRole ? undefined : attributes['aria-roledescription'])
      }
      aria-describedby={isMovable && enabled ? attributes['aria-describedby'] : undefined}
      aria-expanded={itemProps?.['aria-expanded']}
      aria-level={itemProps?.['aria-level']}
      aria-posinset={itemProps?.['aria-posinset']}
      aria-selected={itemProps?.['aria-selected']}
      aria-setsize={itemProps?.['aria-setsize']}
      data-dragging={isDragging || undefined}
      style={{
        transform: toTransformCSS(transform),
        transition: transition ?? undefined,
        zIndex: isDragging && !useDragPlaceholder ? 999 : undefined,
      }}
      className={cn(
        'relative flex items-center rounded outline-none',
        'focus-visible:ring-2 focus-visible:ring-ring/25 focus-visible:ring-inset',
        isDragging &&
          (useDragPlaceholder
            ? 'bg-surface-neutral opacity-30 ring-1 ring-main/15'
            : 'bg-surface-neutral shadow-[0_2px_8px_2px] ring-1 shadow-main/10 ring-main/5'),
        isDragging && !dropAllowed && 'opacity-40',
        // A press-drag on a full-row target must not turn into a text selection.
        enabled && fullRowDraggable && isMovable && 'select-none',
        enabled &&
          fullRowDraggable &&
          isMovable &&
          (isDragging ? 'cursor-grabbing' : 'cursor-grab'),
        resolvedClassName,
      )}
      {...rowListeners}
    >
      {!controlGrip && grip}
      {renderItem(context, grip)}
    </div>
  );
};

type SortableListDragOverlayProps<T> = {
  item: T;
  index: number;
  isMovable: boolean;
  controlGrip: boolean;
  fullRowDraggable: boolean;
  dropAllowed: boolean;
  projectedIndent?: number;
  renderItem: (context: SortableListItemContext<T>, grip?: ReactNode) => ReactNode;
  itemClassName?: string | ((context: SortableListItemContext<T>) => string);
};

const SortableListDragOverlay = <T,>({
  item,
  index,
  isMovable,
  controlGrip,
  fullRowDraggable,
  dropAllowed,
  projectedIndent,
  renderItem,
  itemClassName,
}: SortableListDragOverlayProps<T>): ReactElement => {
  const context: SortableListItemContext<T> = {
    item,
    index,
    isDragging: true,
    isDragActive: true,
    isFocused: false,
    isMovable,
    projectedIndent,
  };
  const resolvedClassName =
    typeof itemClassName === 'function' ? itemClassName(context) : itemClassName;
  const grip = isMovable && (
    <span className="flex shrink-0 items-center text-subtle" aria-hidden>
      <GripVertical className="size-5" />
    </span>
  );
  return (
    <div
      data-drag-overlay
      aria-hidden
      inert
      className={cn(
        'relative flex items-center rounded bg-surface-neutral outline-none',
        'shadow-[0_2px_8px_2px] ring-1 shadow-main/10 ring-main/5',
        !dropAllowed && 'opacity-40',
        fullRowDraggable && isMovable && 'cursor-grabbing',
        resolvedClassName,
      )}
    >
      {!controlGrip && grip}
      {renderItem(context, grip)}
    </div>
  );
};

const SORTABLE_LIST_NAME = 'SortableList';

export const SortableList = <T,>({
  items,
  keyExtractor,
  onDragStart: onDragStartProp,
  onMove,
  enabled,
  fullRowDraggable = false,
  isItemMovable,
  isDropAllowed,
  animateLayoutChanges,
  resolveDrop,
  dragLabel,
  controlGrip = false,
  renderItem,
  itemClassName,
  className,
  containerProps,
  getItemProps,
  restoreFocus = true,
  'data-component': dataComponent = SORTABLE_LIST_NAME,
}: SortableListProps<T>): ReactElement => {
  const ids = useMemo(() => items.map((item, i) => keyExtractor(item, i)), [items, keyExtractor]);
  const isMovable = items.length >= 2;
  const [dropAllowed, setDropAllowed] = useState(true);
  const [isDragActive, setIsDragActive] = useState(false);
  const [drop, setDrop] = useState<ProjectionDrop | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const activeIndex = activeId == null ? -1 : ids.indexOf(activeId);
  const activeItem = activeIndex === -1 ? undefined : items[activeIndex];

  const projectionSortingStrategy = useCallback<SortingStrategy>(
    (args) => {
      if (!drop?.hint?.allowed) return null;
      return verticalListSortingStrategy({ ...args, overIndex: drop.toIndex });
    },
    [drop],
  );

  const applyDrop = useCallback((nextDrop: ProjectionDrop | null) => {
    setDrop(nextDrop);
    setDropAllowed(nextDrop == null ? true : (nextDrop.hint?.allowed ?? false));
  }, []);

  const sensors = useSensors(
    useSensor(PrimaryButtonMouseSensor, MOUSE_SENSOR_OPTIONS),
    useSensor(
      TouchSensor,
      fullRowDraggable ? FULL_ROW_TOUCH_SENSOR_OPTIONS : HANDLE_TOUCH_SENSOR_OPTIONS,
    ),
    useSensor(KeyboardSensor, KEYBOARD_SENSOR_OPTIONS),
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      applyDrop(null);
      setIsDragActive(true);
      setActiveId(resolveDrop == null ? null : String(event.active.id));
      if (onDragStartProp != null) {
        const index = ids.indexOf(String(event.active.id));
        if (index !== -1) onDragStartProp(index);
      }
    },
    [ids, onDragStartProp, resolveDrop, applyDrop],
  );

  // Driven by both `onDragMove` and `onDragOver`, so the indicator never lags the displacement.
  const applyProjection = useCallback(
    (event: DragMoveEvent) => {
      if (resolveDrop == null) return;
      applyDrop(getProjectionDropFromEvent(event, ids, items, resolveDrop));
    },
    [ids, items, resolveDrop, applyDrop],
  );

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      if (resolveDrop != null) {
        applyProjection(event);
        return;
      }
      if (isDropAllowed == null) return;
      const { active, over } = event;
      if (over == null || active.id === over.id) {
        setDropAllowed(true);
        return;
      }
      const fromIndex = ids.indexOf(String(active.id));
      const toIndex = ids.indexOf(String(over.id));
      setDropAllowed(fromIndex !== -1 && toIndex !== -1 && isDropAllowed(fromIndex, toIndex));
    },
    [ids, isDropAllowed, resolveDrop, applyProjection],
  );

  const handleDragMove = useCallback(
    (event: DragMoveEvent) => applyProjection(event),
    [applyProjection],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setIsDragActive(false);
      setActiveId(null);
      applyDrop(null);
      if (resolveDrop != null) {
        const finalDrop = getProjectionDropFromEvent(event, ids, items, resolveDrop);
        if (!finalDrop?.hint?.allowed) return;
        onMove(finalDrop.info.activeIndex, finalDrop.toIndex, finalDrop.info);
        return;
      }
      const { active, over } = event;
      if (over == null || active.id === over.id) return;
      const oldIndex = ids.indexOf(String(active.id));
      const newIndex = ids.indexOf(String(over.id));
      if (oldIndex === -1 || newIndex === -1) return;
      onMove(oldIndex, newIndex);
    },
    [ids, items, onMove, resolveDrop, applyDrop],
  );

  const handleDragCancel = useCallback(() => {
    setIsDragActive(false);
    setActiveId(null);
    applyDrop(null);
  }, [applyDrop]);

  return (
    <div
      data-component={dataComponent}
      data-drag-active={isDragActive || undefined}
      className={cn(isDragActive && '[&_*]:pointer-events-none', className)}
      role={containerProps?.role}
      aria-label={containerProps?.['aria-label']}
    >
      <DndContext
        sensors={sensors}
        accessibility={{ restoreFocus, container: document.body }}
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis]}
        measuring={resolveDrop != null ? PROJECTION_MEASURING : undefined}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <SortableContext
          items={ids}
          strategy={resolveDrop == null ? verticalListSortingStrategy : projectionSortingStrategy}
        >
          {items.map((item, i) => (
            <SortableListItem
              key={ids[i]}
              id={ids[i] ?? String(i)}
              item={item}
              index={i}
              isMovable={isItemMovable?.(item, i) ?? isMovable}
              isDragActive={isDragActive}
              controlGrip={controlGrip}
              enabled={enabled}
              fullRowDraggable={fullRowDraggable}
              useDragPlaceholder={resolveDrop != null}
              dropAllowed={dropAllowed}
              projectedIndent={
                drop?.hint != null && ids[i] === activeId ? drop.hint.indent : undefined
              }
              dragLabel={dragLabel}
              animateLayoutChanges={animateLayoutChanges}
              renderItem={renderItem}
              itemClassName={itemClassName}
              getItemProps={getItemProps}
            />
          ))}
        </SortableContext>
        {resolveDrop != null && (
          <DragOverlay>
            {activeItem !== undefined && (
              <SortableListDragOverlay
                item={activeItem}
                index={activeIndex}
                isMovable={isItemMovable?.(activeItem, activeIndex) ?? isMovable}
                controlGrip={controlGrip}
                fullRowDraggable={fullRowDraggable}
                dropAllowed={dropAllowed}
                projectedIndent={drop?.hint?.indent}
                renderItem={renderItem}
                itemClassName={itemClassName}
              />
            )}
          </DragOverlay>
        )}
      </DndContext>
    </div>
  );
};
SortableList.displayName = SORTABLE_LIST_NAME;
