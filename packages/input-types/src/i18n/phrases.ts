import { mergePhrases } from '@enonic/ui-utils';

/**
 * Every text the package renders, in English, keyed `enonic.inputTypes.<area>.<name>`. An
 * application translates them through the `Translate` it hands `@enonic/ui`'s `I18nProvider`; a
 * key it has no text for renders this English. `comparePhrases` from `@enonic/ui-utils` tells an
 * application which of these its bundle lacks.
 */
export const validationPhrases = {
  'enonic.inputTypes.validation.invalid': 'Invalid value entered',
  'enonic.inputTypes.validation.required': 'This field is required',
  'enonic.inputTypes.validation.breaksMin': 'The value cannot be less than {0}',
  'enonic.inputTypes.validation.breaksMax': 'The value cannot be greater than {0}',
  'enonic.inputTypes.validation.breaksMaxLength': 'Text is too long',
  'enonic.inputTypes.validation.notAnOption': 'Value is not one of the allowed options',
  'enonic.inputTypes.validation.notADateTimeRange': 'Value is not a valid date-time range',
} as const;

export const occurrencePhrases = {
  'enonic.inputTypes.occurrence.breaksMin': 'Min {0} valid occurrence(s) required',
  'enonic.inputTypes.occurrence.breaksMaxMany': 'Max {0} occurrences allowed',
  'enonic.inputTypes.occurrence.breaksMaxOne': 'Max 1 occurrence allowed',
  'enonic.inputTypes.occurrence.add': 'Add',
  'enonic.inputTypes.occurrence.remove': 'Remove occurrence',
  'enonic.inputTypes.occurrence.reorder': 'Drag to reorder',
  'enonic.inputTypes.set.breaksMin': 'Min {0} valid occurrence(s) required',
  'enonic.inputTypes.set.breaksMax': 'Max {0} occurrences allowed',
  'enonic.inputTypes.optionSet.selectionBreaksMin': 'At least {0} option(s) must be selected',
  'enonic.inputTypes.optionSet.selectionBreaksMax': 'At most {0} option(s) can be selected',
} as const;

export const fieldPhrases = {
  'enonic.inputTypes.field.dismissError': 'Dismiss',
  'enonic.inputTypes.field.charsOverLimit': '{0} character(s) over limit',
  'enonic.inputTypes.field.charsRemaining': '{0} character(s) remaining',
  'enonic.inputTypes.field.unsupportedType': 'Unsupported input type: {0}',
  'enonic.inputTypes.field.optionPlaceholder': 'Type to search...',
  'enonic.inputTypes.field.datePlaceholder': 'YYYY-MM-DD',
  'enonic.inputTypes.field.dateTrigger': 'Open calendar',
  'enonic.inputTypes.field.dateTimePlaceholder': 'YYYY-MM-DD hh:mm',
  'enonic.inputTypes.field.dateTimeTrigger': 'Open date and time picker',
  'enonic.inputTypes.field.timePlaceholder': 'HH:MM',
  'enonic.inputTypes.field.timeTrigger': 'Open time picker',
} as const;

export const actionPhrases = {
  'enonic.inputTypes.action.edit': 'Edit',
  'enonic.inputTypes.action.ok': 'OK',
  'enonic.inputTypes.action.apply': 'Apply',
  'enonic.inputTypes.action.setDefault': 'Set default',
} as const;

export const inputTypesPhrases = mergePhrases([
  validationPhrases,
  occurrencePhrases,
  fieldPhrases,
  actionPhrases,
]);

export type InputTypesPhraseKey = keyof typeof inputTypesPhrases;
