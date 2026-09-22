import { useMemo } from 'react';

import { useInputTypeRegistry } from '../context/input-type-registry-context';
import type { InputTypeConfig } from '../descriptor/input-type-config';
import type { InputTypeDescriptor } from '../descriptor/input-type-descriptor';
import type { Input } from '../schema';

export type UseInputTypeDescriptorResult<C extends InputTypeConfig = InputTypeConfig> = {
  descriptor: InputTypeDescriptor<C>;
  config: C;
};

/** An input's descriptor and its read config, or `undefined` for a type the registry lacks. */
export function useInputTypeDescriptor<C extends InputTypeConfig = InputTypeConfig>(
  input: Input,
): UseInputTypeDescriptorResult<C> | undefined {
  const registry = useInputTypeRegistry();
  return useMemo(() => {
    const descriptor = registry.getDescriptor<C>(input.getInputType().getName());
    if (descriptor === undefined) return undefined;
    return { descriptor, config: descriptor.readConfig(input.getInputTypeConfig() ?? {}) };
  }, [registry, input]);
}
