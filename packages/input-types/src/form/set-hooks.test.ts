import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { PropertySet } from '../data';
import { PropertyArray, PropertyTree } from '../data';
import { Occurrences } from '../schema';
import { useSetPropertyArray } from './set-hooks';

const mocks = vi.hoisted(() => ({
  useMemo: vi.fn((factory: () => unknown) => factory()),
  useEffect: vi.fn((effect: () => void) => effect()),
}));

vi.mock('react', () => ({
  useMemo: mocks.useMemo,
  useEffect: mocks.useEffect,
  useCallback: vi.fn((callback: unknown) => callback),
  useRef: vi.fn((initial: unknown) => ({ current: initial })),
  useState: vi.fn((initial: unknown) => [initial, vi.fn()]),
}));

describe('useSetPropertyArray', () => {
  // A seed that never reaches the minimum would loop forever: fail instead of hanging the run.
  beforeEach(() => {
    const addSet = Reflect.get(PropertyArray.prototype, 'addSet') as PropertyArray['addSet'];
    let calls = 0;
    vi.spyOn(PropertyArray.prototype, 'addSet').mockImplementation(function (
      this: PropertyArray,
      ...args: Parameters<PropertyArray['addSet']>
    ) {
      calls += 1;
      if (calls > 50) throw new Error('Seeding did not reach the minimum');
      return addSet.apply(this, args);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fills a fresh set to its minimum when nothing listens for new occurrences', () => {
    const root = new PropertyTree().getRoot();

    const array = useSetPropertyArray('inputs', root, Occurrences.minmax(2, 0));

    expect(root.getPropertyArray('inputs')).toBe(array);
    expect(array.getSize()).toBe(2);
  });

  it('hands every seeded occurrence to onCreateOccurrence', () => {
    const root = new PropertyTree().getRoot();
    const created: PropertySet[] = [];

    const array = useSetPropertyArray('inputs', root, Occurrences.minmax(2, 0), {
      onCreateOccurrence: (occurrence) => created.push(occurrence),
    });

    expect(created).toEqual([array.getSet(0), array.getSet(1)]);
  });

  it('leaves the occurrences a set already has', () => {
    const root = new PropertyTree().getRoot();
    const existing = root.addPropertySet('inputs');
    root.addPropertySet('inputs');
    root.addPropertySet('inputs');

    const array = useSetPropertyArray('inputs', root, Occurrences.minmax(1, 0));

    expect(array.getSize()).toBe(3);
    expect(array.getSet(0)).toBe(existing);
  });

  it('does not seed when seedMin is off', () => {
    const root = new PropertyTree().getRoot();

    const array = useSetPropertyArray('inputs', root, Occurrences.minmax(2, 0), { seedMin: false });

    expect(array.getSize()).toBe(0);
  });
});
