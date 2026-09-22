import { Button, type ButtonProps, cn } from '@enonic/ui';
import type { ComponentPropsWithoutRef, ReactElement, ReactNode } from 'react';

import type { Input } from '../schema';

export type InputLabelActionProps = Omit<ButtonProps, 'size'>;

/** A small text button beside the label — "set default", "edit". */
const InputLabelAction = ({ className, ...props }: InputLabelActionProps): ReactElement => (
  <Button
    data-component="InputLabelAction"
    {...props}
    variant="text"
    size="sm"
    className={cn('-my-0.75 h-6 px-1.5 focus-visible:ring-offset-0', className)}
  />
);
InputLabelAction.displayName = 'InputLabelAction';

export type InputLabelRootProps = {
  input: Input;
  children?: ReactNode;
} & ComponentPropsWithoutRef<'div'>;

/** The input's label with a required mark, its help text, and room for actions on the right. */
const InputLabelRoot = ({
  input,
  children,
  className,
  ...props
}: InputLabelRootProps): ReactElement | null => {
  const label = input.getLabel();
  const description = input.getHelpText();
  if (!label && !description) return null;
  const hasChildren = children != null;
  const required = input.getOccurrences().required();
  return (
    <div
      data-component="InputLabel"
      className={cn(hasChildren && 'grid grid-cols-[1fr_auto] items-baseline gap-x-2', className)}
      {...props}
    >
      {label && (
        <div
          className={cn(
            'text-base font-semibold text-main',
            hasChildren && description && 'col-span-full',
          )}
        >
          {label}
          {required && ' *'}
        </div>
      )}
      {description && <div className="text-sm text-subtle">{description}</div>}
      {children}
    </div>
  );
};
InputLabelRoot.displayName = 'InputLabel';

export const InputLabel = Object.assign(InputLabelRoot, {
  Root: InputLabelRoot,
  Action: InputLabelAction,
});
