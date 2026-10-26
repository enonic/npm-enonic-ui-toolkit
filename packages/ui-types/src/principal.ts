/**
 * A principal as XP names it: a key whose prefix is its kind, and the record behind it. These are
 * the shapes `@enonic-types/core` declares as `PrincipalKey`, `User`, `Group` and `Role`, copied
 * rather than imported — `docs/architecture.md`, "XP's shapes are copied, not imported" — and
 * pinned by `principal.test-d.ts` so that a value typed there is assignable here. What differs is
 * the wire: a field the REST layer drops or a summary omits is optional.
 *
 * `type` repeats the key's prefix so that the union narrows. A server that sends only the key is
 * read through `principalType` from `@enonic/ui-utils`.
 */

/** The kind of principal a key names, as the key's own prefix spells it: `user:system:admin`. */
export type PrincipalType = 'user' | 'group' | 'role';

/** `user:<idProvider>:<id>` */
export type UserKey = `user:${string}:${string}`;

/** `group:<idProvider>:<id>` */
export type GroupKey = `group:${string}:${string}`;

/** `role:<id>` — a role belongs to no id provider. */
export type RoleKey = `role:${string}`;

export type PrincipalKey = UserKey | GroupKey | RoleKey;

export type User = {
  readonly type: 'user';
  readonly key: UserKey;
  readonly displayName: string;
  readonly modifiedTime?: string;
  readonly disabled?: boolean;
  readonly email?: string;
  readonly login?: string;
  readonly idProvider?: string;
};

export type Group = {
  readonly type: 'group';
  readonly key: GroupKey;
  readonly displayName: string;
  readonly modifiedTime?: string;
  readonly description?: string;
};

export type Role = {
  readonly type: 'role';
  readonly key: RoleKey;
  readonly displayName: string;
  readonly modifiedTime?: string;
  readonly description?: string;
};

export type Principal = User | Group | Role;
