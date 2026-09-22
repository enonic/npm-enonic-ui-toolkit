import { type ReactElement, useMemo } from 'react';

import { InputTypeRegistryProvider } from '../context/input-type-registry-context';
import type { PropertySet } from '../data';
import type { InputTypeRegistry } from '../registry';
import type { Form, Input } from '../schema';
import { FormItemRenderer } from './form-item-renderer';
import { FormRenderProvider } from './form-render-context';

export type FormRendererProps = {
  form: Form;
  propertySet: PropertySet;
  enabled?: boolean;
  /** The application whose schema this is, for its own input types. */
  applicationKey?: string;
  /** Input types left out of this rendering, by registration name; a nested form hides its host's. */
  excludeInputTypes?: readonly string[];
  /** The registry to render from; the shared one, or the nearest provider's, when absent. */
  registry?: InputTypeRegistry;
  notify?: (message: string) => void;
};

/**
 * A whole form over one property set. Renders the items and nothing around them: the locale,
 * the validation visibility, the server errors and the field registry are providers an
 * application composes outside, where it has them.
 */
export const FormRenderer = ({
  form,
  propertySet,
  enabled = true,
  applicationKey,
  excludeInputTypes,
  registry,
  notify,
}: FormRendererProps): ReactElement => {
  const excluded = useMemo(
    () => new Set((excludeInputTypes ?? []).map((name) => name.toLowerCase())),
    [excludeInputTypes],
  );

  const items =
    excluded.size === 0
      ? form.getFormItems()
      : form.getFormItems().filter((item) => {
          if (item.kind !== 'input') return true;
          return !excluded.has((item as Input).getInputType().getName().toLowerCase());
        });

  const rendered = (
    <FormRenderProvider enabled={enabled} applicationKey={applicationKey} notify={notify}>
      <div className="flex flex-col gap-7.5" data-component="FormRenderer">
        {items.map((item) => (
          <FormItemRenderer key={item.getName()} formItem={item} propertySet={propertySet} />
        ))}
      </div>
    </FormRenderProvider>
  );

  return registry === undefined ? (
    rendered
  ) : (
    <InputTypeRegistryProvider registry={registry}>{rendered}</InputTypeRegistryProvider>
  );
};
FormRenderer.displayName = 'FormRenderer';
