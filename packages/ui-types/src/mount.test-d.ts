import { expectTypeOf } from 'vitest';

import type {
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

// Publishing freezes the shape, so every exported type is pinned against its literal. This file
// runs under vitest's typecheck mode: a mismatch is a compile error, not a passed test.

expectTypeOf<Readable<number>>().toEqualTypeOf<{
  get(): number;
  listen(listener: (value: number) => void): () => void;
}>();

expectTypeOf<ToastTone>().toEqualTypeOf<'info' | 'success' | 'warning' | 'error'>();

expectTypeOf<NotifyOptions>().toEqualTypeOf<{ autoHide?: boolean; lifetimeMs?: number }>();

expectTypeOf<NavigateOptions>().toEqualTypeOf<{ replace?: boolean }>();

expectTypeOf<Host>().toEqualTypeOf<{
  baseUrl: string;
  extension: string;
  locale: string;
  theme: Readable<'light' | 'dark'>;
  visible: Readable<boolean>;
  notify(tone: ToastTone, message: string, options?: NotifyOptions): () => void;
}>();

expectTypeOf<Routed>().toEqualTypeOf<{
  path: Readable<string>;
  navigate(subPath: string, options?: NavigateOptions): void;
}>();

expectTypeOf<RoutedHost>().toEqualTypeOf<Host & Routed>();

expectTypeOf<MountOptions>().toEqualTypeOf<{ container: HTMLElement; host: Host }>();
expectTypeOf<MountOptions<RoutedHost>>().toEqualTypeOf<{
  container: HTMLElement;
  host: RoutedHost;
}>();

expectTypeOf<Unmount>().toEqualTypeOf<() => void>();

expectTypeOf<Mount>().toEqualTypeOf<(options: MountOptions<Host>) => Unmount>();

expectTypeOf<Module>().toEqualTypeOf<{ mount: Mount<Host> }>();

// The one behaviour beyond shape: a module written for a routed host is not a module for a plain
// one. This holds only while `mount` is a property.
expectTypeOf<Module<RoutedHost>>().not.toExtend<Module<Host>>();
expectTypeOf<Module<Host>>().toExtend<Module<RoutedHost>>();
