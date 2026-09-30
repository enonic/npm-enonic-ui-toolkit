import { describe, expect, it, vi } from 'vitest';

import { documentVisibility } from './document-visibility';

function fakeDocument(state: DocumentVisibilityState) {
  const target = new EventTarget();
  const doc = target as unknown as Document & { visibilityState: DocumentVisibilityState };
  doc.visibilityState = state;
  return {
    doc,
    show: (next: DocumentVisibilityState) => {
      doc.visibilityState = next;
      target.dispatchEvent(new Event('visibilitychange'));
    },
  };
}

describe('documentVisibility', () => {
  it('reads the current state', () => {
    expect(documentVisibility(fakeDocument('visible').doc).get()).toBe(true);
    expect(documentVisibility(fakeDocument('hidden').doc).get()).toBe(false);
  });

  it('reports changes and not the subscription itself', () => {
    const { doc, show } = fakeDocument('visible');
    const listener = vi.fn();
    const unlisten = documentVisibility(doc).listen(listener);

    expect(listener).not.toHaveBeenCalled();

    show('hidden');
    show('visible');
    unlisten();
    show('hidden');

    expect(listener.mock.calls).toEqual([[false], [true]]);
  });
});
