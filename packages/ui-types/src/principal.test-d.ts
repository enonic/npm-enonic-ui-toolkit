import { expectTypeOf } from 'vitest';

import type {
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

// Publishing freezes the shape, so every exported type is pinned against its literal.

expectTypeOf<PrincipalType>().toEqualTypeOf<'user' | 'group' | 'role'>();
expectTypeOf<UserKey>().toEqualTypeOf<`user:${string}:${string}`>();
expectTypeOf<GroupKey>().toEqualTypeOf<`group:${string}:${string}`>();
expectTypeOf<RoleKey>().toEqualTypeOf<`role:${string}`>();
expectTypeOf<PrincipalKey>().toEqualTypeOf<UserKey | GroupKey | RoleKey>();
expectTypeOf<Principal>().toEqualTypeOf<User | Group | Role>();

// A key is told apart by its prefix alone.
expectTypeOf<'user:system:su'>().toExtend<UserKey>();
expectTypeOf<'role:system.admin'>().toExtend<RoleKey>();
expectTypeOf<'user:system:su'>().not.toExtend<GroupKey>();
expectTypeOf<'role:system.admin'>().not.toExtend<UserKey>();
expectTypeOf<'system.admin'>().not.toExtend<PrincipalKey>();

// `type` narrows the union to the record of that kind.
declare const principal: Principal;
if (principal.type === 'user') {
  expectTypeOf(principal).toEqualTypeOf<User>();
  expectTypeOf(principal.key).toEqualTypeOf<UserKey>();
}
if (principal.type === 'role') {
  expectTypeOf(principal).toEqualTypeOf<Role>();
}

// What `@enonic-types/core` declares is assignable here — the same wire, with every field
// present. Copied rather than imported: this package has no dependencies.
type CoreUser = {
  type: 'user';
  key: `user:${string}:${string}`;
  displayName: string;
  modifiedTime?: string;
  disabled?: boolean;
  email?: string;
  login: string;
  idProvider: string;
  hasPassword: boolean;
};
type CoreGroup = {
  type: 'group';
  key: `group:${string}:${string}`;
  displayName: string;
  modifiedTime: string;
  description?: string;
};
type CoreRole = {
  type: 'role';
  key: `role:${string}`;
  displayName: string;
  modifiedTime: string;
  description?: string;
};
expectTypeOf<CoreUser>().toExtend<User>();
expectTypeOf<CoreGroup>().toExtend<Group>();
expectTypeOf<CoreRole>().toExtend<Role>();
expectTypeOf<CoreUser | CoreGroup | CoreRole>().toExtend<Principal>();

// What Content Studio's REST sends — a key and a name, no `type` — is a record, not a principal;
// and what carries `type` is a record still.
type StudioPrincipalJson = { key: `user:${string}:${string}`; displayName: string };
type StudioUserJson = {
  key: `user:${string}:${string}`;
  displayName: string;
  email?: string;
  disabled?: boolean;
};
expectTypeOf<StudioPrincipalJson>().toExtend<PrincipalRecord>();
expectTypeOf<StudioUserJson>().toExtend<UserRecord>();
expectTypeOf<StudioPrincipalJson>().not.toExtend<Principal>();
expectTypeOf<User>().toExtend<UserRecord>();
expectTypeOf<Principal>().toExtend<PrincipalRecord>();
expectTypeOf<PrincipalRecord>().toEqualTypeOf<UserRecord | GroupRecord | RoleRecord>();
expectTypeOf<UserRecord>().not.toHaveProperty('type');
expectTypeOf<keyof UserRecord>().toEqualTypeOf<Exclude<keyof User, 'type'>>();
