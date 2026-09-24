/**
 * `@enonic/input-types` — XP's input types as React components, and the form that composes them
 * from a schema. The model is on `@enonic/input-types/data` and `@enonic/input-types/schema`;
 * this entry is the engine and the components, and needs `react`, `@enonic/ui` and the
 * `@dnd-kit` pair as peers.
 */
export { CheckboxInput, type CheckboxInputProps } from './components/checkbox-input';
export { ComboBoxInput, type ComboBoxInputProps } from './components/combo-box-input';
export { Counter, type CounterProps } from './components/counter';
export { DateInput, type DateInputProps } from './components/date-input';
export { DateTimeInput, type DateTimeInputProps } from './components/date-time-input';
export { DoubleInput, type DoubleInputProps } from './components/double-input';
export { FieldError, type FieldErrorProps } from './components/field-error';
export { GeoPointInput, type GeoPointInputProps } from './components/geo-point-input';
export { InputField, type InputFieldProps } from './components/input-field';
export {
  InputLabel,
  type InputLabelActionProps,
  type InputLabelRootProps,
} from './components/input-label';
export { InstantInput, type InstantInputProps } from './components/instant-input';
export { LongInput, type LongInputProps } from './components/long-input';
export { OccurrenceList, type OccurrenceListRootProps } from './components/occurrence-list';
export type {
  SortableDragDirection,
  SortableDragInfo,
  SortableDropSide,
} from './components/projection-drag-info';
export { RadioButtonInput, type RadioButtonInputProps } from './components/radio-button-input';
export {
  SortableGridList,
  type SortableGridListItemContext,
  type SortableGridListProps,
} from './components/sortable-grid-list';
export {
  type SortableDropHint,
  SortableList,
  type SortableListContainerProps,
  type SortableListItemContext,
  type SortableListItemProps,
  type SortableListProps,
} from './components/sortable-list';
export { TagInput, type TagInputProps, type TagSuggester } from './components/tag-input';
export { TextAreaInput, type TextAreaInputProps } from './components/text-area-input';
export { TextLineInput, type TextLineInputProps } from './components/text-line-input';
export { TimeInput, type TimeInputProps } from './components/time-input';
export {
  type DropDirection,
  type DropNode,
  type DropNodeKind,
  type DropProjection,
  type ProjectTreeDropParams,
  projectTreeDrop,
} from './components/tree-projection';
export { UnsupportedInput, type UnsupportedInputProps } from './components/unsupported-input';
export {
  FieldRegistryProvider,
  type FieldRegistryProviderProps,
  useFieldRegistry,
} from './context/field-registry-context';
export {
  InputTypeRegistryProvider,
  type InputTypeRegistryProviderProps,
  useInputTypeRegistry,
} from './context/input-type-registry-context';
export { LocaleProvider, type LocaleProviderProps, useLocale } from './context/locale';
export { RawValueProvider, type RawValueProviderProps, useRawValueMap } from './context/raw-value';
export {
  type ServerErrorEntry,
  ServerErrorsProvider,
  type ServerErrorsProviderProps,
  type ServerErrorsValue,
  useServerErrors,
} from './context/server-errors';
export {
  useValidationVisibility,
  type ValidationVisibility,
  ValidationVisibilityProvider,
  type ValidationVisibilityProviderProps,
} from './context/validation-visibility';
export { CheckboxDescriptor } from './descriptor/checkbox-descriptor';
export {
  DateDescriptor,
  DateTimeDescriptor,
  InstantDescriptor,
  TimeDescriptor,
} from './descriptor/date-descriptors';
export { DateTimeRangeDescriptor } from './descriptor/date-time-range-descriptor';
export { computeDefaultValue } from './descriptor/default-value';
export type {
  FieldSetValidationNode,
  FormValidationNode,
  FormValidationResult,
  InputValidationNode,
  ItemSetValidationNode,
  OptionSetValidationNode,
  SkippedValidationNode,
} from './descriptor/form-validation-result';
export { GeoPointDescriptor } from './descriptor/geo-point-descriptor';
export { getEffectiveOccurrences } from './descriptor/get-effective-occurrences';
export type {
  Alignment,
  CheckboxConfig,
  ComboBoxConfig,
  ComboBoxOptionConfig,
  DateConfig,
  DateTimeConfig,
  DateTimeRangeConfig,
  GeoPointConfig,
  InputConfigEntries,
  InputConfigEntry,
  InputTypeConfig,
  InstantConfig,
  NumberConfig,
  OptionConfig,
  PrincipalSelectorConfig,
  RadioButtonConfig,
  RadioButtonOptionConfig,
  TextAreaConfig,
  TextLineConfig,
  TimeConfig,
} from './descriptor/input-type-config';
export type { InputTypeDescriptor } from './descriptor/input-type-descriptor';
export { DoubleDescriptor, LongDescriptor } from './descriptor/number-descriptors';
export {
  OccurrenceManager,
  type OccurrenceManagerState,
  type OccurrenceValidationState,
} from './descriptor/occurrence-manager';
export {
  ComboBoxDescriptor,
  RadioButtonDescriptor,
  readOptions,
} from './descriptor/option-descriptors';
export { PrincipalSelectorDescriptor } from './descriptor/principal-selector-descriptor';
export {
  SetOccurrenceManager,
  type SetOccurrenceManagerState,
} from './descriptor/set-occurrence-manager';
export { TagDescriptor } from './descriptor/tag-descriptor';
export { TextAreaDescriptor } from './descriptor/text-area-descriptor';
export { TextLineDescriptor } from './descriptor/text-line-descriptor';
export {
  type RawValueMap,
  type ServerError,
  validateForm,
  validateFormItemsValid,
  type ValidateFormOptions,
} from './descriptor/validate-form';
export {
  invalidValue,
  type ResolvePhrase,
  resolveValidationMessage,
  type ValidationMessage,
  type ValidationResult,
} from './descriptor/validation-result';
export {
  FieldRegistry,
  type FieldHandle,
  type FieldRegistration,
  type ProcessingToken,
  type RevealOptions,
} from './field-registry';
export { FormItemRenderer, type FormItemRendererProps } from './form/form-item-renderer';
export {
  type FormRenderContextValue,
  FormRenderProvider,
  type FormRenderProviderProps,
  useFormRender,
} from './form/form-render-context';
export { FormRenderer, type FormRendererProps } from './form/form-renderer';
export {
  normalizeFormValueTypes,
  type NormalizeFormValueTypesOptions,
} from './form/normalize-form-value-types';
export { pruneUnselectedOptionData } from './form/option-set-selection';
export { seedFormDefaults, type SeedFormDefaultsOptions } from './form/seed-form-defaults';
export {
  useInputTypeDescriptor,
  type UseInputTypeDescriptorResult,
} from './hooks/use-input-type-descriptor';
export { useIsMobile } from './hooks/use-is-mobile';
export {
  useOccurrenceManager,
  type UseOccurrenceManagerParams,
  type UseOccurrenceManagerResult,
} from './hooks/use-occurrence-manager';
export { usePropertyArray, type UsePropertyArrayResult } from './hooks/use-property-array';
export {
  usePropertySetArray,
  type UsePropertySetArrayResult,
} from './hooks/use-property-set-array';
export {
  useSetOccurrenceManager,
  type UseSetOccurrenceManagerResult,
} from './hooks/use-set-occurrence-manager';
export { inputTypesPhrases, type InputTypesPhraseKey } from './i18n/phrases';
export { type InputTypesTranslate, useInputTypesPhrases } from './i18n/use-phrases';
export { registerBuiltInTypes } from './register-built-in-types';
export { createInputTypeRegistry, InputTypeRegistry, inputTypeRegistry } from './registry';
export type {
  ComponentWithRef,
  ElementRole,
  InputTypeComponent,
  InputTypeComponentProps,
  InputTypeDefinition,
  InputTypeMode,
  SelfManagedComponentProps,
  SelfManagedInputTypeComponent,
} from './types';
export { getInputAccessibleName, handleMobileCompletionKeyDown } from './utils/accessibility';
export { displayValue } from './utils/display-value';
export { getLangAttributes, type LangAttributes } from './utils/lang-attributes';
export {
  bucketServerErrorsByOccurrence,
  matchesFieldPath,
  matchesOccurrencePath,
  mergeServerErrors,
  type ServerErrorEntryLike,
  serverErrorOccurrenceIndex,
} from './utils/server-errors';
export {
  findByPath,
  getFirstError,
  getOccurrenceError,
  getOccurrenceErrorMessage,
  hasOccurrenceError,
} from './utils/validation';
