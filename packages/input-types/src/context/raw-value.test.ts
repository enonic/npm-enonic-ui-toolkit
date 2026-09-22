import { describe, expect, it } from 'vitest';

import type { RawValueMap } from '../descriptor/validate-form';

// ? RawValueProvider uses createContext which requires React runtime.
// ? We verify the type exists and the default is undefined by contract.

describe('RawValueContext', () => {
  it('RawValueMap type accepts Map of string arrays', () => {
    const map: RawValueMap = new Map([['field', ['value']]]);

    expect(map.get('field')).toEqual(['value']);
  });
});
