/**
 * An XP form as XP's own JS libraries serialize it: `lib-content` for a content type, `lib-schema`
 * for a content type, mixin or form fragment, and any application's server for a form it reads
 * from a descriptor (an id provider's configuration, an application's site config). One item per
 * form item, told apart by `formItemType`.
 *
 * This is the dialect `@enonic-types/core` declares as `FormItem`, and a value typed there is
 * assignable here. What differs is honesty about the wire: fields XP omits when empty are
 * optional, `inputType` is any string because an application may register its own, and a config
 * value is `unknown` because XP emits strings, numbers and booleans alike.
 *
 * The other dialect in the estate — `{ Input: { … } }`, one wrapper key per item, `multiselection`
 * and `defaultOption` — is Content Studio's own Java REST talking to Content Studio's own client,
 * and lib-admin-ui's `Form.fromJson` reads it. It is not a contract between separately released
 * programs, so it is not here.
 */

/** How many times a form item may occur; `maximum` 0 is unbounded. */
export type OccurrencesJson = {
  readonly minimum: number;
  readonly maximum: number;
};

/**
 * A value in an input type's config as XP's JS libraries emit it — `GenericValue.toRawJs()` in
 * `lib-content` and `lib-schema`: a scalar, a list of values, or an object of them.
 */
export type InputConfigValueJson =
  | string
  | number
  | boolean
  | null
  | readonly InputConfigValueJson[]
  | { readonly [property: string]: InputConfigValueJson };

/**
 * An input type's config, one property per element of the schema's config: `maxLength: 11`,
 * `default: 'x'`, `options: [{ value: 'a', label: 'A' }]`. Content Studio's own REST wraps every
 * property in a list of `{ value }` entries instead; `@enonic/input-types` reads both.
 */
export type InputConfigJson = {
  readonly [property: string]: InputConfigValueJson;
};

export type InputJson = {
  readonly formItemType: 'Input';
  readonly name: string;
  readonly label: string;
  readonly helpText?: string;
  /** The input type's registration name: a built-in like `TextLine`, or an application's own. */
  readonly inputType: string;
  readonly occurrences: OccurrencesJson;
  readonly config?: InputConfigJson;
};

export type ItemSetJson = {
  readonly formItemType: 'ItemSet';
  readonly name: string;
  readonly label: string;
  readonly helpText?: string;
  readonly occurrences: OccurrencesJson;
  readonly items: readonly FormItemJson[];
};

export type OptionSetOptionJson = {
  readonly name: string;
  readonly label: string;
  readonly helpText?: string;
  /** Whether the option starts selected. */
  readonly default?: boolean;
  readonly items?: readonly FormItemJson[];
};

export type OptionSetJson = {
  readonly formItemType: 'OptionSet';
  readonly name: string;
  readonly label: string;
  readonly helpText?: string;
  /** Whether an occurrence starts expanded. */
  readonly expanded?: boolean;
  readonly occurrences: OccurrencesJson;
  /** How many options one occurrence may select. */
  readonly selection: OccurrencesJson;
  readonly options: readonly OptionSetOptionJson[];
};

/** A field set: a labelled group of items that holds no data of its own. */
export type LayoutJson = {
  readonly formItemType: 'Layout';
  readonly name?: string;
  readonly label?: string;
  readonly items: readonly FormItemJson[];
};

/** A reference to a form fragment `lib-schema` leaves as is; `lib-content` inlines it instead. */
export type FormFragmentJson = {
  readonly formItemType: 'FormFragment';
  readonly name: string;
};

export type FormItemJson = InputJson | ItemSetJson | OptionSetJson | LayoutJson | FormFragmentJson;

export type FormItemType = FormItemJson['formItemType'];

/** A form is its items, in order. */
export type FormJson = readonly FormItemJson[];
