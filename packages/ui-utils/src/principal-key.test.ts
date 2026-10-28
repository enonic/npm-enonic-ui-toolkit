import type { PrincipalRecord, User, UserRecord } from '@enonic/ui-types';
import { describe, expect, expectTypeOf, it } from 'vitest';

import {
  ANONYMOUS_USER_KEY,
  EVERYONE_ROLE_KEY,
  groupKey,
  idProviderOf,
  isGroupRecord,
  isPrincipalKey,
  isRoleRecord,
  isSystemPrincipal,
  isUserRecord,
  parsePrincipalKey,
  principalId,
  principalPath,
  principalType,
  roleKey,
  SUPER_USER_KEY,
  toPrincipal,
  userKey,
} from './principal-key';

describe('a principal key', () => {
  it('is built from its parts', () => {
    expect(userKey('system', 'su')).toBe('user:system:su');
    expect(groupKey('myidp', 'editors')).toBe('group:myidp:editors');
    expect(roleKey('system.admin')).toBe('role:system.admin');
    expect(userKey('system', 'su')).toBe(SUPER_USER_KEY);
    expect(roleKey('system.everyone')).toBe(EVERYONE_ROLE_KEY);
  });

  it('is told apart by its prefix', () => {
    expect(principalType('user:system:su')).toBe('user');
    expect(principalType('group:myidp:editors')).toBe('group');
    expect(principalType('role:system.admin')).toBe('role');
  });

  it('gives its id and id provider back', () => {
    expect(principalId('user:system:su')).toBe('su');
    expect(principalId('group:myidp:editors')).toBe('editors');
    expect(principalId('role:cms.project.default.owner')).toBe('cms.project.default.owner');
    expect(idProviderOf('user:system:su')).toBe('system');
    expect(idProviderOf('group:myidp:editors')).toBe('myidp');
    expect(idProviderOf('role:system.admin')).toBeUndefined();
  });

  it('keeps a colon inside the id', () => {
    expect(principalId('user:myidp:a:b')).toBe('a:b');
    expect(idProviderOf('user:myidp:a:b')).toBe('myidp');
    expect(principalId('role:a:b')).toBe('a:b');
  });

  it('is recognized by its shape', () => {
    expect(isPrincipalKey('user:system:su')).toBe(true);
    expect(isPrincipalKey('group:myidp:editors')).toBe(true);
    expect(isPrincipalKey('role:system.admin')).toBe(true);
    expect(isPrincipalKey('user:myidp:a:b')).toBe(true);
    expect(isPrincipalKey('su')).toBe(false);
    expect(isPrincipalKey('user:su')).toBe(false);
    expect(isPrincipalKey('user::su')).toBe(false);
    expect(isPrincipalKey('user:system:')).toBe(false);
    expect(isPrincipalKey('role:')).toBe(false);
    expect(isPrincipalKey('admin:system:su')).toBe(false);
    expect(isPrincipalKey('')).toBe(false);
  });

  it('is parsed from a string or refused', () => {
    expect(parsePrincipalKey('user:system:su')).toBe('user:system:su');
    expect(() => parsePrincipalKey('system:su')).toThrow('Not a principal key: system:su');
  });

  it('names where the Users application shows it', () => {
    expect(principalPath('role:system.admin')).toBe('/roles/system.admin');
    expect(principalPath('user:system:su')).toBe('/system/users/su');
    expect(principalPath('group:myidp:editors')).toBe('/myidp/groups/editors');
  });

  it('knows the principals XP defines', () => {
    expect(isSystemPrincipal(SUPER_USER_KEY)).toBe(true);
    expect(isSystemPrincipal(ANONYMOUS_USER_KEY)).toBe(true);
    expect(isSystemPrincipal('role:system.admin')).toBe(true);
    expect(isSystemPrincipal('role:cms.project.default.owner')).toBe(true);
    expect(isSystemPrincipal('role:cms.admin')).toBe(false);
    expect(isSystemPrincipal('user:system:admin')).toBe(false);
    expect(isSystemPrincipal('group:system.editors:x')).toBe(false);
  });
});

describe('a principal record', () => {
  const records: PrincipalRecord[] = [
    { key: 'user:system:su', displayName: 'Super User', email: 'su@example.com' },
    { key: 'group:myidp:editors', displayName: 'Editors', description: 'Who edits' },
    { key: 'role:system.admin', displayName: 'Administrator' },
  ];

  it('becomes the principal its key says, with every field kept', () => {
    expect(records.map(toPrincipal)).toEqual([
      { type: 'user', key: 'user:system:su', displayName: 'Super User', email: 'su@example.com' },
      {
        type: 'group',
        key: 'group:myidp:editors',
        displayName: 'Editors',
        description: 'Who edits',
      },
      { type: 'role', key: 'role:system.admin', displayName: 'Administrator' },
    ]);
  });

  it('keeps the kind it was read as', () => {
    const user: UserRecord = { key: 'user:system:su', displayName: 'Super User' };
    const principal = toPrincipal(user);

    expectTypeOf(principal).toEqualTypeOf<User>();
    expect(principal.type).toBe('user');
  });

  it('is left as it is when it carries type already', () => {
    const user: User = { type: 'user', key: 'user:system:su', displayName: 'Super User' };

    expect(toPrincipal(user)).toEqual(user);
  });

  it('is told apart by its key where no normalizing is needed', () => {
    expect(records.filter(isUserRecord).map(({ key }) => key)).toEqual(['user:system:su']);
    expect(records.filter(isGroupRecord).map(({ key }) => key)).toEqual(['group:myidp:editors']);
    expect(records.filter(isRoleRecord).map(({ key }) => key)).toEqual(['role:system.admin']);
  });
});
