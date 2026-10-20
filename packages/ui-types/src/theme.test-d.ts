import { expectTypeOf } from 'vitest';

import type { ResolvedTheme, Theme } from './theme';

expectTypeOf<Theme>().toEqualTypeOf<'light' | 'dark' | 'system'>();

expectTypeOf<ResolvedTheme>().toEqualTypeOf<'light' | 'dark'>();
