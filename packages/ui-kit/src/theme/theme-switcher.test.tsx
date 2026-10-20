// @vitest-environment happy-dom
import { THEME_STORAGE_KEY, writeTheme } from '@enonic/ui-utils';
import { act, cleanup, render, screen } from '@testing-library/preact';
import userEvent from '@testing-library/user-event';
import { Storage } from 'happy-dom';
import type { ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ThemeSwitcher } from './theme-switcher';
import { useResolvedTheme } from './use-resolved-theme';

// ! Node 25+ defines a global `localStorage` that is undefined without `--localstorage-file`, and
// ! the happy-dom environment leaves a global Node already has alone.
beforeEach(() => {
  vi.stubGlobal('localStorage', new Storage());
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('ThemeSwitcher', () => {
  it('names what a click does for the stored theme', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    render(<ThemeSwitcher />);

    expect(screen.getByRole('button', { name: 'Use system theme' })).toBeTruthy();
  });

  it('starts from system where nothing is stored', () => {
    render(<ThemeSwitcher />);

    expect(screen.getByRole('button', { name: 'Switch to light theme' })).toBeTruthy();
  });

  it('cycles light, dark, system and stores each', async () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'light');
    const user = userEvent.setup();
    render(<ThemeSwitcher />);
    const button = screen.getByRole('button');

    const seen: (string | null)[] = [];
    for (let i = 0; i < 3; i++) {
      await user.click(button);
      seen.push(localStorage.getItem(THEME_STORAGE_KEY));
    }

    expect(seen).toEqual(['dark', 'system', 'light']);
    expect(button.getAttribute('aria-label')).toBe('Switch to dark theme');
  });

  it('follows a switch made elsewhere on the page', async () => {
    render(<ThemeSwitcher />);

    await act(() => writeTheme('dark'));

    expect(screen.getByRole('button', { name: 'Use system theme' })).toBeTruthy();
  });

  it('takes a class and a data-component', () => {
    render(<ThemeSwitcher className="ml-auto" data-component="AppBarThemeSwitcher" />);
    const button = screen.getByRole('button');

    expect(button.getAttribute('data-component')).toBe('AppBarThemeSwitcher');
    expect(button.classList.contains('ml-auto')).toBe(true);
  });
});

const Painted = (): ReactElement => <output>{useResolvedTheme()}</output>;

describe('useResolvedTheme', () => {
  it('reads the picked theme and follows a switch', async () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'light');
    render(<Painted />);

    expect(screen.getByRole('status').textContent).toBe('light');

    await act(() => writeTheme('dark'));

    expect(screen.getByRole('status').textContent).toBe('dark');
  });
});
