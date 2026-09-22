import { Button } from '@enonic/ui';
import type { FormJson } from '@enonic/ui-types';
import type { Meta, StoryObj } from '@storybook/preact-vite';
import { type ReactElement, useMemo, useState } from 'react';

import { ServerErrorsProvider, type ServerErrorEntry } from '../context/server-errors';
import { ValidationVisibilityProvider } from '../context/validation-visibility';
import { PropertyTree } from '../data';
import { validateForm } from '../descriptor/validate-form';
import { registerBuiltInTypes } from '../register-built-in-types';
import { Form } from '../schema';
import { FormRenderer, type FormRendererProps } from './form-renderer';
import { seedFormDefaults } from './seed-form-defaults';

registerBuiltInTypes();

const articleForm: FormJson = [
  {
    formItemType: 'Input',
    name: 'title',
    label: 'Title',
    inputType: 'TextLine',
    occurrences: { minimum: 1, maximum: 1 },
    config: { maxLength: [{ value: 60 }], showCounter: [{ value: true }] },
  },
  {
    formItemType: 'Input',
    name: 'tags',
    label: 'Tags',
    inputType: 'Tag',
    occurrences: { minimum: 0, maximum: 5 },
  },
  {
    formItemType: 'Layout',
    name: 'publishing',
    label: 'Publishing',
    items: [
      {
        formItemType: 'Input',
        name: 'publishFrom',
        label: 'Publish from',
        inputType: 'DateTime',
        occurrences: { minimum: 0, maximum: 1 },
      },
      {
        formItemType: 'Input',
        name: 'featured',
        label: 'Featured',
        inputType: 'Checkbox',
        occurrences: { minimum: 0, maximum: 1 },
      },
    ],
  },
  {
    formItemType: 'ItemSet',
    name: 'authors',
    label: 'Authors',
    helpText: 'Who wrote it, in order',
    occurrences: { minimum: 1, maximum: 3 },
    items: [
      {
        formItemType: 'Input',
        name: 'name',
        label: 'Name',
        inputType: 'TextLine',
        occurrences: { minimum: 1, maximum: 1 },
      },
      {
        formItemType: 'Input',
        name: 'role',
        label: 'Role',
        inputType: 'RadioButton',
        occurrences: { minimum: 0, maximum: 1 },
        config: {
          option: [
            { value: 'Writer', '@value': 'writer' },
            { value: 'Editor', '@value': 'editor' },
          ],
        },
      },
    ],
  },
  {
    formItemType: 'OptionSet',
    name: 'media',
    label: 'Media',
    occurrences: { minimum: 0, maximum: 2 },
    selection: { minimum: 1, maximum: 1 },
    options: [
      {
        name: 'image',
        label: 'Image',
        helpText: 'A picture with a caption',
        default: true,
        items: [
          {
            formItemType: 'Input',
            name: 'caption',
            label: 'Caption',
            inputType: 'TextArea',
            occurrences: { minimum: 0, maximum: 1 },
          },
        ],
      },
      {
        name: 'video',
        label: 'Video',
        items: [
          {
            formItemType: 'Input',
            name: 'duration',
            label: 'Duration (s)',
            inputType: 'Long',
            occurrences: { minimum: 1, maximum: 1 },
            config: { min: [{ value: 1 }] },
          },
        ],
      },
    ],
  },
  {
    formItemType: 'OptionSet',
    name: 'extras',
    label: 'Extras',
    occurrences: { minimum: 1, maximum: 1 },
    selection: { minimum: 0, maximum: 2 },
    options: [
      { name: 'comments', label: 'Allow comments' },
      { name: 'newsletter', label: 'Include in newsletter' },
      {
        name: 'sponsor',
        label: 'Sponsored',
        items: [
          {
            formItemType: 'Input',
            name: 'sponsorName',
            label: 'Sponsor',
            inputType: 'TextLine',
            occurrences: { minimum: 1, maximum: 1 },
          },
        ],
      },
    ],
  },
];

type DemoProps = Omit<FormRendererProps, 'form' | 'propertySet'> & {
  visibility?: 'none' | 'interactive' | 'all';
  serverErrors?: ServerErrorEntry[];
};

const Demo = ({
  visibility = 'interactive',
  serverErrors = [],
  ...props
}: DemoProps): ReactElement => {
  const form = useMemo(() => Form.fromJson(articleForm), []);
  const tree = useMemo(() => {
    const created = new PropertyTree();
    seedFormDefaults(form, created.getRoot());
    return created;
  }, [form]);
  const [json, setJson] = useState('');
  const [entries, setEntries] = useState(serverErrors);
  const [valid, setValid] = useState<boolean | undefined>(undefined);

  return (
    <ServerErrorsProvider
      entries={entries}
      clear={(path) => setEntries((prev) => prev.filter((e) => e.path !== path))}
      clearField={(path) => setEntries((prev) => prev.filter((e) => !e.path.startsWith(path)))}
    >
      <ValidationVisibilityProvider visibility={visibility}>
        <div className="flex w-160 flex-col gap-6 p-4" data-form-panel>
          <FormRenderer form={form} propertySet={tree.getRoot()} {...props} />
          <div className="flex items-center gap-2">
            <Button
              label="Validate and show data"
              onClick={() => {
                setValid(validateForm(form, tree.getRoot()).isValid);
                setJson(JSON.stringify(tree.toJson(), null, 2));
              }}
            />
            {valid !== undefined && (
              <span className={valid ? 'text-success' : 'text-error'}>
                {valid ? 'valid' : 'invalid'}
              </span>
            )}
          </div>
          {json && (
            <pre className="max-h-80 overflow-auto rounded bg-surface-neutral p-3 text-xs">
              {json}
            </pre>
          )}
        </div>
      </ValidationVisibilityProvider>
    </ServerErrorsProvider>
  );
};

const meta: Meta<DemoProps> = {
  title: 'Form/FormRenderer',
  component: Demo,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<DemoProps>;

export const Default: Story = {
  name: 'Examples / Article form',
  args: {},
};

export const AllErrorsVisible: Story = {
  name: 'States / All errors visible',
  args: { visibility: 'all' },
};

export const Disabled: Story = {
  name: 'States / Disabled',
  args: { enabled: false, visibility: 'none' },
};

export const WithServerErrors: Story = {
  name: 'States / Server errors',
  args: {
    visibility: 'all',
    serverErrors: [{ path: 'title', message: 'A title like this exists already' }],
  },
};

export const WithNotify: Story = {
  name: 'Features / Warnings through notify',
  args: {
    notify: (message: string) => alert(message),
  },
};

export const ExcludingTypes: Story = {
  name: 'Features / Excluding input types',
  args: { excludeInputTypes: ['Tag', 'DateTime'] },
};
