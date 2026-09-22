import { cn } from '@enonic/ui';
import type { ComponentPropsWithoutRef, ReactElement, ReactNode } from 'react';

const ITEM_LABEL_NAME = 'ItemLabel';

export type ItemLabelProps = {
  icon?: ReactNode;
  primary: ReactNode;
  secondary?: ReactNode;
} & ComponentPropsWithoutRef<'div'>;

/** A primary line with an optional secondary under it, both truncated; an icon before them. */
export const ItemLabel = ({
  icon,
  primary,
  secondary,
  className,
  ...props
}: ItemLabelProps): ReactElement => (
  <div
    data-component={ITEM_LABEL_NAME}
    className={cn(
      'grid items-center gap-2.5',
      icon ? 'grid-cols-[auto_1fr]' : 'grid-cols-1',
      className,
    )}
    {...props}
  >
    {icon && (
      <div className="flex size-6 shrink-0 items-center justify-center group-data-[tone=inverse]:text-alt">
        {icon}
      </div>
    )}
    <div className="flex flex-col overflow-hidden text-left">
      <span className="w-full truncate font-semibold leading-5.5 group-data-[tone=inverse]:text-alt">
        {primary}
      </span>
      {secondary && (
        <small className="w-full truncate text-sm leading-4.5 text-subtle group-data-[tone=inverse]:text-alt">
          {secondary}
        </small>
      )}
    </div>
  </div>
);
ItemLabel.displayName = ITEM_LABEL_NAME;
