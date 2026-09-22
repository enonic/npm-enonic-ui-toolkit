import { usePhrases } from '@enonic/ui';
import type { PhraseValue } from '@enonic/ui-utils';

import { inputTypesPhrases, type InputTypesPhraseKey } from './phrases';

export type InputTypesTranslate = (key: InputTypesPhraseKey, ...values: PhraseValue[]) => string;

/** The package's labels, through the application's `Translate` where it has a word. */
export function useInputTypesPhrases(): InputTypesTranslate {
  return usePhrases(inputTypesPhrases);
}
