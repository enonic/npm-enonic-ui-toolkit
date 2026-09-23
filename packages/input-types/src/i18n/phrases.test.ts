import { bindPhrases, passthrough } from '@enonic/ui-utils';
import { describe, expect, it } from 'vitest';

import { inputTypesPhrases } from './phrases';

describe('inputTypesPhrases', () => {
  const t = bindPhrases(passthrough, inputTypesPhrases);

  it('fills the placeholders of a parameterised phrase', () => {
    expect(t('enonic.inputTypes.validation.breaksMin', 3)).toBe('The value cannot be less than 3');
    expect(t('enonic.inputTypes.occurrence.breaksMin', 2)).toBe(
      'Min 2 valid occurrence(s) required',
    );
    expect(t('enonic.inputTypes.dateTimeRange.noStart', 'Start', 'End')).toBe(
      'Start is required when End is set',
    );
  });

  it('renders a phrase without values as it is', () => {
    expect(t('enonic.inputTypes.validation.required')).toBe('This field is required');
  });
});
