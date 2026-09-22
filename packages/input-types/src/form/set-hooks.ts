import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  PropertyArray,
  type PropertyAddedEvent,
  type PropertyMovedEvent,
  type PropertyRemovedEvent,
  type PropertySet,
  ValueTypes,
} from '../data';
import type { Occurrences } from '../schema';

const NEW_OCCURRENCE_MS = 500;
const SCROLL_OFFSET = 10;
const SCROLL_DELAY_MS = 100;

/** True for the first half second of an occurrence that started as new, for its entrance. */
export function useIsNewOccurrence(startAsNew: boolean): boolean {
  const startAsNewRef = useRef(startAsNew);
  const [isNew, setIsNew] = useState(startAsNew);

  useEffect(() => {
    if (!startAsNewRef.current) return undefined;
    const id = setTimeout(() => setIsNew(false), NEW_OCCURRENCE_MS);
    return () => clearTimeout(id);
  }, []);

  return isNew;
}

/**
 * A stable key per set for a list of them: a set has no id of its own, and an index would hand
 * one occurrence's field state to another after an add and a move.
 */
export function usePropertySetKeys(propertySets: PropertySet[]): string[] {
  const idByPropertySet = useMemo(() => new WeakMap<PropertySet, string>(), []);
  const nextIdRef = useRef(0);

  return useMemo(
    () =>
      propertySets.map((set) => {
        let id = idByPropertySet.get(set);
        if (id === undefined) {
          id = `ps-${nextIdRef.current++}`;
          idByPropertySet.set(set, id);
        }
        return id;
      }),
    [propertySets, idByPropertySet],
  );
}

export type UseScrollPanelToOccurrenceResult = {
  setOccurrenceRef: (index: number, node: HTMLDivElement | null) => void;
  scheduleScrollTo: (index: number) => void;
};

/**
 * Scrolls the nearest `[data-form-panel]` ancestor to an occurrence once the list has re-rendered
 * with it; what a set does after adding one.
 */
export function useScrollPanelToOccurrence(
  propertySets: PropertySet[],
): UseScrollPanelToOccurrenceResult {
  const itemRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const pendingScrollIndex = useRef<number | undefined>(undefined);
  const pendingTimeoutId = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const index = pendingScrollIndex.current;
    if (index === undefined) return;
    pendingScrollIndex.current = undefined;
    if (pendingTimeoutId.current !== undefined) clearTimeout(pendingTimeoutId.current);
    pendingTimeoutId.current = setTimeout(
      () => scrollPanelToOccurrence(itemRefs.current, index),
      SCROLL_DELAY_MS,
    );
  }, [propertySets]);

  useEffect(
    () => () => {
      if (pendingTimeoutId.current !== undefined) clearTimeout(pendingTimeoutId.current);
    },
    [],
  );

  const setOccurrenceRef = (index: number, node: HTMLDivElement | null): void => {
    if (node) itemRefs.current.set(index, node);
    else itemRefs.current.delete(index);
  };

  const scheduleScrollTo = (index: number): void => {
    pendingScrollIndex.current = index;
  };

  return { setOccurrenceRef, scheduleScrollTo };
}

function scrollPanelToOccurrence(refs: Map<number, HTMLDivElement>, index: number): void {
  const ref = refs.get(index);
  if (!ref) return;
  const panel = ref.closest('[data-form-panel]');
  if (!panel) return;
  const top = ref.getBoundingClientRect().top - panel.getBoundingClientRect().top - SCROLL_OFFSET;
  panel.scrollBy({ top, behavior: 'smooth' });
}

export type UseSetExpandedResult = {
  expanded: Map<number, boolean>;
  isAllExpanded: boolean;
  handleExpandAll: () => void;
  handleCollapseAll: () => void;
  handleDragStart: () => void;
  handleToggleSingle: (index: number) => void;
};

function sizeToMap(size: number, value = true): Map<number, boolean> {
  return new Map(Array.from({ length: size }, (_, index) => [index, value]));
}

/**
 * Which occurrences of a set are open. Follows the array's add, move and remove events, so an
 * occurrence stays open through a reorder, and a fresh one opens.
 */
export function useSetExpanded(propertyArray: PropertyArray, size: number): UseSetExpandedResult {
  const [expanded, setExpanded] = useState(() => sizeToMap(size, false));
  const dragSnapshotRef = useRef<Map<number, boolean> | undefined>(undefined);

  useEffect(() => {
    if (size !== 1) return;
    setExpanded(new Map([[0, true]]));
  }, [size]);

  useEffect(() => {
    const parent = propertyArray.getParent();
    const name = propertyArray.getName();
    const isOurs = (event: PropertyAddedEvent | PropertyMovedEvent | PropertyRemovedEvent) => {
      const property = event.getProperty();
      return property.getParent() === parent && property.getName() === name;
    };

    const addedHandler = (event: PropertyAddedEvent): void => {
      if (!isOurs(event)) return;
      const newMap = sizeToMap(propertyArray.getSize(), false);
      newMap.set(event.getProperty().getIndex(), true);
      setExpanded(newMap);
    };

    const movedHandler = (event: PropertyMovedEvent): void => {
      if (!isOurs(event)) return;
      const fromIndex = event.getFrom();
      const toIndex = event.getTo();
      const nextSize = propertyArray.getSize();
      const dragSnapshot = dragSnapshotRef.current;
      dragSnapshotRef.current = undefined;

      if (dragSnapshot !== undefined) {
        const values = Array.from({ length: nextSize }, (_, i) => dragSnapshot.get(i) ?? false);
        const [moved] = values.splice(fromIndex, 1);
        values.splice(toIndex, 0, moved ?? false);
        setExpanded(new Map(values.map((v, i) => [i, v])));
        return;
      }

      const newMap = sizeToMap(nextSize, false);
      newMap.set(toIndex, true);
      setExpanded(newMap);
    };

    const removedHandler = (event: PropertyRemovedEvent): void => {
      if (!isOurs(event)) return;
      const removedIndex = event.getProperty().getIndex();
      setExpanded((prev) => {
        const next = new Map<number, boolean>();
        prev.forEach((value, key) => {
          if (key < removedIndex) next.set(key, value);
          else if (key > removedIndex) next.set(key - 1, value);
        });
        return next;
      });
    };

    propertyArray.onPropertyAdded(addedHandler);
    propertyArray.onPropertyMoved(movedHandler);
    propertyArray.onPropertyRemoved(removedHandler);
    return () => {
      propertyArray.unPropertyAdded(addedHandler);
      propertyArray.unPropertyMoved(movedHandler);
      propertyArray.unPropertyRemoved(removedHandler);
    };
  }, [propertyArray]);

  const isAllExpanded = useMemo(() => {
    if (size === 0) return false;
    for (let i = 0; i < size; i++) {
      if (!expanded.get(i)) return false;
    }
    return true;
  }, [expanded, size]);

  const handleExpandAll = useCallback(() => setExpanded(sizeToMap(size)), [size]);
  const handleCollapseAll = useCallback(() => setExpanded(sizeToMap(size, false)), [size]);
  const handleDragStart = useCallback(() => {
    setExpanded((prev) => {
      dragSnapshotRef.current = prev;
      return sizeToMap(size, false);
    });
  }, [size]);
  const handleToggleSingle = useCallback((index: number) => {
    setExpanded((prev) => {
      const newMap = new Map(prev);
      newMap.set(index, !prev.get(index));
      return newMap;
    });
  }, []);

  return {
    expanded,
    isAllExpanded,
    handleExpandAll,
    handleCollapseAll,
    handleDragStart,
    handleToggleSingle,
  };
}

export type UseSetPropertyArrayOptions = {
  onCreateOccurrence?: (occurrence: PropertySet) => void;
  seedMin?: boolean;
};

/**
 * The array behind an item or option set, created when absent and filled to the minimum in an
 * effect: `addSet()` fires tree events, which a render must not.
 */
export function useSetPropertyArray(
  name: string,
  propertySet: PropertySet,
  occurrences: Occurrences,
  options?: UseSetPropertyArrayOptions,
): PropertyArray {
  const propertyArray = useMemo(() => {
    let array = propertySet.getPropertyArray(name);
    if (array === undefined) {
      array = PropertyArray.create()
        .setName(name)
        .setType(ValueTypes.DATA)
        .setParent(propertySet)
        .build();
      propertySet.addPropertyArray(array);
    }
    return array;
  }, [name, propertySet]);

  const onCreateOccurrence = options?.onCreateOccurrence;
  const seedMin = options?.seedMin ?? true;

  useEffect(() => {
    if (!seedMin) return;
    const min = occurrences.getMinimum();
    while (propertyArray.getSize() < min) {
      onCreateOccurrence?.(propertyArray.addSet());
    }
  }, [propertyArray, occurrences, onCreateOccurrence, seedMin]);

  return propertyArray;
}
