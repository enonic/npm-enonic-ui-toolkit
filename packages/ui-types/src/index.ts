/**
 * `@enonic/ui-types` — the toolkit's type surface, and nothing else: no runtime, no dependencies.
 *
 * What lands here: the base domain types the other packages and their consumers share, and the
 * behavioural contracts between an application and something it hosts or is hosted by. See
 * `docs/architecture.md`.
 */

export type {
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
export type {
  Host,
  Module,
  Mount,
  MountOptions,
  NavigateOptions,
  NotifyOptions,
  Readable,
  Routed,
  RoutedHost,
  ToastTone,
  Unmount,
} from './mount';
export type { PrincipalType } from './principal';
export type {
  PropertyArrayJson,
  PropertyTreeJson,
  PropertyValueJson,
  ValueTypeName,
} from './property';
