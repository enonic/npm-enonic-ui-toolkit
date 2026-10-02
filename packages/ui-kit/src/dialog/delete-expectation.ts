import type { ReactNode } from 'react';

export type DeleteTarget = {
  key: string;
  /** What has to be typed back to delete this one. */
  name: string;
  /** How the item reads elsewhere in the application; the caller renders it, so the dialog knows no domain. */
  label: ReactNode;
};

/** What to type back: the one item's name, or the count of a batch nobody would retype name by name. */
export function deleteExpectation(targets: readonly DeleteTarget[]): string | number {
  const [only] = targets;

  return targets.length === 1 && only !== undefined ? only.name : targets.length;
}
