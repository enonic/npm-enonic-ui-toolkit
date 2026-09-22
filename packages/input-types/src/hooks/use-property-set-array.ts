import { useEffect, useState } from 'react';

import type { PropertyArray, PropertySet } from '../data';

export type UsePropertySetArrayResult = {
  propertySets: PropertySet[];
  size: number;
};

const EMPTY: UsePropertySetArrayResult = { propertySets: [], size: 0 };

function read(propertyArray: PropertyArray): UsePropertySetArrayResult {
  const propertySets = propertyArray
    .getProperties()
    .map((property) => property.getPropertySet())
    .filter((set): set is PropertySet => set !== undefined);
  return { propertySets, size: propertySets.length };
}

/**
 * The sets of a set-typed array, re-read on the structural events only: a value change inside an
 * occurrence is that occurrence's own hooks' business.
 */
export function usePropertySetArray(
  propertyArray: PropertyArray | undefined,
): UsePropertySetArrayResult {
  const [result, setResult] = useState<UsePropertySetArrayResult>(() =>
    propertyArray === undefined ? EMPTY : read(propertyArray),
  );

  useEffect(() => {
    if (propertyArray === undefined) {
      setResult(EMPTY);
      return undefined;
    }
    setResult(read(propertyArray));
    const handler = (): void => setResult(read(propertyArray));
    propertyArray.onPropertyAdded(handler);
    propertyArray.onPropertyRemoved(handler);
    propertyArray.onPropertyMoved(handler);
    return () => {
      propertyArray.unPropertyAdded(handler);
      propertyArray.unPropertyRemoved(handler);
      propertyArray.unPropertyMoved(handler);
    };
  }, [propertyArray]);

  return result;
}
