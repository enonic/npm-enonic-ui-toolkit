/** Which vertical zone of the hovered row the dragged item lands in. */
export type SortableDropSide = 'above' | 'below' | 'after';

/** Net vertical travel direction during a drag. */
export type SortableDragDirection = 'up' | 'down';

/** The live drag state a tree-shaped list resolves a drop from. */
export type SortableDragInfo = {
  activeIndex: number;
  /** The row under the pointer; equals `activeIndex` at the list edge. */
  overIndex: number;
  /** `above`/`below` the hovered row's midpoint, or `after` its lower edge. */
  side: SortableDropSide;
  direction: SortableDragDirection;
};

type VerticalRect = {
  top: number;
  height: number;
};

export type ProjectionDragInfoParams = {
  activeIndex: number;
  overIndex: number;
  deltaY: number;
  activeTranslatedRect: VerticalRect | null;
  activeInitialRect: VerticalRect | null;
  overRect: VerticalRect | null;
};

function getMidpoint(rect: VerticalRect): number {
  return rect.top + rect.height / 2;
}

function getDraggedMidpoint(params: ProjectionDragInfoParams): number | undefined {
  if (params.activeTranslatedRect != null) return getMidpoint(params.activeTranslatedRect);
  if (params.activeInitialRect != null)
    return getMidpoint(params.activeInitialRect) + params.deltaY;
  return undefined;
}

function getDropSide(
  params: ProjectionDragInfoParams,
  draggedMidpoint: number | undefined,
  direction: SortableDragDirection,
): SortableDropSide {
  const { activeIndex, overIndex, overRect } = params;
  if (draggedMidpoint === undefined || overRect == null)
    return direction === 'up' ? 'above' : 'below';
  const overMidpoint = getMidpoint(overRect);
  if (draggedMidpoint === overMidpoint) return overIndex < activeIndex ? 'above' : 'below';
  if (draggedMidpoint < overMidpoint) return 'above';
  return draggedMidpoint > overRect.top + overRect.height ? 'after' : 'below';
}

export function getProjectionDragInfo(params: ProjectionDragInfoParams): SortableDragInfo {
  const direction: SortableDragDirection = params.deltaY < 0 ? 'up' : 'down';
  return {
    activeIndex: params.activeIndex,
    overIndex: params.overIndex,
    side: getDropSide(params, getDraggedMidpoint(params), direction),
    direction,
  };
}

/** The hovered-row drop zone as `verticalListSortingStrategy`'s index in the original array. */
export function getProjectionPlaceholderIndex(info: SortableDragInfo, itemCount: number): number {
  if (info.activeIndex === info.overIndex) return info.activeIndex;
  // Crossing downward removes the active row above the gap; crossing upward leaves it below.
  const isMovingDown = info.activeIndex < info.overIndex;
  const index =
    info.side === 'above'
      ? info.overIndex - (isMovingDown ? 1 : 0)
      : info.overIndex + (isMovingDown ? 0 : 1);
  return Math.max(0, Math.min(index, itemCount - 1));
}
