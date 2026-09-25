import { describe, expect, it, vi } from 'vitest';

import { effectiveOccurrenceVisibility } from './set-errors';

vi.mock('@enonic/ui', () => ({}));

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
