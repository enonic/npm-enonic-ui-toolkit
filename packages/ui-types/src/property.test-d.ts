import { expectTypeOf } from 'vitest';

import type {
  PropertyArrayJson,
  PropertyTreeJson,
  PropertyValueJson,
  ValueTypeName,
} from './property';

expectTypeOf<ValueTypeName>().toEqualTypeOf<
  | 'PropertySet'
  | 'String'
  | 'Xml'
  | 'LocalDate'
  | 'LocalTime'
  | 'LocalDateTime'
  | 'DateTime'
  | 'Long'
  | 'Boolean'
  | 'Double'
  | 'GeoPoint'
  | 'Reference'
  | 'BinaryReference'
  | 'Link'
>();

expectTypeOf<PropertyValueJson>().toEqualTypeOf<{
  readonly v?: unknown;
  readonly set?: readonly PropertyArrayJson[];
}>();

expectTypeOf<PropertyArrayJson>().toEqualTypeOf<{
  readonly name: string;
  readonly type: ValueTypeName;
  readonly values: readonly PropertyValueJson[];
}>();

expectTypeOf<PropertyTreeJson>().toEqualTypeOf<readonly PropertyArrayJson[]>();

// A tree as XP writes one: a scalar array and a set array nesting another tree.
const tree = [
  { name: 'title', type: 'String', values: [{ v: 'Hello' }] },
  {
    name: 'address',
    type: 'PropertySet',
    values: [{ set: [{ name: 'zip', type: 'Long', values: [{ v: 1234 }] }] }],
  },
] as const;
expectTypeOf(tree).toExtend<PropertyTreeJson>();
