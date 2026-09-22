import { expectTypeOf } from 'vitest';

import type {
  FormFragmentJson,
  FormItemJson,
  FormItemType,
  FormJson,
  InputConfigEntryJson,
  InputConfigJson,
  InputJson,
  ItemSetJson,
  LayoutJson,
  OccurrencesJson,
  OptionSetJson,
  OptionSetOptionJson,
} from './form';

// Publishing freezes the shape, so every exported type is pinned against its literal.

expectTypeOf<OccurrencesJson>().toEqualTypeOf<{
  readonly minimum: number;
  readonly maximum: number;
}>();

expectTypeOf<InputConfigEntryJson>().toEqualTypeOf<{
  readonly value?: unknown;
  readonly [attribute: string]: unknown;
}>();

expectTypeOf<InputConfigJson>().toEqualTypeOf<{
  readonly [property: string]: readonly InputConfigEntryJson[];
}>();

expectTypeOf<InputJson>().toEqualTypeOf<{
  readonly formItemType: 'Input';
  readonly name: string;
  readonly label: string;
  readonly helpText?: string;
  readonly inputType: string;
  readonly occurrences: OccurrencesJson;
  readonly config?: InputConfigJson;
}>();

expectTypeOf<ItemSetJson>().toEqualTypeOf<{
  readonly formItemType: 'ItemSet';
  readonly name: string;
  readonly label: string;
  readonly helpText?: string;
  readonly occurrences: OccurrencesJson;
  readonly items: readonly FormItemJson[];
}>();

expectTypeOf<OptionSetOptionJson>().toEqualTypeOf<{
  readonly name: string;
  readonly label: string;
  readonly helpText?: string;
  readonly default?: boolean;
  readonly items?: readonly FormItemJson[];
}>();

expectTypeOf<OptionSetJson>().toEqualTypeOf<{
  readonly formItemType: 'OptionSet';
  readonly name: string;
  readonly label: string;
  readonly helpText?: string;
  readonly expanded?: boolean;
  readonly occurrences: OccurrencesJson;
  readonly selection: OccurrencesJson;
  readonly options: readonly OptionSetOptionJson[];
}>();

expectTypeOf<LayoutJson>().toEqualTypeOf<{
  readonly formItemType: 'Layout';
  readonly name?: string;
  readonly label?: string;
  readonly items: readonly FormItemJson[];
}>();

expectTypeOf<FormFragmentJson>().toEqualTypeOf<{
  readonly formItemType: 'FormFragment';
  readonly name: string;
}>();

expectTypeOf<FormItemJson>().toEqualTypeOf<
  InputJson | ItemSetJson | OptionSetJson | LayoutJson | FormFragmentJson
>();

expectTypeOf<FormItemType>().toEqualTypeOf<
  'Input' | 'ItemSet' | 'OptionSet' | 'Layout' | 'FormFragment'
>();

expectTypeOf<FormJson>().toEqualTypeOf<readonly FormItemJson[]>();

// The discriminant narrows.
declare const item: FormItemJson;
if (item.formItemType === 'Input') {
  expectTypeOf(item).toEqualTypeOf<InputJson>();
}
if (item.formItemType === 'OptionSet') {
  expectTypeOf(item.selection).toEqualTypeOf<OccurrencesJson>();
}

// What `@enonic-types/core` declares as `FormItem` is assignable here — the same wire, with
// every field present and every config value a string — so a server typed against XP's own
// types produces this contract without a cast. The shape is copied rather than imported: this
// package has no dependencies.
type CoreFormItemInput = {
  formItemType: 'Input';
  name: string;
  label: string;
  helpText: string;
  inputType: 'TextLine' | 'ComboBox';
  occurrences: { maximum: number; minimum: number };
  config: Record<string, { [attributeKey: string]: string; value: string }[]>;
};
type CoreFormItemOptionSet = {
  formItemType: 'OptionSet';
  name: string;
  label: string;
  expanded: boolean;
  helpText: string;
  occurrences: { maximum: number; minimum: number };
  selection: { maximum: number; minimum: number };
  options: { name: string; label: string; helpText: string; default: boolean; items: never[] }[];
};
expectTypeOf<CoreFormItemInput>().toExtend<InputJson>();
expectTypeOf<CoreFormItemOptionSet>().toExtend<OptionSetJson>();
expectTypeOf<CoreFormItemInput[]>().toExtend<FormJson>();
