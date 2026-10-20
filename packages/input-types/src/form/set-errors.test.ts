// @vitest-environment happy-dom
import { cleanup, renderHook } from '@testing-library/preact';
import { createElement, type ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  type ValidationVisibility,
  ValidationVisibilityProvider,
} from '../context/validation-visibility';
import { type PropertyArray, PropertyTree } from '../data';
import { effectiveOccurrenceVisibility, useSetChildShowErrors } from './set-errors';

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
      wrapper: ({ children }: { children: ReactNode }) =>
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
