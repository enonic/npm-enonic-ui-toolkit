import { useEffect, useState } from 'react';

import type { PropertyArray, Value } from '../data';

export type UsePropertyArrayResult = {
  values: Value[];
  size: number;
};

const EMPTY: UsePropertyArrayResult = { values: [], size: 0 };

function read(propertyArray: PropertyArray): UsePropertyArrayResult {
  const values = propertyArray.getProperties().map((property) => property.getValue());
  return { values, size: values.length };
}

/** The values of an array, re-read on every event it reports. */
export function usePropertyArray(propertyArray: PropertyArray | undefined): UsePropertyArrayResult {
  const [result, setResult] = useState<UsePropertyArrayResult>(() =>
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
    propertyArray.onPropertyValueChanged(handler);
    propertyArray.onPropertyMoved(handler);
    return () => {
      propertyArray.unPropertyAdded(handler);
      propertyArray.unPropertyRemoved(handler);
      propertyArray.unPropertyValueChanged(handler);
      propertyArray.unPropertyMoved(handler);
    };
  }, [propertyArray]);

  return result;
}
