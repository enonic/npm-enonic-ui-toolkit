import type { ReactElement } from 'react';

import { useInputTypesPhrases } from '../i18n/use-phrases';
import type { Input } from '../schema';

export type UnsupportedInputProps = {
  input: Input;
};

/** What an input renders as when its type has no component in the registry. */
export const UnsupportedInput = ({ input }: UnsupportedInputProps): ReactElement => {
  const t = useInputTypesPhrases();
  return (
    <div
      data-component="UnsupportedInput"
      className="flex min-h-12 cursor-default items-center justify-center rounded border border-dashed border-bdr-subtle px-4.5 py-3 text-xs text-subtle"
    >
      {t('enonic.inputTypes.field.unsupportedType', input.getInputType().getName())}
    </div>
  );
};
UnsupportedInput.displayName = 'UnsupportedInput';
