import { describe, expectTypeOf, it } from 'vitest';

import type { Host, MountOptions, Readable, SectionHost, SectionModule, Unmount } from './mount';

// Types only, so these assertions hold at typecheck time and the run is a formality: what they pin
// is the shape a host and a module compile against separately.
describe('mount contract', () => {
  it('hands a section everything a plain mount gets, plus its url segment', () => {
    expectTypeOf<SectionHost>().toExtend<Host>();
    expectTypeOf<SectionHost['path']>().toEqualTypeOf<Readable<string>>();
    expectTypeOf<SectionHost['visible']>().toEqualTypeOf<Readable<boolean>>();
  });

  it('gives a plain mount no url segment', () => {
    expectTypeOf<Host>().not.toHaveProperty('path');
    expectTypeOf<Host>().not.toHaveProperty('navigate');
  });

  it('defaults a module to the base host, and types a section module by its host', () => {
    expectTypeOf<MountOptions>().toEqualTypeOf<MountOptions<Host>>();

    const section: SectionModule<SectionHost> = {
      mount: ({ host }) => {
        host.navigate('/');
        return () => undefined;
      },
    };

    expectTypeOf<ReturnType<typeof section.mount>>().toEqualTypeOf<Unmount>();
    expectTypeOf<SectionModule<SectionHost>>().not.toExtend<SectionModule<Host>>();
    expectTypeOf<SectionModule<Host>>().toExtend<SectionModule<SectionHost>>();
  });
});
