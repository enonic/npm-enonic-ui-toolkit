import { useCallback } from 'react';

import { useServerErrors } from '../context/server-errors';
import { PropertyPath, PropertyPathElement, type PropertySet } from '../data';

/**
 * Drops the server's errors under a set once its occurrences shift — an add, a remove, a move —
 * since they were addressed by position; the next save validates again.
 */
export function useClearSetServerErrors(propertySet: PropertySet, name: string): () => void {
  const serverErrors = useServerErrors();
  return useCallback(() => {
    if (serverErrors === undefined) return;
    const path = PropertyPath.fromParent(
      propertySet.getPropertyPath(),
      new PropertyPathElement(name, 0),
    ).toString();
    serverErrors.clearField(path.startsWith('.') ? path.slice(1) : path);
  }, [serverErrors, propertySet, name]);
}
