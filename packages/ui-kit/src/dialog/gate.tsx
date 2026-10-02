import { cn, Input, type InputProps } from '@enonic/ui';
import {
  type ComponentPropsWithoutRef,
  forwardRef,
  type ReactElement,
  useEffect,
  useLayoutEffect,
  useState,
} from 'react';

import { fillPhrase } from '../i18n/fill-phrase';
import { useUiKitPhrases } from '../i18n/use-phrases';
import { useActionDialog } from './action-dialog-context';
import { matchesExpected, normalizeTyped } from './gate-match';

// Held back: a wrong entry is what a right one looks like halfway through.
const ERROR_DELAY_MS = 500;

//
// * Root
//

const ROOT_NAME = 'Gate.Root';

const GateRoot = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<'div'>>(
  ({ className, ...props }, ref): ReactElement => (
    <div
      ref={ref}
      data-component={ROOT_NAME}
      className={cn('bg-surface-primary flex flex-col gap-2.5 rounded-lg p-7.5', className)}
      {...props}
    />
  ),
);
GateRoot.displayName = ROOT_NAME;

//
// * Hint
//

export type GateHintProps = {
  /** What has to be typed back, shown in bold inside the sentence. */
  value: string | number;
} & ComponentPropsWithoutRef<'p'>;

const HINT_NAME = 'Gate.Hint';

const GateHint = forwardRef<HTMLParagraphElement, GateHintProps>(
  ({ value, className, ...props }, ref): ReactElement => {
    const t = useUiKitPhrases();

    return (
      <p ref={ref} data-component={HINT_NAME} className={cn('text-xl', className)} {...props}>
        {fillPhrase(t('enonic.uiKit.gate.hint'), [<strong key="value">{value}</strong>])}
      </p>
    );
  },
);
GateHint.displayName = HINT_NAME;

//
// * Input
//

export type GateInputProps = {
  expected: string | number;
  /** In place of the comparison with `expected`. */
  validate?: (typed: string) => boolean;
  /** Applied to what was typed before the comparison; trims by default. */
  normalize?: (typed: string) => string;
} & Omit<InputProps, 'value' | 'onChange' | 'error' | 'readOnly'>;

const INPUT_NAME = 'Gate.Input';

/** The field to type the name or the count into; the dialog's confirm button follows it. */
const GateInput = forwardRef<HTMLInputElement, GateInputProps>(
  ({ expected, validate, normalize = normalizeTyped, className, ...props }, ref): ReactElement => {
    const t = useUiKitPhrases();
    const { setConfirmEnabled } = useActionDialog();
    const [typed, setTyped] = useState('');
    const [showError, setShowError] = useState(false);

    const entered = normalize(typed);
    const matched = validate ? validate(entered) : matchesExpected(typed, expected, normalize);

    // Layout effect: the button follows the field in the same frame the field appears or changes.
    useLayoutEffect(() => {
      setConfirmEnabled(matched);
    }, [matched, setConfirmEnabled]);

    useEffect(() => {
      if (entered === '' || matched) {
        setShowError(false);
        return;
      }
      const timer = setTimeout(() => setShowError(true), ERROR_DELAY_MS);
      return () => clearTimeout(timer);
    }, [entered, matched]);

    return (
      <Input
        ref={ref}
        data-component={INPUT_NAME}
        value={typed}
        inputMode={typeof expected === 'number' ? 'numeric' : undefined}
        aria-label={t('enonic.uiKit.gate.hint', expected)}
        error={showError ? t('enonic.uiKit.gate.mismatch', expected, entered) : undefined}
        // Matched, the field locks: what was typed cannot drift from what the button now acts on.
        readOnly={matched}
        className={cn('w-3/5 max-w-sm', className)}
        onChange={(event) => setTyped(event.currentTarget.value)}
        {...props}
      />
    );
  },
);
GateInput.displayName = INPUT_NAME;

/** The typed-back confirmation: a hint naming what to type, and the field it is typed into. */
export const Gate = Object.assign(GateRoot, {
  Root: GateRoot,
  Hint: GateHint,
  Input: GateInput,
});
