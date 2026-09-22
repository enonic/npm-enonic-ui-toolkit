/**
 * `@enonic/input-types/schema` — an XP form as a model: `Form` and its items, each with a `kind`
 * to switch on, built from the JSON contracts in `@enonic/ui-types` with `Form.fromJson`.
 * Framework-free.
 */
export { FieldSet, type FieldSetInit } from './field-set';
export { Form } from './form';
export { FormItem, type FormItemKind, formItemsEqual, toFormItemJson } from './form-item';
export { FormItemPath, FormItemPathElement } from './form-item-path';
export { FormItemSet, type FormItemSetInit } from './form-item-set';
export { FormOptionSet, type FormOptionSetInit } from './form-option-set';
export { FormOptionSetOption, type FormOptionSetOptionInit } from './form-option-set-option';
export { FormSet, type FormSetInit } from './form-set';
export { formItemFromJson, formItemsFromJson } from './from-json';
export { Input, InputBuilder } from './input';
export { InputTypeName } from './input-type-name';
export { Occurrences } from './occurrences';
