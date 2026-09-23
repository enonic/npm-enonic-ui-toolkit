import type { FormJson } from '@enonic/ui-types';
import { describe, expect, it } from 'vitest';

import { readOptions } from '../descriptor/option-descriptors';
import { FieldSet } from './field-set';
import { Form } from './form';
import { FormItemSet } from './form-item-set';
import { FormOptionSet } from './form-option-set';
import { Input } from './input';
import { normalizeInputConfig } from './input-config';
import { InputTypeName } from './input-type-name';
import { Occurrences } from './occurrences';

const json: FormJson = [
  {
    formItemType: 'Input',
    name: 'title',
    label: 'Title',
    inputType: 'TextLine',
    occurrences: { minimum: 1, maximum: 1 },
    config: { maxLength: [{ value: 42 }] },
  },
  {
    formItemType: 'Layout',
    label: 'Details',
    items: [
      {
        formItemType: 'Input',
        name: 'tags',
        label: 'Tags',
        helpText: 'Some tags',
        inputType: 'custom:my-tags',
        occurrences: { minimum: 0, maximum: 0 },
      },
    ],
  },
  {
    formItemType: 'ItemSet',
    name: 'address',
    label: 'Address',
    occurrences: { minimum: 0, maximum: 3 },
    items: [
      {
        formItemType: 'Input',
        name: 'zip',
        label: 'Zip',
        inputType: 'TextLine',
        occurrences: { minimum: 1, maximum: 1 },
      },
    ],
  },
  {
    formItemType: 'OptionSet',
    name: 'contact',
    label: 'Contact',
    expanded: true,
    occurrences: { minimum: 1, maximum: 1 },
    selection: { minimum: 1, maximum: 1 },
    options: [
      {
        name: 'email',
        label: 'Email',
        default: true,
        items: [
          {
            formItemType: 'Input',
            name: 'address',
            label: 'Address',
            inputType: 'TextLine',
            occurrences: { minimum: 1, maximum: 1 },
          },
        ],
      },
      { name: 'none', label: 'None', default: false, items: [] },
    ],
  },
  { formItemType: 'FormFragment', name: 'seo' },
];

describe('Form', () => {
  it('reads XP JSON into items with a kind each, skipping fragment references', () => {
    const form = Form.fromJson(json, 'com.example.app');
    expect(form.getFormItems().map((item) => item.kind)).toEqual([
      'input',
      'fieldset',
      'itemset',
      'optionset',
    ]);
    expect(form.getInputByName('title')?.getInputType().getName()).toBe('TextLine');
    expect(form.getInputByName('title')?.getInputTypeConfig()?.maxLength?.[0]?.value).toBe(42);
    expect(form.getInputByName('address')).toBeUndefined();
    expect(form.getFormItemByName('address')?.kind).toBe('itemset');
    expect(form.getFormItems()[0]?.getApplicationKey()).toBe('com.example.app');
  });

  it('models a field set as items with no data path of their own', () => {
    const form = Form.fromJson(json);
    const fieldSet = form.getFormItems()[1];
    if (!(fieldSet instanceof FieldSet)) throw new Error('fieldset');
    expect(fieldSet.getLabel()).toBe('Details');
    const tags = fieldSet.getFormItems()[0];
    if (!(tags instanceof Input)) throw new Error('input');
    expect(tags.getInputType().toString()).toBe('custom:my-tags');
    expect(tags.getInputType().isBuiltIn()).toBe(false);
    expect(tags.getPath().toString()).toBe('.tags');
    expect(tags.getOccurrences().multiple()).toBe(true);
  });

  it('nests paths through item sets and options', () => {
    const form = Form.fromJson(json);
    const address = form.getFormItemByName('address');
    if (!(address instanceof FormItemSet)) throw new Error('itemset');
    expect(address.getInputByName('zip')?.getPath().toString()).toBe('.address.zip');
    expect(address.getOccurrences().getMaximum()).toBe(3);

    const contact = form.getFormItemByName('contact');
    if (!(contact instanceof FormOptionSet)) throw new Error('optionset');
    expect(contact.isRadioSelection()).toBe(true);
    expect(contact.isExpanded()).toBe(true);
    expect(contact.getOptions().map((option) => option.isDefaultOption())).toEqual([true, false]);
    expect(contact.getOptions()[0]?.getFormItemByName('address')?.getPath().toString()).toBe(
      '.contact.email.address',
    );
    expect(contact.getFormItems()).toBe(contact.getOptions());
  });

  it('writes the same JSON back, less the fragment', () => {
    const form = Form.fromJson(json);
    expect(form.toJson()).toEqual(json.slice(0, -1));
    expect(Form.fromJson(form.toJson()).equals(form)).toBe(true);
  });

  it('refuses a repeated name except for a field set', () => {
    const input = (name: string): Input =>
      Input.create()
        .setName(name)
        .setInputType(new InputTypeName('TextLine'))
        .setOccurrences(Occurrences.minmax(0, 1))
        .build();
    const form = new Form([input('a')]);
    expect(() => form.addFormItem(input('a'))).toThrow('FormItem already added: a');
    form.addFormItem(new FieldSet({ items: [input('b')] }));
    expect(() => form.addFormItem(new FieldSet({ items: [input('c')] }))).not.toThrow();
    expect(
      () =>
        new FormItemSet({
          name: 's',
          label: 'S',
          occurrences: Occurrences.minmax(0, 0),
          items: [input('x'), input('x')],
        }),
    ).toThrow('FormItem already added: x');
  });

  it('compares occurrences and input type names by value', () => {
    expect(Occurrences.minmax(1, 3).equals(Occurrences.fromJson({ minimum: 1, maximum: 3 }))).toBe(
      true,
    );
    expect(Occurrences.min(1).required()).toBe(true);
    expect(Occurrences.max(2).maximumReached(2)).toBe(true);
    expect(Occurrences.minmax(0, 0).maximumReached(99)).toBe(false);
    expect(Occurrences.minmax(2, 0).minimumBreached(1)).toBe(true);
    expect(InputTypeName.parseInputTypeName('custom:x').equals(new InputTypeName('x', true))).toBe(
      true,
    );
    expect(InputTypeName.parseInputTypeName('TextLine').equals(new InputTypeName('TextLine'))).toBe(
      true,
    );
  });
});

describe('input config', () => {
  it('reads XP raw config values as the entries a descriptor expects', () => {
    const form = Form.fromJson([
      {
        formItemType: 'Input',
        name: 'size',
        label: 'Size',
        inputType: 'ComboBox',
        occurrences: { minimum: 0, maximum: 1 },
        config: {
          maxLength: 11,
          showCounter: true,
          default: 'one',
          allowPath: ['/a', '/b'],
          options: [
            { value: 'one', label: 'Option One' },
            { value: 'two', label: { text: 'Option Two', i18n: 'combobox.option2' } },
          ],
        },
      },
    ]);
    const config = form.getInputByName('size')?.getInputTypeConfig();
    expect(config?.maxLength).toEqual([{ value: 11 }]);
    expect(config?.showCounter).toEqual([{ value: true }]);
    expect(config?.default).toEqual([{ value: 'one' }]);
    expect(config?.allowPath).toEqual([{ value: '/a' }, { value: '/b' }]);
    expect(readOptions(config ?? {})).toEqual([
      { label: 'Option One', value: 'one' },
      { label: 'Option Two', value: 'two' },
    ]);
  });

  it('leaves Content Studio entries as they are', () => {
    const entries = {
      maxLength: [{ value: 11 }],
      options: [{ value: 'Option One', '@value': 'one' }],
    };
    expect(normalizeInputConfig(entries)).toEqual(entries);
    expect(readOptions(entries)).toEqual([{ label: 'Option One', value: 'one' }]);
  });
});
