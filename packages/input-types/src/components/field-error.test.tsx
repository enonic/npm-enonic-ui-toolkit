// @vitest-environment happy-dom
import { act, cleanup, render, screen } from '@testing-library/preact';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FieldError } from './field-error';

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const advance = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });

describe('FieldError announcements', () => {
  it('announces an error while focus stays in the field, including after correction', async () => {
    const form = (message?: string) => (
      <>
        <label htmlFor="title">Title</label>
        <input
          id="title"
          aria-invalid={!!message || undefined}
          aria-describedby={message ? 'title-error' : undefined}
        />
        <FieldError id="title-error" message={message} />
      </>
    );
    const { rerender } = render(form());
    const region = screen.getByRole('status');
    const field = screen.getByLabelText('Title');
    field.focus();
    expect(document.querySelector('[data-component="FieldError"]')).toBeNull();

    rerender(form('This field is required'));
    expect(document.getElementById('title-error')?.textContent).toBe('This field is required');
    expect(region.textContent).toBe('\u00a0');
    await advance(500);
    expect(region.textContent).toBe('This field is required');
    expect(document.activeElement).toBe(field);

    rerender(form());
    expect(region.textContent).toBe('\u00a0');
    rerender(form('This field is required'));
    await advance(500);
    expect(region.textContent).toBe('This field is required');
    expect(screen.getByRole('status')).toBe(region);
    expect(region.getAttribute('aria-live')).toBe('polite');
    expect(region.getAttribute('aria-atomic')).toBe('true');
    expect(document.activeElement).toBe(field);
  });

  it('cancels stale announcements when the error changes or unmounts', async () => {
    const { rerender, unmount } = render(<FieldError message="Old error" />);
    const region = screen.getByRole('status');
    await advance(250);
    rerender(<FieldError message="New error" />);
    await advance(250);
    expect(region.textContent).toBe('\u00a0');
    await advance(250);
    expect(region.textContent).toBe('New error');

    rerender(<FieldError message="Pending error" />);
    unmount();
    await advance(500);
    expect(region.textContent).toBe('\u00a0');
  });

  it('lets a parent own the announcement while preserving the visible error and ARIA props', () => {
    render(
      <div role="status" aria-live="polite">
        <FieldError id="error" aria-label="Title validation" message="Required" announce={false} />
      </div>,
    );
    expect(screen.getAllByRole('status')).toHaveLength(1);
    expect(document.getElementById('error')?.getAttribute('aria-label')).toBe('Title validation');
    expect(document.getElementById('error')?.textContent).toBe('Required');
    expect(vi.getTimerCount()).toBe(0);
  });
});
