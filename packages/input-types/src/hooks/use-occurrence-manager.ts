import { useCallback, useEffect, useMemo, useState } from 'react';

import type { Value } from '../data';
import type { InputTypeConfig } from '../descriptor/input-type-config';
import type { InputTypeDescriptor } from '../descriptor/input-type-descriptor';
import { OccurrenceManager, type OccurrenceManagerState } from '../descriptor/occurrence-manager';
import type { Occurrences } from '../schema';

export type UseOccurrenceManagerParams<C extends InputTypeConfig = InputTypeConfig> = {
  occurrences: Occurrences;
  descriptor: InputTypeDescriptor<C>;
  config: C;
  /** Read once, at construction; later values arrive through `sync`. */
  initialValues: Value[];
  /** Whether to fill up to the minimum (at least one) on mount; a selector does not. */
  autoSeed?: boolean;
  /** What the fill adds; the type's null value when omitted. */
  defaultValue?: Value;
};

export type UseOccurrenceManagerResult = {
  state: OccurrenceManagerState;
  minFill: number;
  add: (value?: Value) => boolean;
  remove: (index: number) => boolean;
  move: (fromIndex: number, toIndex: number) => boolean;
  set: (index: number, value: Value, rawValue?: string) => void;
  sync: (values: Value[]) => Value[];
  setTransientError: (occurrenceId: string, message: string) => boolean;
  clearTransientError: (occurrenceId: string) => boolean;
  clearAllTransientErrors: () => void;
  /** The ids at call time, to translate a captured id back to a position. */
  getOccurrenceIds: () => string[];
};

export function useOccurrenceManager<C extends InputTypeConfig = InputTypeConfig>({
  occurrences,
  descriptor,
  config,
  initialValues,
  autoSeed = true,
  defaultValue,
}: UseOccurrenceManagerParams<C>): UseOccurrenceManagerResult {
  const minFill = autoSeed ? Math.max(occurrences.getMinimum(), 1) : 0;

  const manager = useMemo(() => {
    const created = new OccurrenceManager<C>(occurrences, descriptor, config, initialValues);
    // Eager fill, so the first render shows the minimum; the fill stops when add() is refused.
    while (created.getCount() < minFill) {
      if (!created.add(defaultValue)) break;
    }
    return created;
  }, [occurrences, descriptor, config, minFill, defaultValue]);

  const [state, setState] = useState<OccurrenceManagerState>(() => manager.validate());

  useEffect(() => {
    setState(manager.validate());
  }, [manager]);

  const add = useCallback(
    (value?: Value): boolean => {
      const added = manager.add(value);
      if (added) setState(manager.validate());
      return added;
    },
    [manager, defaultValue],
  );

  const remove = useCallback(
    (index: number): boolean => {
      const removed = manager.remove(index);
      if (removed) setState(manager.validate());
      return removed;
    },
    [manager],
  );

  const move = useCallback(
    (fromIndex: number, toIndex: number): boolean => {
      const moved = manager.move(fromIndex, toIndex);
      if (moved) setState(manager.validate());
      return moved;
    },
    [manager],
  );

  const set = useCallback(
    (index: number, value: Value, rawValue?: string): void => {
      manager.set(index, value, rawValue);
      setState(manager.validate());
    },
    [manager],
  );

  const sync = useCallback(
    (values: Value[]): Value[] => {
      manager.setValues(values);
      while (manager.getCount() < minFill) {
        if (!manager.add(defaultValue)) break;
      }
      setState(manager.validate());
      return manager.getValues();
    },
    [manager, minFill, defaultValue],
  );

  const setTransientError = useCallback(
    (occurrenceId: string, message: string): boolean => {
      const ok = manager.setTransientError(occurrenceId, message);
      if (ok) setState(manager.validate());
      return ok;
    },
    [manager],
  );

  const clearTransientError = useCallback(
    (occurrenceId: string): boolean => {
      const cleared = manager.clearTransientError(occurrenceId);
      if (cleared) setState(manager.validate());
      return cleared;
    },
    [manager],
  );

  const clearAllTransientErrors = useCallback((): void => {
    if (!manager.hasTransientErrors()) return;
    manager.clearAllTransientErrors();
    setState(manager.validate());
  }, [manager]);

  const getOccurrenceIds = useCallback((): string[] => manager.getIds(), [manager]);

  return {
    state,
    minFill,
    add,
    remove,
    move,
    set,
    sync,
    setTransientError,
    clearTransientError,
    clearAllTransientErrors,
    getOccurrenceIds,
  };
}
