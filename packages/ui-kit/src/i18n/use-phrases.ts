import { usePhrases } from '@enonic/ui';
import type { PhraseValue } from '@enonic/ui-utils';

import { uiKitPhrases, type UiKitPhraseKey } from './phrases';

export type UiKitTranslate = (key: UiKitPhraseKey, ...values: PhraseValue[]) => string;

/** The package's labels, through the application's `Translate` where it has a word. */
export function useUiKitPhrases(): UiKitTranslate {
  return usePhrases(uiKitPhrases);
}
