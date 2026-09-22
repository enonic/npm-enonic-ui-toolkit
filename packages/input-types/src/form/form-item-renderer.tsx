import type { ReactElement } from 'react';

import { InputField } from '../components/input-field';
import type { PropertySet } from '../data';
import { useInputTypesPhrases } from '../i18n/use-phrases';
import type { FieldSet, FormItem, FormItemSet, FormOptionSet, Input } from '../schema';
import { FieldSetView } from './field-set-view';
import { useFormRender } from './form-render-context';
import { ItemSetView } from './item-set-view';
import { OptionSetView } from './option-set-view';

const FORM_ITEM_RENDERER_NAME = 'FormItemRenderer';

export type FormItemRendererProps = {
  formItem: FormItem;
  propertySet: PropertySet;
};

/** One form item as its kind says: a field, a field set, an item set or an option set. */
export const FormItemRenderer = ({
  formItem,
  propertySet,
}: FormItemRendererProps): ReactElement => {
  const { enabled } = useFormRender();
  const t = useInputTypesPhrases();

  switch (formItem.kind) {
    case 'input':
      return <InputField input={formItem as Input} propertySet={propertySet} enabled={enabled} />;
    case 'fieldset':
      return <FieldSetView fieldSet={formItem as FieldSet} propertySet={propertySet} />;
    case 'itemset':
      return <ItemSetView itemSet={formItem as FormItemSet} propertySet={propertySet} />;
    case 'optionset':
      return <OptionSetView optionSet={formItem as FormOptionSet} propertySet={propertySet} />;
    default:
      return (
        <div
          data-component={FORM_ITEM_RENDERER_NAME}
          className="rounded border border-dashed border-bdr-subtle px-3 py-2 text-xs text-subtle"
        >
          {formItem.getName()}: {t('enonic.inputTypes.set.unknownItem')}
        </div>
      );
  }
};
FormItemRenderer.displayName = FORM_ITEM_RENDERER_NAME;
