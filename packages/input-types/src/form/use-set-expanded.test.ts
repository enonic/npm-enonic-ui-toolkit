// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/preact';
import { afterEach, describe, expect, it } from 'vitest';

import { PropertyTree } from '../data';
import { useSetExpanded } from './set-hooks';

afterEach(cleanup);

function renderExpanded(size: number) {
  const root = new PropertyTree().getRoot();
  for (let i = 0; i < size; i++) root.addPropertySet('items');
  const array = root.getPropertyArray('items')!;
  const hook = renderHook(() => useSetExpanded(array, array.getSize()));
  return { root, array, hook };
}

describe('useSetExpanded', () => {
  it('brings back the open occurrences when a drag is dropped in place or cancelled', async () => {
    const { hook } = renderExpanded(2);
    await act(() => hook.result.current.handleToggleSingle(1));

    await act(() => hook.result.current.handleDragStart());
    expect(hook.result.current.expanded.get(1)).toBe(false);
    await act(() => hook.result.current.handleDragEnd());

    expect(hook.result.current.expanded.get(0)).toBe(false);
    expect(hook.result.current.expanded.get(1)).toBe(true);
  });

  it('opens an occurrence added above after a cancelled drag', async () => {
    const { root, array, hook } = renderExpanded(2);
    await act(() => hook.result.current.handleDragStart());
    await act(() => hook.result.current.handleDragEnd());

    await act(() => {
      root.addPropertySet('items');
      array.move(2, 0);
    });

    expect(hook.result.current.expanded.get(0)).toBe(true);
    expect(hook.result.current.expanded.get(1)).toBe(false);
  });
});
