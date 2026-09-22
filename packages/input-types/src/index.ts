/**
 * `@enonic/input-types` — XP's input types as React components, and the form that composes them
 * from a schema. The model is on `@enonic/input-types/data` and `@enonic/input-types/schema`;
 * this entry is the engine and the components, and needs `react`, `@enonic/ui` and the
 * `@dnd-kit` pair as peers.
 */
export * from './components';
export * from './context';
export * from './descriptor';
export {
  FieldRegistry,
  type FieldHandle,
  type FieldRegistration,
  generateProcessingToken,
  type ProcessingToken,
  type RevealOptions,
} from './field-registry';
export * from './hooks';
export {
  actionPhrases,
  fieldPhrases,
  inputTypesPhrases,
  type InputTypesPhraseKey,
  occurrencePhrases,
  validationPhrases,
} from './i18n/phrases';
export { type InputTypesTranslate, useInputTypesPhrases } from './i18n/use-phrases';
export { createInputTypeRegistry, InputTypeRegistry, inputTypeRegistry } from './registry';
export { registerBuiltInTypes } from './register-built-in-types';
export type {
  InputTypeComponent,
  InputTypeComponentProps,
  InputTypeDefinition,
  InputTypeMode,
  SelfManagedComponentProps,
  SelfManagedInputTypeComponent,
} from './types';
export * from './utils';
