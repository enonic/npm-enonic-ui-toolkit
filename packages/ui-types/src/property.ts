/**
 * A property tree as XP serializes it — `PropertyTreeJson` in core-api — and as its JS libraries
 * hand it over: the data of a content, an application's site config, an id provider's config. A
 * tree is a list of arrays; an array is a named, typed list of values; a value is a scalar under `v`
 * or a nested set under `set`, never both.
 */

/** The value types XP knows, named as `com.enonic.xp.data.ValueTypes` names them. */
export type ValueTypeName =
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
  | 'Link';

export type PropertyValueJson = {
  /** The scalar, in the wire form of the array's type: a string for a date, a number for a `Long`. */
  readonly v?: unknown;
  /** The nested tree of a `PropertySet` value. */
  readonly set?: readonly PropertyArrayJson[];
};

export type PropertyArrayJson = {
  readonly name: string;
  readonly type: ValueTypeName;
  readonly values: readonly PropertyValueJson[];
};

export type PropertyTreeJson = readonly PropertyArrayJson[];
