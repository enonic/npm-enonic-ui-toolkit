// @vitest-environment happy-dom
import { cleanup, renderHook } from '@testing-library/preact';
import { createElement, type ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { type ServerErrorEntry, ServerErrorsProvider } from '../context/server-errors';
import {
  type ValidationVisibility,
  ValidationVisibilityProvider,
} from '../context/validation-visibility';
import { type PropertyArray, PropertyTree } from '../data';
import {
  effectiveOccurrenceVisibility,
  useSetChildShowErrors,
  useSetServerErrors,
} from './set-errors';

vi.mock('@enonic/ui', () => ({}));

afterEach(cleanup);

describe('effectiveOccurrenceVisibility', () => {
  it('keeps what was recorded for the occurrence, a form-wide all included', () => {
    expect(effectiveOccurrenceVisibility('interactive', 'none', false)).toBe('none');
    expect(effectiveOccurrenceVisibility('all', 'none', false)).toBe('none');
    expect(effectiveOccurrenceVisibility('all', 'interactive', false)).toBe('interactive');
    expect(effectiveOccurrenceVisibility('interactive', 'all', false)).toBe('all');
  });

  it('lets a form-wide all reach a fresh occurrence when the form reveals them', () => {
    expect(effectiveOccurrenceVisibility('all', 'none', true)).toBe('all');
    expect(effectiveOccurrenceVisibility('all', 'interactive', true)).toBe('all');
    expect(effectiveOccurrenceVisibility('interactive', 'none', true)).toBe('none');
  });
});

describe('useSetChildShowErrors', () => {
  function renderShowErrors(array: PropertyArray, initial: ValidationVisibility) {
    let visibility = initial;
    const sets = () => array.getProperties().map((property) => property.getPropertySet()!);
    const hook = renderHook(() => useSetChildShowErrors(array, sets()), {
      wrapper: ({ children }: { children?: ReactNode }) =>
        createElement(ValidationVisibilityProvider, { visibility }, children),
    });
    return {
      result: hook.result,
      rerender: (next: ValidationVisibility) => {
        visibility = next;
        hook.rerender();
      },
    };
  }

  it('shows the errors of an occurrence that existed at mount once a save reveals all', () => {
    const root = new PropertyTree().getRoot();
    root.addPropertySet('items');
    const array = root.getPropertyArray('items')!;

    const { result, rerender } = renderShowErrors(array, 'interactive');
    expect(result.current.childShowErrors.get(0)).toBe(false);

    rerender('all');

    expect(result.current.childValidationVisibility.get(0)).toBe('all');
    expect(result.current.childShowErrors.get(0)).toBe(true);
  });

  it('keeps an occurrence added during the session hidden until it is edited', () => {
    const root = new PropertyTree().getRoot();
    root.addPropertySet('items');
    const array = root.getPropertyArray('items')!;

    const { result, rerender } = renderShowErrors(array, 'interactive');
    root.addPropertySet('items');
    rerender('all');

    expect(result.current.childShowErrors.get(0)).toBe(true);
    expect(result.current.childShowErrors.get(1)).toBe(false);
  });
});

describe('useSetServerErrors', () => {
  function renderServerErrors(entries: ServerErrorEntry[] | undefined) {
    const root = new PropertyTree().getRoot();
    root.addPropertySet('choice');
    root.addPropertySet('choice');
    const sets = root
      .getPropertyArray('choice')!
      .getProperties()
      .map((property) => property.getPropertySet()!);
    return renderHook(() => useSetServerErrors(sets), {
      wrapper: ({ children }: { children?: ReactNode }) =>
        entries === undefined
          ? createElement('div', null, children)
          : createElement(
              ServerErrorsProvider,
              { entries, clear: () => undefined, clearField: () => undefined },
              children,
            ),
    }).result;
  }

  it('marks the occurrence a nested server error sits under', () => {
    const first = renderServerErrors([{ path: 'choice.color.value', message: 'no' }]);
    expect(first.current.get(0)).toBe(true);
    expect(first.current.get(1)).toBe(false);

    const second = renderServerErrors([{ path: 'choice[1].color.value', message: 'no' }]);
    expect(second.current.get(0)).toBe(false);
    expect(second.current.get(1)).toBe(true);
  });

  it('marks nothing for errors elsewhere or without a provider', () => {
    expect(renderServerErrors([{ path: 'choices.value', message: 'no' }]).current.get(0)).toBe(
      false,
    );
    expect(renderServerErrors(undefined).current.size).toBe(0);
  });
});
