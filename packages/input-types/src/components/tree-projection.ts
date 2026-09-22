/**
 * Where a drag lands in a tree-shaped list. The list renders flat, depth first, but items live
 * inside containers, so a drag resolves to a `{container, index}`. At the drag gap this builds the
 * stack of candidate slots from the deepest (entering the region above, or after the nearest item)
 * to the shallowest (climbing out past the owning layouts), and the drag direction picks within it:
 * up enters the deeper slot, down steps out to the shallower. The horizontal axis stays locked; the
 * level comes from the neighbours plus travel direction, so a small nudge moves between levels.
 *
 * A container row has three zones: its upper half is the gap before it, its lower half targets
 * index 0 inside it, and past its lower edge is the gap after it. At a container's trailing leaf the
 * lower half appends inside that container while past the leaf selects the exit gap.
 */
import type { SortableDropSide } from './projection-drag-info';

export type DropNodeKind = 'container' | 'item';

export type DropNode = {
  /** Unique within the list. */
  id: string;
  /** The parent row; `null` for the root. */
  parentId: string | null;
  /** 1-based, as the flattened tree renders it. */
  depth: number;
  /** A `container` holds ordered `item` children; an `item` is what drags. */
  kind: DropNodeKind;
};

export type DropDirection = 'up' | 'down';

export type ProjectTreeDropParams = {
  /** The visible rows in display order, the dragged one included. */
  nodes: DropNode[];
  activeId: string;
  /** The row under the pointer; may equal `activeId` at the list edge. */
  overId: string;
  side: SortableDropSide;
  /** Picks the deeper (up) or shallower (down) slot in a stack. */
  direction: DropDirection;
  /** When it says no, the projection is flagged not allowed. */
  isContainerAllowed?: (containerId: string, activeId: string) => boolean;
};

export type DropProjection = {
  containerId: string;
  /** The insertion index in the container, the source already excluded. */
  index: number;
  /** `container.depth + 1`; drives the drop indicator's indent. */
  depth: number;
  allowed: boolean;
};

type Slot = {
  containerId: string;
  index: number;
  depth: number;
};

export function projectTreeDrop(params: ProjectTreeDropParams): DropProjection | null {
  const { nodes, activeId, direction, isContainerAllowed } = params;
  const byId = new Map<string, DropNode>();
  for (const node of nodes) byId.set(node.id, node);
  const active = byId.get(activeId);
  if (active === undefined) return null;

  // Indices and neighbours come from the list with the dragged subtree removed, which is the list
  // the move will apply to.
  const visible = excludeSubtree(nodes, active);
  const target = resolveTarget(params, nodes, visible, active, byId);
  if (target == null) return null;

  if (target.type === 'container') {
    const { container, index } = target;
    const allowed = isContainerAllowed?.(container.id, activeId) ?? true;
    return { containerId: container.id, index, depth: container.depth + 1, allowed };
  }

  const stack = buildSlotStack(target.before, target.after, target.flatIndex, visible, byId);
  const chosen = direction === 'up' ? stack[0] : stack[stack.length - 1];
  if (chosen === undefined) return null;
  const allowed = isContainerAllowed?.(chosen.containerId, activeId) ?? true;
  return { containerId: chosen.containerId, index: chosen.index, depth: chosen.depth, allowed };
}

type Gap = {
  type: 'gap';
  before: DropNode | undefined;
  after: DropNode | undefined;
  /** The insertion position in `visible`: the visible rows above the gap. */
  flatIndex: number;
};

type ContainerTarget = {
  type: 'container';
  container: DropNode;
  index: number;
};

type ResolvedTarget = Gap | ContainerTarget;

function resolveTarget(
  params: ProjectTreeDropParams,
  nodes: DropNode[],
  visible: DropNode[],
  active: DropNode,
  byId: Map<string, DropNode>,
): ResolvedTarget | null {
  const { activeId, overId, side } = params;

  // Hovering its own slot, typically at the list edge: anchor on the dragged item's neighbours so
  // a down-drag can step out below the last row.
  if (overId === activeId) {
    const activeFullIndex = nodes.findIndex((node) => node.id === activeId);
    const before = nodes[activeFullIndex - 1];
    if (activeFullIndex <= 0 || before === undefined) return null;
    let end = activeFullIndex + 1;
    while (end < nodes.length && (nodes[end]?.depth ?? 0) > active.depth) end++;
    const after = nodes[end];
    const beforeVisibleIndex = visible.findIndex((node) => node.id === before.id);
    if (beforeVisibleIndex === -1) return null;
    return { type: 'gap', before, after, flatIndex: beforeVisibleIndex + 1 };
  }

  const overIndex = visible.findIndex((node) => node.id === overId);
  const over = visible[overIndex];
  if (overIndex === -1 || over === undefined) return null;

  if (side === 'after') {
    return { type: 'gap', before: over, after: visible[overIndex + 1], flatIndex: overIndex + 1 };
  }
  if (over.kind === 'container' && side === 'below') {
    return { type: 'container', container: over, index: 0 };
  }

  const next = visible[overIndex + 1];
  const isTrailingLeaf = over.kind === 'item' && (next === undefined || next.depth < over.depth);
  if (isTrailingLeaf && side === 'below') {
    const container = byId.get(over.parentId ?? '');
    if (container?.kind === 'container') {
      return {
        type: 'container',
        container,
        index: countItemsBefore(visible, container.id, overIndex + 1),
      };
    }
  }
  if (side === 'below') {
    return { type: 'gap', before: over, after: visible[overIndex + 1], flatIndex: overIndex + 1 };
  }
  return { type: 'gap', before: visible[overIndex - 1], after: over, flatIndex: overIndex };
}

function buildSlotStack(
  before: DropNode | undefined,
  after: DropNode | undefined,
  flatIndex: number,
  visible: DropNode[],
  byId: Map<string, DropNode>,
): Slot[] {
  if (before === undefined) return [];
  const region = before.kind === 'container' ? before : byId.get(before.parentId ?? '');
  if (region === undefined || region.kind !== 'container') return [];

  const stack: Slot[] = [];
  // Entering the region directly below the gap, when it opens right under its layout.
  if (after !== undefined && after.kind === 'container' && after.parentId === before.id) {
    stack.push({ containerId: after.id, index: 0, depth: after.depth + 1 });
  }
  // The deepest item slot: inside `before` (a region header) or right after it (an item).
  stack.push({
    containerId: region.id,
    index: countItemsBefore(visible, region.id, flatIndex),
    depth: region.depth + 1,
  });
  // Climb out region by region, after each owning layout, down to the next row's level.
  let current = region;
  for (;;) {
    const owner = byId.get(current.parentId ?? '');
    if (owner === undefined || owner.parentId == null) break;
    const parentRegion = byId.get(owner.parentId);
    if (parentRegion === undefined || parentRegion.kind !== 'container') break;
    stack.push({
      containerId: parentRegion.id,
      index: countItemsBefore(visible, parentRegion.id, flatIndex),
      depth: parentRegion.depth + 1,
    });
    current = parentRegion;
  }
  // The row below the gap pins how shallow the drop may climb.
  const minRegionDepth =
    after === undefined ? 1 : after.kind === 'item' ? after.depth - 1 : after.depth;
  const filtered = stack.filter((slot) => slot.depth - 1 >= minRegionDepth);
  return filtered.length > 0 ? filtered : stack.slice(0, 1);
}

function excludeSubtree(nodes: DropNode[], active: DropNode): DropNode[] {
  const activeIndex = nodes.findIndex((node) => node.id === active.id);
  if (activeIndex === -1) return nodes;
  let end = activeIndex + 1;
  while (end < nodes.length && (nodes[end]?.depth ?? 0) > active.depth) end++;
  return [...nodes.slice(0, activeIndex), ...nodes.slice(end)];
}

function countItemsBefore(visible: DropNode[], regionId: string, flatIndex: number): number {
  let count = 0;
  const limit = Math.min(flatIndex, visible.length);
  for (let i = 0; i < limit; i++) {
    const node = visible[i];
    if (node?.kind === 'item' && node.parentId === regionId) count++;
  }
  return count;
}
