/** Opaque: a caller keeps it to release the lock it stands for, and compares it with nothing. */
export type ProcessingToken = string;

let tokenCounter = 0;

export function generateProcessingToken(): ProcessingToken {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  tokenCounter += 1;
  return `pt-${Date.now()}-${tokenCounter}-${Math.random().toString(36).slice(2)}`;
}

export type FieldRegistration = {
  unregister: () => void;
  notifyActivePath: (path: string | undefined) => void;
};

export type RevealOptions = { focus?: boolean; scroll?: boolean };

export type FieldHandle = {
  setTransientError: (occurrenceId: string, message: string) => boolean;
  clearTransientError: (occurrenceId: string) => boolean;
  clearAllTransientErrors: () => void;
  /** The occurrence ids now, to capture one before async work and address it when the work is done. */
  getOccurrenceIds: () => string[];
  acquireProcessing: (occurrenceId: string) => ProcessingToken | undefined;
  releaseProcessing: (token: ProcessingToken) => boolean;
  isProcessing: (occurrenceId: string) => boolean;
  reveal: (occurrenceId?: string, options?: RevealOptions) => boolean;
  focus: (occurrenceId?: string) => boolean;
};

/**
 * Reaches a field from outside the form by its data path — to show an error a server or an
 * assistant produced, to lock an occurrence while something works on it, to scroll it into view.
 * Every `InputField` registers a handle on mount and removes it on unmount; occurrences are
 * addressed by stable id, so a move or a removal between a call and its answer lands nowhere wrong.
 * A method answers `false` for a path it does not know or an id the field rejected.
 */
export class FieldRegistry {
  private readonly handles = new Map<string, FieldHandle>();
  private readonly activePathSubscribers = new Set<(path: string | undefined) => void>();
  private pendingActivePath: string | undefined;
  private hasPendingActivePath = false;
  private lastFocusOwner: string | undefined;

  /**
   * Registering a path again replaces the handle. `notifyActivePath` is the field's own way to
   * report focus, on purpose not on this class: nothing outside a field can fake it.
   */
  register(path: string, handle: FieldHandle): FieldRegistration {
    this.handles.set(path, handle);
    return {
      unregister: () => {
        if (this.handles.get(path) === handle) {
          this.handles.delete(path);
        }
      },
      notifyActivePath: (active) => {
        if (active === undefined) {
          // Only the owner clears: a blur that arrives after another field took focus, or an
          // unmount of a field that was never active, changes nothing.
          if (this.lastFocusOwner !== path) return;
          this.lastFocusOwner = undefined;
        } else {
          this.lastFocusOwner = active;
        }
        this.scheduleActivePathEmit(active);
      },
    };
  }

  setTransientError(path: string, occurrenceId: string, message: string): boolean {
    return this.handles.get(path)?.setTransientError(occurrenceId, message) ?? false;
  }

  clearTransientError(path: string, occurrenceId: string): boolean {
    return this.handles.get(path)?.clearTransientError(occurrenceId) ?? false;
  }

  /** One path's, or every field's when `path` is omitted. */
  clearAllTransientErrors(path?: string): void {
    if (path !== undefined) {
      this.handles.get(path)?.clearAllTransientErrors();
      return;
    }
    for (const handle of this.handles.values()) {
      handle.clearAllTransientErrors();
    }
  }

  acquireProcessing(path: string, occurrenceId: string): ProcessingToken | undefined {
    return this.handles.get(path)?.acquireProcessing(occurrenceId);
  }

  /** The token carries no path, so this asks every field; there is one per visible path. */
  releaseProcessing(token: ProcessingToken): boolean {
    for (const handle of this.handles.values()) {
      if (handle.releaseProcessing(token)) return true;
    }
    return false;
  }

  isProcessing(path: string, occurrenceId: string): boolean {
    return this.handles.get(path)?.isProcessing(occurrenceId) ?? false;
  }

  reveal(path: string, occurrenceId?: string, options?: RevealOptions): boolean {
    return this.handles.get(path)?.reveal(occurrenceId, options) ?? false;
  }

  focus(path: string, occurrenceId?: string): boolean {
    return this.handles.get(path)?.focus(occurrenceId) ?? false;
  }

  getOccurrenceIds(path: string): string[] | undefined {
    return this.handles.get(path)?.getOccurrenceIds();
  }

  hasField(path: string): boolean {
    return this.handles.has(path);
  }

  /** Which field has focus, `undefined` for none; coalesced to one call per tick. */
  subscribeActivePath(handler: (path: string | undefined) => void): () => void {
    this.activePathSubscribers.add(handler);
    return () => {
      this.activePathSubscribers.delete(handler);
    };
  }

  private scheduleActivePathEmit(active: string | undefined): void {
    this.pendingActivePath = active;
    if (this.hasPendingActivePath) return;
    this.hasPendingActivePath = true;
    queueMicrotask(() => {
      const value = this.pendingActivePath;
      this.hasPendingActivePath = false;
      this.pendingActivePath = undefined;
      for (const handler of this.activePathSubscribers) {
        try {
          handler(value);
        } catch (error) {
          console.error('FieldRegistry: active-path subscriber threw', error);
        }
      }
    });
  }
}
