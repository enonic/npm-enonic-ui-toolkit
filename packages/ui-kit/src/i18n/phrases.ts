import type { Phrases } from '@enonic/ui-utils';

/**
 * Every phrase the kit can render, merged from the fragments that sit beside the components.
 *
 * ? Exported for a consumer rather than used by the kit — it is the list of what can be translated,
 * ? and what a consumer asserts its own bundle against. The kit itself resolves through the fragment
 * ? a component hands `useText`. `as const` keeps the keys a type, so that assertion can be one too.
 */
export const uiKitPhrases = {} as const satisfies Phrases;

export type UiKitPhraseKey = keyof typeof uiKitPhrases;
