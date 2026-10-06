import { mergePhrases } from '@enonic/ui-utils';

/**
 * Every text the package renders, in English, keyed `enonic.uiKit.<area>.<name>`. An application
 * translates them through the `Translate` it hands `@enonic/ui`'s `I18nProvider`; a key it has no
 * text for renders this English. `comparePhrases` from `@enonic/ui-utils` tells an application
 * which of these its bundle lacks.
 */
export const dialogPhrases = {
  'enonic.uiKit.dialog.cancel': 'Cancel',
  'enonic.uiKit.dialog.confirm': 'Confirm',
  'enonic.uiKit.dialog.delete': 'Delete',
  'enonic.uiKit.dialog.keep': 'Keep editing',
} as const;

export const gatePhrases = {
  'enonic.uiKit.gate.hint': 'Type {0} to confirm',
  'enonic.uiKit.gate.mismatch': '{1} does not match {0}',
} as const;

export const uiKitPhrases = mergePhrases([dialogPhrases, gatePhrases]);

export type UiKitPhraseKey = keyof typeof uiKitPhrases;
