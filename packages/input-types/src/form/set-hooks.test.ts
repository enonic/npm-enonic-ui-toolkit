import { describe, expect, it, vi } from 'vitest';

import type { PropertySet } from '../data';
import { PropertyTree } from '../data';
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
