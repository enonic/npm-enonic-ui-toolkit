import { useCallback, useEffect, useMemo, useState } from 'react';

import type { PropertySet } from '../data';
import {
  SetOccurrenceManager,
  type SetOccurrenceManagerState,
} from '../descriptor/set-occurrence-manager';
import type { Occurrences } from '../schema';

export type UseSetOccurrenceManagerResult = {
  state: SetOccurrenceManagerState;
  add: () => { id: string } | undefined;
  remove: (index: number) => boolean;
  move: (fromIndex: number, toIndex: number) => boolean;
};

/** Does not seed: the caller keeps the array at the minimum. */
export function useSetOccurrenceManager(
  occurrences: Occurrences,
  propertySets: PropertySet[],
): UseSetOccurrenceManagerResult {
  const manager = useMemo(() => new SetOccurrenceManager(occurrences, propertySets), [occurrences]);
  const [state, setState] = useState<SetOccurrenceManagerState>(() => manager.getState());

  useEffect(() => {
    manager.syncPropertySets(propertySets);
    setState(manager.getState());
  }, [manager, propertySets]);

  const add = useCallback((): { id: string } | undefined => {
    const result = manager.add();
    if (result !== undefined) setState(manager.getState());
    return result;
  }, [manager]);

  const remove = useCallback(
    (index: number): boolean => {
      const removed = manager.remove(index);
      if (removed) setState(manager.getState());
      return removed;
    },
    [manager],
  );

  const move = useCallback(
    (fromIndex: number, toIndex: number): boolean => {
      const moved = manager.move(fromIndex, toIndex);
      if (moved) setState(manager.getState());
      return moved;
    },
    [manager],
  );

  return { state, add, remove, move };
}
