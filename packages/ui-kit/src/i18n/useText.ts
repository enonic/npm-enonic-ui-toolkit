import { resolveText, type PhraseValue } from '@enonic/ui-utils';
import { useCallback, useContext } from 'react';

import { UiKitContext } from './context';

/**
 * The phrases of one component, resolved through the application's `Translate` where it carries the
 * key. A component passes its own fragment, so a key it never declared does not compile, and a
 * consumer bundles the phrases of the components it renders rather than every phrase the kit has.
 *
 * ! Resolved as it renders: phrases that arrive after mount reach the screen on the next render.
 */
export function useText<K extends string>(
  phrases: Readonly<Record<K, string>>,
): (key: K, ...values: PhraseValue[]) => string {
  const { translate } = useContext(UiKitContext);

  return useCallback(
    (key: K, ...values: PhraseValue[]) => resolveText(translate, phrases, key, values),
    [translate, phrases],
  );
}
