// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/preact';
import { afterEach, describe, expect, it } from 'vitest';

import { SortableGridList } from './sortable-grid-list';

afterEach(cleanup);

const ITEMS = ['a', 'b', 'c'];

function renderList(withRemove: boolean) {
  return (
    <SortableGridList
      items={ITEMS}
      keyExtractor={(item) => item}
      onMove={() => {}}
      enabled
      renderItem={({ item }) => (
        <>
          <input aria-label={`input ${item}`} />
          {withRemove && <button type="button">{`remove ${item}`}</button>}
        </>
      )}
    />
  );
}

function renderLockableList(middleTabIndex: number | undefined) {
  return (
    <SortableGridList
      items={ITEMS}
      keyExtractor={(item) => item}
      onMove={() => {}}
      enabled
      renderItem={({ item }) => (
        <>
          <button type="button">{`first ${item}`}</button>
          <button type="button" tabIndex={middleTabIndex}>{`middle ${item}`}</button>
          <button type="button">{`last ${item}`}</button>
        </>
      )}
    />
  );
}

function arrowRightFrom(label: string): void {
  const from = screen.getByText(label);
  from.focus();
  fireEvent.keyDown(from, { key: 'ArrowRight' });
}

async function tabFrom(label: string): Promise<void> {
  const from = screen.getByText(label);
  from.focus();
  fireEvent.keyDown(from, { key: 'Tab' });
  await waitFor(() => expect(document.activeElement).not.toBe(from));
}

describe('SortableGridList', () => {
  it('takes controls a row gains on rerender out of the Tab order', () => {
    const { rerender } = render(renderList(false));
    expect(screen.getByLabelText('input b').tabIndex).toBe(-1);

    rerender(renderList(true));

    for (const item of ITEMS) {
      expect(screen.getByText(`remove ${item}`).tabIndex).toBe(-1);
    }
  });

  it('navigates to a control whose own tabIndex changes from -1 to 0', async () => {
    const { rerender } = render(renderLockableList(-1));
    arrowRightFrom('first b');
    expect(document.activeElement).toBe(screen.getByText('last b'));

    rerender(renderLockableList(0));

    arrowRightFrom('first b');
    expect(document.activeElement).toBe(screen.getByText('middle b'));
    await tabFrom('first b');
    expect(document.activeElement).toBe(screen.getByText('middle b'));
    expect(screen.getByText('middle b').tabIndex).toBe(-1);
  });

  it('skips a control a processing lock takes out of navigation', async () => {
    const { rerender } = render(renderLockableList(undefined));
    arrowRightFrom('first b');
    expect(document.activeElement).toBe(screen.getByText('middle b'));

    rerender(renderLockableList(-1));

    arrowRightFrom('first b');
    expect(document.activeElement).toBe(screen.getByText('last b'));
    await tabFrom('first b');
    expect(document.activeElement).toBe(screen.getByText('last b'));

    rerender(renderLockableList(undefined));

    arrowRightFrom('first b');
    expect(document.activeElement).toBe(screen.getByText('middle b'));
  });
});
