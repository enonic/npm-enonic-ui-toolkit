import { describe, expect, it } from 'vitest';

import { InputBuilder } from '../schema';
import { InputTypeName } from '../schema';
import { Occurrences } from '../schema';

describe('UnsupportedInput', () => {
  describe('type name extraction', () => {
    it('should extract type name from Input descriptor', () => {
      const input = new InputBuilder()
        .setName('myField')
        .setInputType(new InputTypeName('CustomWidget', false))
        .setLabel('My Field')
        .setOccurrences(Occurrences.minmax(0, 1))
        .setHelpText('')
        .setInputTypeConfig({})
        .build();

      const typeName = input.getInputType().getName();

      expect(typeName).toBe('CustomWidget');
    });

    it('should extract custom type name', () => {
      const input = new InputBuilder()
        .setName('myField')
        .setInputType(new InputTypeName('MyApp:custom-input', true))
        .setLabel('Custom')
        .setOccurrences(Occurrences.minmax(0, 1))
        .setHelpText('')
        .setInputTypeConfig({})
        .build();

      const typeName = input.getInputType().getName();

      expect(typeName).toBe('MyApp:custom-input');
    });
  });
});
