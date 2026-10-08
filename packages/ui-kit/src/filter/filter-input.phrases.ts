/**
 * The input's own English, keyed `enonic.uiKit.filterInput.<name>`. An application translates it
 * through the `Translate` it hands `@enonic/ui`'s `I18nProvider`; a key it has no text for renders
 * this English. `comparePhrases` from `@enonic/ui-utils` tells an application which keys its
 * bundle lacks.
 */
export const filterInputPhrases = {
  'enonic.uiKit.filterInput.label': 'Filter',
  'enonic.uiKit.filterInput.placeholder': 'Search',
  'enonic.uiKit.filterInput.valuePlaceholder': 'Pick a value',
  'enonic.uiKit.filterInput.clear': 'Clear the filter',
  'enonic.uiKit.filterInput.cleared': 'Filter cleared',
  'enonic.uiKit.filterInput.noMatches': 'No matches',
  'enonic.uiKit.filterInput.loading': 'Loading…',
  'enonic.uiKit.filterInput.fieldPrefix': '{0}:',
  'enonic.uiKit.filterInput.term': '{0}: {1}',
  'enonic.uiKit.filterInput.remove': 'Remove {0}',
  'enonic.uiKit.filterInput.added': 'Added {0}',
  'enonic.uiKit.filterInput.removed': 'Removed {0}',
  'enonic.uiKit.filterInput.replaced': 'Replaced {0} with {1}',
} as const;

export type FilterInputPhraseKey = keyof typeof filterInputPhrases;
