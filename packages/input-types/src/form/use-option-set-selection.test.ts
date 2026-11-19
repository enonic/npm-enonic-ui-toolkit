// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/preact';
import { createElement, type ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ServerErrorsProvider } from '../context/server-errors';
import { PropertyTree } from '../data';
import type { FormOptionSet } from '../schema';
import { useOptionSetSelection } from './option-set-selection';
import { formOf, optionSetJson } from './test-form';

vi.mock('@enonic/ui', () => ({ usePhrases: () => (key: string) => key }));

afterEach(cleanup);

describe('useOptionSetSelection', () => {
  const options = [
    { name: 'a', label: 'A' },
    { name: 'b', label: 'B' },
  ];

  function renderSelection(selection: { minimum: number; maximum: number }) {
    const json = optionSetJson('opts', { minimum: 0, maximum: 0 }, selection, options);
    const optionSet = formOf(json).getFormItemByName('opts') as FormOptionSet;
    const root = new PropertyTree().getRoot();
    root.addPropertySet('opts');
    const occurrence = root.addPropertySet('opts');
    occurrence.addString('_selected', 'a');
    occurrence.addPropertySet('a').addString('text', 'rejected');
    const clearField = vi.fn();
    const { result } = renderHook(() => useOptionSetSelection(optionSet, occurrence), {
      wrapper: ({ children }: { children?: ReactNode }) =>
        createElement(
          ServerErrorsProvider,
          { entries: [], clear: () => undefined, clearField },
          children,
        ),
    });
    return { result, clearField };
  }

  it('drops the server errors under an option that is unticked', async () => {
    const { result, clearField } = renderSelection({ minimum: 0, maximum: 0 });

    await act(() => result.current.toggle('b'));
    expect(clearField).not.toHaveBeenCalled();

    await act(() => result.current.toggle('a'));
    expect(clearField).toHaveBeenCalledExactlyOnceWith('opts[1].a');
  });

  it('drops the server errors under the option a radio choice replaces', async () => {
    const { result, clearField } = renderSelection({ minimum: 1, maximum: 1 });

    await act(() => result.current.select('a'));
    expect(clearField).not.toHaveBeenCalled();

    await act(() => result.current.select('b'));
    expect(clearField).toHaveBeenCalledExactlyOnceWith('opts[1].a');
  });
});
