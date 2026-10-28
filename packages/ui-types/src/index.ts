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
  InputConfigValueJson,
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
export type {
  Group,
  GroupKey,
  GroupRecord,
  Principal,
  PrincipalKey,
  PrincipalRecord,
  PrincipalType,
  Role,
  RoleKey,
  RoleRecord,
  User,
  UserKey,
  UserRecord,
} from './principal';
export type {
  PropertyArrayJson,
  PropertyTreeJson,
  PropertyValueJson,
  ValueTypeName,
} from './property';
export type { TaskInfo, TaskProgress, TaskState } from './task';
export type { ResolvedTheme, Theme } from './theme';
