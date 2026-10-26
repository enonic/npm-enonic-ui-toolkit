/**
 * A principal key is its string, `<type>:<idProvider>:<id>` for a user or a group and
 * `<type>:<id>` for a role; these read and build one. XP's ids are free text after the prefix, so
 * an id may itself contain a colon and the reading stops at the second separator.
 */

import type { GroupKey, PrincipalKey, PrincipalType, RoleKey, UserKey } from '@enonic/ui-types';

export const SYSTEM_ID_PROVIDER = 'system';

export const ANONYMOUS_USER_KEY: UserKey = 'user:system:anonymous';
export const SUPER_USER_KEY: UserKey = 'user:system:su';

export const ADMIN_ROLE_KEY: RoleKey = 'role:system.admin';
export const AUTHENTICATED_ROLE_KEY: RoleKey = 'role:system.authenticated';
export const EVERYONE_ROLE_KEY: RoleKey = 'role:system.everyone';
export const USER_ADMIN_ROLE_KEY: RoleKey = 'role:system.user.admin';
export const CMS_ADMIN_ROLE_KEY: RoleKey = 'role:cms.admin';
export const CMS_EXPERT_ROLE_KEY: RoleKey = 'role:cms.expert';

const SYSTEM_ROLE_PREFIX = 'system.';
const PROJECT_ROLE_PREFIX = 'cms.project.';

export function userKey(idProvider: string, id: string): UserKey {
  return `user:${idProvider}:${id}`;
}

export function groupKey(idProvider: string, id: string): GroupKey {
  return `group:${idProvider}:${id}`;
}

export function roleKey(id: string): RoleKey {
  return `role:${id}`;
}

/** Whether `value` has a kind prefix and the parts that kind needs, each non-empty. */
export function isPrincipalKey(value: string): value is PrincipalKey {
  const first = value.indexOf(':');
  if (first === -1) {
    return false;
  }
  const type = value.slice(0, first);
  const rest = value.slice(first + 1);
  if (type === 'role') {
    return rest !== '';
  }
  if (type !== 'user' && type !== 'group') {
    return false;
  }
  const second = rest.indexOf(':');
  return second > 0 && second < rest.length - 1;
}

/** The key `value` spells; throws on anything `isPrincipalKey` rejects. */
export function parsePrincipalKey(value: string): PrincipalKey {
  if (!isPrincipalKey(value)) {
    throw new Error(`Not a principal key: ${value}`);
  }
  return value;
}

export function principalType(key: PrincipalKey): PrincipalType {
  return key.slice(0, key.indexOf(':')) as PrincipalType;
}

/** The id after the prefix: `admin` of `user:system:admin`, `system.admin` of `role:system.admin`. */
export function principalId(key: PrincipalKey): string {
  const first = key.indexOf(':');
  if (principalType(key) === 'role') {
    return key.slice(first + 1);
  }
  return key.slice(key.indexOf(':', first + 1) + 1);
}

/** The id provider of a user or a group; a role has none. */
export function idProviderOf(key: PrincipalKey): string | undefined {
  const first = key.indexOf(':');
  if (principalType(key) === 'role') {
    return undefined;
  }
  return key.slice(first + 1, key.indexOf(':', first + 1));
}

/**
 * Where the Users application shows the principal: `/roles/<id>`, `/<idProvider>/users/<id>`,
 * `/<idProvider>/groups/<id>`.
 */
export function principalPath(key: PrincipalKey): string {
  const type = principalType(key);
  if (type === 'role') {
    return `/roles/${principalId(key)}`;
  }
  return `/${idProviderOf(key)}/${type}s/${principalId(key)}`;
}

/** The principals XP itself defines: `su`, `anonymous`, the `system.` roles and the project roles. */
export function isSystemPrincipal(key: PrincipalKey): boolean {
  if (key === SUPER_USER_KEY || key === ANONYMOUS_USER_KEY) {
    return true;
  }
  if (principalType(key) !== 'role') {
    return false;
  }
  const id = principalId(key);
  return id.startsWith(SYSTEM_ROLE_PREFIX) || id.startsWith(PROJECT_ROLE_PREFIX);
}
