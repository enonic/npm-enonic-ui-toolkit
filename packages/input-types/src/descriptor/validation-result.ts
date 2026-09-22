import type { PhraseValue } from '@enonic/ui-utils';

import type { InputTypesPhraseKey } from '../i18n/phrases';

/**
 * What a validator says: one of the package's phrases with its values, resolved where it renders,
 * or a text that already is one — a server's, a schema's own error text, a caller's.
 */
export type ValidationMessage =
  | { readonly key: InputTypesPhraseKey; readonly values?: readonly PhraseValue[] }
  | { readonly message: string };

export type ValidationResult = ValidationMessage & {
  readonly custom?: boolean;
  readonly server?: boolean;
  /**
   * Injected from outside the descriptor pipeline — a translation failure, for one — so a
   * renderer can offer to dismiss it. Cleared on the occurrence's next value change.
   */
  readonly transient?: boolean;
};

export type ResolvePhrase = (key: InputTypesPhraseKey, ...values: PhraseValue[]) => string;

export function resolveValidationMessage(result: ValidationMessage, t: ResolvePhrase): string {
  return 'message' in result ? result.message : t(result.key, ...(result.values ?? []));
}

export const invalidValue: ValidationResult = { key: 'enonic.inputTypes.validation.invalid' };
