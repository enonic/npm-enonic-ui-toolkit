import { expectTypeOf } from 'vitest';

import type { PrincipalType } from './principal';

expectTypeOf<PrincipalType>().toEqualTypeOf<'user' | 'group' | 'role'>();
