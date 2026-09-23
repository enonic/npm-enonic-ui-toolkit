import type { ReactElement } from 'react';

import type { PropertySet } from '../data';
import type { FieldSet } from '../schema';
import { FormItemRenderer } from './form-item-renderer';

export type FieldSetViewProps = {
  fieldSet: FieldSet;
  propertySet: PropertySet;
};

/** A field set groups items under a heading; its items write to the same set as it. */
export const FieldSetView = ({ fieldSet, propertySet }: FieldSetViewProps): ReactElement => {
  const formItems = fieldSet.getFormItems();
  const label = fieldSet.getLabel();
  return (
    <fieldset className="flex flex-col" data-component="FieldSetView">
      {label && (
        <legend className="mb-7.5 p-0 text-base font-normal uppercase leading-3.5 tracking-[0.96px]">
          {label}
        </legend>
      )}
      {formItems.length > 0 && (
        <div className="flex flex-col gap-7.5 border-l border-l-bdr-soft pl-5">
          {formItems.map((item, index) => (
            <FormItemRenderer
              key={`${index}:${item.getName()}`}
              formItem={item}
              propertySet={propertySet}
            />
          ))}
        </div>
      )}
    </fieldset>
  );
};
FieldSetView.displayName = 'FieldSetView';
