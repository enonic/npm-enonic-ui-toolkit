import type { InputConfigJson } from '@enonic/ui-types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PropertyTree } from '../data';
import type { Value } from '../data';
import { ValueTypes } from '../data';
import { Form, type FormItem } from '../schema';
import { Input, InputBuilder } from '../schema';
import { InputTypeName } from '../schema';
import { Occurrences } from '../schema';
import { FieldSet } from '../schema';
import { FormItemSet } from '../schema';
import { FormOptionSet } from '../schema';
import { FormOptionSetOption } from '../schema';
import type { InputTypeDefinition } from '../types';
import type { InputTypeDescriptor } from './input-type-descriptor';
import { validateForm } from './validate-form';
import type { ValidationMessage, ValidationResult } from './validation-result';

const mocks = vi.hoisted(() => ({
  getDefinition: vi.fn(),
}));

vi.mock('../registry', () => ({
  inputTypeRegistry: { getDefinition: mocks.getDefinition },
}));

function makeDescriptor(overrides: Partial<InputTypeDescriptor> = {}): InputTypeDescriptor {
  return {
    name: 'TestType',
    getValueType: () => ValueTypes.STRING,
    readConfig: () => ({}),
    createDefaultValue: () => ValueTypes.STRING.newNullValue(),
    validate: () => [],
    valueBreaksRequired: (value: Value) => value.isNull(),
    ...overrides,
  };
}

function makeDefinition(overrides: Partial<InputTypeDescriptor> = {}): InputTypeDefinition {
  return { mode: 'list', descriptor: makeDescriptor(overrides) };
}

function makeInput(name: string, min = 0, max = 1) {
  return new InputBuilder()
    .setName(name)
    .setInputType(new InputTypeName('TestType', false))
    .setLabel(name)
    .setOccurrences(Occurrences.minmax(min, max))
    .setHelpText('')
    .setInputTypeConfig({})
    .build();
}

type LegacyInputJson = {
  name: string;
  label?: string;
  inputType: string;
  occurrences: { minimum: number; maximum: number };
  config?: InputConfigJson;
  helpText?: string;
};
type LegacyItemJson = {
  Input?: LegacyInputJson;
  FormItemSet?: LegacySetJson;
  FormOptionSet?: LegacyOptionSetJson;
  FieldSet?: LegacyFieldSetJson;
};
type LegacySetJson = {
  name: string;
  label: string;
  helpText?: string;
  occurrences: { minimum: number; maximum: number };
  items?: LegacyItemJson[];
};
type LegacyOptionSetJson = LegacySetJson & {
  expanded?: boolean;
  multiselection: { minimum: number; maximum: number };
  options?: {
    name: string;
    label: string;
    helpText?: string;
    defaultOption?: boolean;
    items?: LegacyItemJson[];
  }[];
};
type LegacyFieldSetJson = { name: string; label?: string; items?: LegacyItemJson[] };

// The lib-admin-ui tests built their schemas from Content Studio's wrapper JSON; these read it.
function legacyItems(items: LegacyItemJson[] = []): FormItem[] {
  return items.map((json) => {
    if (json.Input) {
      return Input.fromJson({
        ...json.Input,
        label: json.Input.label ?? '',
        formItemType: 'Input',
      });
    }
    if (json.FormItemSet) return legacyItemSet(json.FormItemSet);
    if (json.FormOptionSet) return legacyOptionSet(json.FormOptionSet);
    if (json.FieldSet) return legacyFieldSet(json.FieldSet);
    throw new Error('unknown legacy item');
  });
}
function legacyItemSet(json: LegacySetJson): FormItemSet {
  return new FormItemSet({
    name: json.name,
    label: json.label,
    helpText: json.helpText || undefined,
    occurrences: Occurrences.fromJson(json.occurrences),
    items: legacyItems(json.items),
  });
}
function legacyOptionSet(json: LegacyOptionSetJson): FormOptionSet {
  return new FormOptionSet({
    name: json.name,
    label: json.label,
    helpText: json.helpText || undefined,
    expanded: json.expanded,
    occurrences: Occurrences.fromJson(json.occurrences),
    multiselection: Occurrences.fromJson(json.multiselection),
    options: (json.options ?? []).map(
      (option) =>
        new FormOptionSetOption({
          name: option.name,
          label: option.label,
          helpText: option.helpText || undefined,
          defaultOption: option.defaultOption,
          items: legacyItems(option.items),
        }),
    ),
  });
}
function legacyFieldSet(json: LegacyFieldSetJson): FieldSet {
  return new FieldSet({ name: json.name, label: json.label, items: legacyItems(json.items) });
}

// The tests read every node kind's fields after asserting `type`; the union is widened once here.
type LooseNode = {
  type: string;
  path: string;
  name: string;
  errors: ValidationResult[][];
  occurrenceError?: ValidationMessage;
  optional: boolean;
  children: LooseNode[];
  isValid?: boolean;
  occurrences: {
    children: LooseNode[];
    multiselectionError?: ValidationMessage;
    isValid?: boolean;
  }[];
};
type LooseResult = { isValid: boolean; children: LooseNode[] };
const looseValidate = (...args: Parameters<typeof validateForm>): LooseResult =>
  validateForm(...args) as unknown as LooseResult;

describe('validateForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getDefinition.mockReturnValue(makeDefinition());
  });

  it('returns valid for empty form', () => {
    const form = new Form([]);
    const propertySet = new PropertyTree().getRoot();

    const result = looseValidate(form, propertySet);

    expect(result.isValid).toBe(true);
    expect(result.children).toEqual([]);
  });

  it('returns valid for single valid Input', () => {
    const input = makeInput('title', 0, 1);
    const form = new Form([input]);
    const tree = new PropertyTree();
    tree.getRoot().addProperty('title', ValueTypes.STRING.newValue('hello'));

    const result = looseValidate(form, tree.getRoot());

    expect(result.isValid).toBe(true);
    expect(result.children).toHaveLength(1);
    expect(result.children[0]!.type).toBe('input');
  });

  it('returns invalid for required Input with validation errors', () => {
    mocks.getDefinition.mockReturnValue(
      makeDefinition({ validate: () => [{ message: 'Invalid value' }] }),
    );

    const input = makeInput('email', 1, 1);
    const form = new Form([input]);
    const tree = new PropertyTree();
    tree.getRoot().addProperty('email', ValueTypes.STRING.newValue('bad'));

    const result = looseValidate(form, tree.getRoot());

    expect(result.isValid).toBe(false);
    const node = result.children[0]!;
    expect(node.type).toBe('input');
    if (node.type === 'input') {
      expect(node.optional).toBe(false);
      expect(node.errors[0]!).toEqual([{ message: 'Invalid value' }]);
    }
  });

  it('keeps form valid when optional Input has validation errors', () => {
    mocks.getDefinition.mockReturnValue(
      makeDefinition({ validate: () => [{ message: 'Invalid value' }] }),
    );

    const input = makeInput('email', 0, 1);
    const form = new Form([input]);
    const tree = new PropertyTree();
    tree.getRoot().addProperty('email', ValueTypes.STRING.newValue('bad'));

    const result = looseValidate(form, tree.getRoot());

    // Errors are still recorded on the node — UI surfaces them — but the
    // form-level rollup treats the optional input as valid.
    expect(result.isValid).toBe(true);
    const node = result.children[0]!;
    expect(node.type).toBe('input');
    if (node.type === 'input') {
      expect(node.optional).toBe(true);
      expect(node.errors[0]!).toEqual([{ message: 'Invalid value' }]);
    }
  });

  it('detects minimum breach for required Input with no value', () => {
    const input = makeInput('required', 1, 1);
    const form = new Form([input]);
    const propertySet = new PropertyTree().getRoot();

    const result = looseValidate(form, propertySet);

    const node = result.children[0]!;
    expect(node.type).toBe('input');
    if (node.type === 'input') {
      expect(node.occurrenceError).toBeDefined();
    }
  });

  it('detects multiple occurrences below min', () => {
    const input = makeInput('tags', 3, 5);
    const form = new Form([input]);
    const tree = new PropertyTree();
    tree.getRoot().addProperty('tags', ValueTypes.STRING.newValue('one'));
    tree.getRoot().addProperty('tags', ValueTypes.STRING.newValue('two'));

    const result = looseValidate(form, tree.getRoot());

    const node = result.children[0]!;
    expect(node.type).toBe('input');
    if (node.type === 'input') {
      expect(node.occurrenceError).toMatchObject({ key: 'enonic.inputTypes.occurrence.breaksMin' });
    }
  });

  it('validates FieldSet with mixed valid/invalid children', () => {
    const invalidDef = makeDefinition({ validate: () => [{ message: 'Bad' }] });
    const validDef = makeDefinition();
    // First call returns valid for 'good', second returns invalid for 'bad'
    mocks.getDefinition.mockReturnValueOnce(validDef).mockReturnValueOnce(invalidDef);

    const goodInput = makeInput('good', 0, 1);
    const badInput = makeInput('bad', 1, 1);

    const fieldSet = legacyFieldSet({ name: 'fs', label: 'FS', items: [] });
    fieldSet.addFormItem(goodInput);
    fieldSet.addFormItem(badInput);

    const form = new Form([fieldSet]);
    const tree = new PropertyTree();
    tree.getRoot().addProperty('good', ValueTypes.STRING.newValue('ok'));
    tree.getRoot().addProperty('bad', ValueTypes.STRING.newValue('nope'));

    const result = looseValidate(form, tree.getRoot());

    expect(result.isValid).toBe(false);
    const fsNode = result.children[0]!;
    expect(fsNode.type).toBe('fieldset');
    if (fsNode.type === 'fieldset') {
      expect(fsNode.isValid).toBe(false);
      expect(fsNode.children).toHaveLength(2);
    }
  });

  it('returns ItemSetValidationNode for FormItemSet with 0 occurrences (min=0)', () => {
    const formItemSet = legacyItemSet({
      name: 'itemSet',
      label: 'Items',
      occurrences: { minimum: 0, maximum: 0 },
      helpText: '',
      items: [],
    });

    const form = new Form([formItemSet]);
    const propertySet = new PropertyTree().getRoot();

    const result = looseValidate(form, propertySet);

    expect(result.isValid).toBe(true);
    expect(result.children).toHaveLength(1);
    const node = result.children[0]!;
    expect(node.type).toBe('itemset');
    expect(node.name).toBe('itemSet');
    if (node.type === 'itemset') {
      expect(node.occurrences).toEqual([]);
      expect(node.occurrenceError).toBeUndefined();
    }
  });

  it('returns occurrenceError for FormItemSet with 0 occurrences when min=1', () => {
    const formItemSet = legacyItemSet({
      name: 'itemSet',
      label: 'Items',
      occurrences: { minimum: 1, maximum: 0 },
      helpText: '',
      items: [],
    });

    const form = new Form([formItemSet]);
    const propertySet = new PropertyTree().getRoot();

    const result = looseValidate(form, propertySet);

    expect(result.isValid).toBe(false);
    const node = result.children[0]!;
    expect(node.type).toBe('itemset');
    if (node.type === 'itemset') {
      expect(node.occurrenceError).toEqual({ key: 'enonic.inputTypes.set.breaksMin', values: [1] });
      expect(node.occurrences).toEqual([]);
    }
  });

  it('validates FormItemSet with 1 valid occurrence', () => {
    const formItemSet = legacyItemSet({
      name: 'mySet',
      label: 'My Set',
      occurrences: { minimum: 0, maximum: 0 },
      helpText: '',
      items: [
        {
          Input: {
            name: 'title',
            inputType: 'TestType',
            label: 'Title',
            occurrences: { minimum: 0, maximum: 1 },
            config: {},
            helpText: '',
          },
        },
      ],
    });

    const form = new Form([formItemSet]);
    const tree = new PropertyTree();
    const setData = tree.getRoot().addPropertySet('mySet');
    setData.addProperty('title', ValueTypes.STRING.newValue('Hello'));

    const result = looseValidate(form, tree.getRoot());

    expect(result.isValid).toBe(true);
    const node = result.children[0]!;
    expect(node.type).toBe('itemset');
    if (node.type === 'itemset') {
      expect(node.occurrences).toHaveLength(1);
      expect(node.occurrences[0]!.isValid).toBe(true);
      expect(node.occurrences[0]!.children).toHaveLength(1);
      expect(node.occurrences[0]!.children[0]!.type).toBe('input');
    }
  });

  it('validates FormItemSet with 1 invalid occurrence (required input, no value)', () => {
    mocks.getDefinition.mockReturnValue(
      makeDefinition({
        valueBreaksRequired: (value: Value) => value.isNull(),
      }),
    );

    const formItemSet = legacyItemSet({
      name: 'mySet',
      label: 'My Set',
      occurrences: { minimum: 0, maximum: 0 },
      helpText: '',
      items: [
        {
          Input: {
            name: 'title',
            inputType: 'TestType',
            label: 'Title',
            occurrences: { minimum: 1, maximum: 1 },
            config: {},
            helpText: '',
          },
        },
      ],
    });

    const form = new Form([formItemSet]);
    const tree = new PropertyTree();
    tree.getRoot().addPropertySet('mySet');

    const result = looseValidate(form, tree.getRoot());

    const node = result.children[0]!;
    expect(node.type).toBe('itemset');
    if (node.type === 'itemset') {
      expect(node.occurrences).toHaveLength(1);
      expect(node.occurrences[0]!.isValid).toBe(false);
      const inputNode = node.occurrences[0]!.children[0]!;
      if (inputNode.type === 'input') {
        expect(inputNode.occurrenceError).toBeDefined();
      }
    }
  });

  it('validates FormItemSet with 2 occurrences, one valid and one invalid', () => {
    const formItemSet = legacyItemSet({
      name: 'mySet',
      label: 'My Set',
      occurrences: { minimum: 0, maximum: 0 },
      helpText: '',
      items: [
        {
          Input: {
            name: 'title',
            inputType: 'TestType',
            label: 'Title',
            occurrences: { minimum: 1, maximum: 1 },
            config: {},
            helpText: '',
          },
        },
      ],
    });

    const form = new Form([formItemSet]);
    const tree = new PropertyTree();
    const validSet = tree.getRoot().addPropertySet('mySet');
    validSet.addProperty('title', ValueTypes.STRING.newValue('Valid'));
    tree.getRoot().addPropertySet('mySet'); // empty — required input missing

    const result = looseValidate(form, tree.getRoot());

    const node = result.children[0]!;
    expect(node.type).toBe('itemset');
    if (node.type === 'itemset') {
      expect(node.occurrences).toHaveLength(2);
      expect(node.occurrences[0]!.isValid).toBe(true);
      expect(node.occurrences[1]!.isValid).toBe(false);
    }
  });

  it('handles FormItemSet with null PropertyArray (same as empty)', () => {
    const formItemSet = legacyItemSet({
      name: 'missing',
      label: 'Missing',
      occurrences: { minimum: 0, maximum: 0 },
      helpText: '',
      items: [
        {
          Input: {
            name: 'title',
            inputType: 'TestType',
            label: 'Title',
            occurrences: { minimum: 0, maximum: 1 },
            config: {},
            helpText: '',
          },
        },
      ],
    });

    const form = new Form([formItemSet]);
    const propertySet = new PropertyTree().getRoot();

    const result = looseValidate(form, propertySet);

    const node = result.children[0]!;
    expect(node.type).toBe('itemset');
    if (node.type === 'itemset') {
      expect(node.occurrences).toHaveLength(0);
      expect(node.occurrenceError).toBeUndefined();
    }
  });

  it('FieldSet isValid reflects nested ItemSet validity', () => {
    const formItemSet = legacyItemSet({
      name: 'mySet',
      label: 'My Set',
      occurrences: { minimum: 1, maximum: 0 },
      helpText: '',
      items: [],
    });

    const fieldSet = legacyFieldSet({ name: 'fs', label: 'FS', items: [] });
    fieldSet.addFormItem(formItemSet);

    const form = new Form([fieldSet]);
    const propertySet = new PropertyTree().getRoot();

    const result = looseValidate(form, propertySet);

    expect(result.isValid).toBe(false);
    const fsNode = result.children[0]!;
    expect(fsNode.type).toBe('fieldset');
    if (fsNode.type === 'fieldset') {
      expect(fsNode.isValid).toBe(false);
      expect(fsNode.children).toHaveLength(1);
      expect(fsNode.children[0]!.type).toBe('itemset');
    }
  });

  it('validates mixed form with Input and ItemSet', () => {
    const input = makeInput('standalone', 0, 1);
    const formItemSet = legacyItemSet({
      name: 'mySet',
      label: 'My Set',
      occurrences: { minimum: 0, maximum: 0 },
      helpText: '',
      items: [
        {
          Input: {
            name: 'nested',
            inputType: 'TestType',
            label: 'Nested',
            occurrences: { minimum: 0, maximum: 1 },
            config: {},
            helpText: '',
          },
        },
      ],
    });

    const form = new Form([input, formItemSet]);
    const tree = new PropertyTree();
    tree.getRoot().addProperty('standalone', ValueTypes.STRING.newValue('val'));
    const setData = tree.getRoot().addPropertySet('mySet');
    setData.addProperty('nested', ValueTypes.STRING.newValue('inner'));

    const result = looseValidate(form, tree.getRoot());

    expect(result.isValid).toBe(true);
    expect(result.children).toHaveLength(2);
    expect(result.children[0]!.type).toBe('input');
    expect(result.children[1]!.type).toBe('itemset');
    if (result.children[1]!.type === 'itemset') {
      expect(result.children[1]!.occurrences).toHaveLength(1);
      expect(result.children[1]!.occurrences[0]!.isValid).toBe(true);
    }
  });

  it('returns OptionSetValidationNode for FormOptionSet', () => {
    const formOptionSet = legacyOptionSet({
      name: 'optionSet',
      label: 'Options',
      occurrences: { minimum: 0, maximum: 0 },
      helpText: '',
      expanded: false,
      multiselection: { minimum: 0, maximum: 1 },
      options: [],
    });

    const form = new Form([formOptionSet]);
    const propertySet = new PropertyTree().getRoot();

    const result = looseValidate(form, propertySet);

    expect(result.children).toHaveLength(1);
    expect(result.children[0]!.type).toBe('optionset');
    expect(result.children[0]!.name).toBe('optionSet');
  });

  it('OptionSet with 0 occurrences, min=0 is valid', () => {
    const formOptionSet = legacyOptionSet({
      name: 'myOptions',
      label: 'Options',
      occurrences: { minimum: 0, maximum: 0 },
      helpText: '',
      expanded: false,
      multiselection: { minimum: 1, maximum: 1 },
      options: [],
    });

    const form = new Form([formOptionSet]);
    const propertySet = new PropertyTree().getRoot();

    const result = looseValidate(form, propertySet);

    expect(result.isValid).toBe(true);
    const node = result.children[0]!;
    expect(node.type).toBe('optionset');
    if (node.type === 'optionset') {
      expect(node.occurrences).toEqual([]);
      expect(node.occurrenceError).toBeUndefined();
    }
  });

  it('OptionSet with 0 occurrences, min=1 has occurrenceError', () => {
    const formOptionSet = legacyOptionSet({
      name: 'myOptions',
      label: 'Options',
      occurrences: { minimum: 1, maximum: 0 },
      helpText: '',
      expanded: false,
      multiselection: { minimum: 1, maximum: 1 },
      options: [],
    });

    const form = new Form([formOptionSet]);
    const propertySet = new PropertyTree().getRoot();

    const result = looseValidate(form, propertySet);

    expect(result.isValid).toBe(false);
    const node = result.children[0]!;
    expect(node.type).toBe('optionset');
    if (node.type === 'optionset') {
      expect(node.occurrenceError).toEqual({ key: 'enonic.inputTypes.set.breaksMin', values: [1] });
      expect(node.occurrences).toEqual([]);
    }
  });

  it('OptionSet with 1 occurrence, no selection, multiselection min=1 has multiselectionError', () => {
    const formOptionSet = legacyOptionSet({
      name: 'myOptions',
      label: 'Options',
      occurrences: { minimum: 0, maximum: 0 },
      helpText: '',
      expanded: false,
      multiselection: { minimum: 1, maximum: 1 },
      options: [{ name: 'optionA', label: 'Option A', defaultOption: false, helpText: '' }],
    });

    const form = new Form([formOptionSet]);
    const tree = new PropertyTree();
    tree.getRoot().addPropertySet('myOptions'); // empty occurrence, no _selected

    const result = looseValidate(form, tree.getRoot());

    const node = result.children[0]!;
    expect(node.type).toBe('optionset');
    if (node.type === 'optionset') {
      expect(node.occurrences).toHaveLength(1);
      expect(node.occurrences[0]!.multiselectionError).toEqual({
        key: 'enonic.inputTypes.optionSet.selectionBreaksMin',
        values: [1],
      });
      expect(node.occurrences[0]!.isValid).toBe(false);
    }
  });

  it('OptionSet with 1 occurrence, 1 valid selection is valid', () => {
    const formOptionSet = legacyOptionSet({
      name: 'myOptions',
      label: 'Options',
      occurrences: { minimum: 0, maximum: 0 },
      helpText: '',
      expanded: false,
      multiselection: { minimum: 1, maximum: 1 },
      options: [{ name: 'optionA', label: 'Option A', defaultOption: false, helpText: '' }],
    });

    const form = new Form([formOptionSet]);
    const tree = new PropertyTree();
    const occurrenceSet = tree.getRoot().addPropertySet('myOptions');
    occurrenceSet.addProperty('_selected', ValueTypes.STRING.newValue('optionA'));

    const result = looseValidate(form, tree.getRoot());

    expect(result.isValid).toBe(true);
    const node = result.children[0]!;
    expect(node.type).toBe('optionset');
    if (node.type === 'optionset') {
      expect(node.occurrences).toHaveLength(1);
      expect(node.occurrences[0]!.multiselectionError).toBeUndefined();
      expect(node.occurrences[0]!.isValid).toBe(true);
    }
  });

  it('OptionSet with 1 occurrence, 1 selection with invalid required child is invalid', () => {
    mocks.getDefinition.mockReturnValue(
      makeDefinition({
        valueBreaksRequired: (value: Value) => value.isNull(),
      }),
    );

    const formOptionSet = legacyOptionSet({
      name: 'myOptions',
      label: 'Options',
      occurrences: { minimum: 0, maximum: 0 },
      helpText: '',
      expanded: false,
      multiselection: { minimum: 1, maximum: 1 },
      options: [
        {
          name: 'optionA',
          label: 'Option A',
          defaultOption: false,
          helpText: '',
          items: [
            {
              Input: {
                name: 'title',
                inputType: 'TestType',
                label: 'Title',
                occurrences: { minimum: 1, maximum: 1 },
                config: {},
                helpText: '',
              },
            },
          ],
        },
      ],
    });

    const form = new Form([formOptionSet]);
    const tree = new PropertyTree();
    const occurrenceSet = tree.getRoot().addPropertySet('myOptions');
    occurrenceSet.addProperty('_selected', ValueTypes.STRING.newValue('optionA'));
    // Add optionA data set but leave title empty (required input missing)
    occurrenceSet.addPropertySet('optionA');

    const result = looseValidate(form, tree.getRoot());

    const node = result.children[0]!;
    expect(node.type).toBe('optionset');
    if (node.type === 'optionset') {
      expect(node.occurrences).toHaveLength(1);
      expect(node.occurrences[0]!.multiselectionError).toBeUndefined();
      expect(node.occurrences[0]!.isValid).toBe(false);
      expect(node.occurrences[0]!.children).toHaveLength(1);
      expect(node.occurrences[0]!.children[0]!.type).toBe('input');
    }
  });

  it('OptionSet radio (multiselection min=1, max=1) requires exactly 1 selection', () => {
    const formOptionSet = legacyOptionSet({
      name: 'myOptions',
      label: 'Options',
      occurrences: { minimum: 0, maximum: 0 },
      helpText: '',
      expanded: false,
      multiselection: { minimum: 1, maximum: 1 },
      options: [
        { name: 'optionA', label: 'Option A', defaultOption: false, helpText: '' },
        { name: 'optionB', label: 'Option B', defaultOption: false, helpText: '' },
      ],
    });

    const form = new Form([formOptionSet]);

    // 0 selections — breaches min
    const tree0 = new PropertyTree();
    tree0.getRoot().addPropertySet('myOptions');
    const result0 = looseValidate(form, tree0.getRoot());
    const node0 = result0.children[0]!;
    if (node0.type === 'optionset') {
      expect(node0.occurrences[0]!.multiselectionError).toEqual({
        key: 'enonic.inputTypes.optionSet.selectionBreaksMin',
        values: [1],
      });
    }

    // 1 selection — valid
    const tree1 = new PropertyTree();
    const occ1 = tree1.getRoot().addPropertySet('myOptions');
    occ1.addProperty('_selected', ValueTypes.STRING.newValue('optionA'));
    const result1 = looseValidate(form, tree1.getRoot());
    const node1 = result1.children[0]!;
    if (node1.type === 'optionset') {
      expect(node1.occurrences[0]!.multiselectionError).toBeUndefined();
    }

    // 2 selections — breaches max
    const tree2 = new PropertyTree();
    const occ2 = tree2.getRoot().addPropertySet('myOptions');
    occ2.addProperty('_selected', ValueTypes.STRING.newValue('optionA'));
    occ2.addProperty('_selected', ValueTypes.STRING.newValue('optionB'));
    const result2 = looseValidate(form, tree2.getRoot());
    const node2 = result2.children[0]!;
    if (node2.type === 'optionset') {
      expect(node2.occurrences[0]!.multiselectionError).toEqual({
        key: 'enonic.inputTypes.optionSet.selectionBreaksMax',
        values: [1],
      });
    }
  });

  it('OptionSet stale _selected name not in schema is filtered out', () => {
    const formOptionSet = legacyOptionSet({
      name: 'myOptions',
      label: 'Options',
      occurrences: { minimum: 0, maximum: 0 },
      helpText: '',
      expanded: false,
      multiselection: { minimum: 1, maximum: 1 },
      options: [{ name: 'optionA', label: 'Option A', defaultOption: false, helpText: '' }],
    });

    const form = new Form([formOptionSet]);
    const tree = new PropertyTree();
    const occurrenceSet = tree.getRoot().addPropertySet('myOptions');
    // _selected contains a name not in the schema options
    occurrenceSet.addProperty('_selected', ValueTypes.STRING.newValue('nonExistent'));

    const result = looseValidate(form, tree.getRoot());

    const node = result.children[0]!;
    expect(node.type).toBe('optionset');
    if (node.type === 'optionset') {
      // "nonExistent" is filtered out, so 0 selected → min breached
      expect(node.occurrences[0]!.multiselectionError).toEqual({
        key: 'enonic.inputTypes.optionSet.selectionBreaksMin',
        values: [1],
      });
    }
  });

  it('OptionSet null _selected array counts as 0 selections', () => {
    const formOptionSet = legacyOptionSet({
      name: 'myOptions',
      label: 'Options',
      occurrences: { minimum: 0, maximum: 0 },
      helpText: '',
      expanded: false,
      multiselection: { minimum: 1, maximum: 1 },
      options: [{ name: 'optionA', label: 'Option A', defaultOption: false, helpText: '' }],
    });

    const form = new Form([formOptionSet]);
    const tree = new PropertyTree();
    // Add occurrence set but no _selected property at all
    tree.getRoot().addPropertySet('myOptions');

    const result = looseValidate(form, tree.getRoot());

    const node = result.children[0]!;
    expect(node.type).toBe('optionset');
    if (node.type === 'optionset') {
      expect(node.occurrences[0]!.multiselectionError).toEqual({
        key: 'enonic.inputTypes.optionSet.selectionBreaksMin',
        values: [1],
      });
    }
  });

  it('OptionSet 2 occurrences with different selection states have independent multiselectionError', () => {
    const formOptionSet = legacyOptionSet({
      name: 'myOptions',
      label: 'Options',
      occurrences: { minimum: 0, maximum: 0 },
      helpText: '',
      expanded: false,
      multiselection: { minimum: 1, maximum: 1 },
      options: [
        { name: 'optionA', label: 'Option A', defaultOption: false, helpText: '' },
        { name: 'optionB', label: 'Option B', defaultOption: false, helpText: '' },
      ],
    });

    const form = new Form([formOptionSet]);
    const tree = new PropertyTree();

    // First occurrence: 1 valid selection
    const occ1 = tree.getRoot().addPropertySet('myOptions');
    occ1.addProperty('_selected', ValueTypes.STRING.newValue('optionA'));

    // Second occurrence: 0 selections (min breached)
    tree.getRoot().addPropertySet('myOptions');

    const result = looseValidate(form, tree.getRoot());

    const node = result.children[0]!;
    expect(node.type).toBe('optionset');
    if (node.type === 'optionset') {
      expect(node.occurrences).toHaveLength(2);
      expect(node.occurrences[0]!.multiselectionError).toBeUndefined();
      expect(node.occurrences[0]!.isValid).toBe(true);
      expect(node.occurrences[1]!.multiselectionError).toEqual({
        key: 'enonic.inputTypes.optionSet.selectionBreaksMin',
        values: [1],
      });
      expect(node.occurrences[1]!.isValid).toBe(false);
    }
  });

  it('validates mixed form with Input, ItemSet, and OptionSet', () => {
    const input = makeInput('standalone', 0, 1);
    const formItemSet = legacyItemSet({
      name: 'mySet',
      label: 'My Set',
      occurrences: { minimum: 0, maximum: 0 },
      helpText: '',
      items: [
        {
          Input: {
            name: 'nested',
            inputType: 'TestType',
            label: 'Nested',
            occurrences: { minimum: 0, maximum: 1 },
            config: {},
            helpText: '',
          },
        },
      ],
    });
    const formOptionSet = legacyOptionSet({
      name: 'myOptions',
      label: 'Options',
      occurrences: { minimum: 0, maximum: 0 },
      helpText: '',
      expanded: false,
      multiselection: { minimum: 1, maximum: 1 },
      options: [{ name: 'optionA', label: 'Option A', defaultOption: false, helpText: '' }],
    });

    const form = new Form([input, formItemSet, formOptionSet]);
    const tree = new PropertyTree();
    tree.getRoot().addProperty('standalone', ValueTypes.STRING.newValue('val'));
    const setData = tree.getRoot().addPropertySet('mySet');
    setData.addProperty('nested', ValueTypes.STRING.newValue('inner'));
    const optData = tree.getRoot().addPropertySet('myOptions');
    optData.addProperty('_selected', ValueTypes.STRING.newValue('optionA'));

    const result = looseValidate(form, tree.getRoot());

    expect(result.isValid).toBe(true);
    expect(result.children).toHaveLength(3);
    expect(result.children[0]!.type).toBe('input');
    expect(result.children[1]!.type).toBe('itemset');
    expect(result.children[2]!.type).toBe('optionset');
    if (result.children[2]!.type === 'optionset') {
      expect(result.children[2]!.occurrences).toHaveLength(1);
      expect(result.children[2]!.occurrences[0]!.isValid).toBe(true);
    }
  });

  it('attaches server errors matched by path tagged server (and custom)', () => {
    const input = makeInput('myField', 0, 1);
    const form = new Form([input]);
    const tree = new PropertyTree();
    tree.getRoot().addProperty('myField', ValueTypes.STRING.newValue('val'));

    const serverError = { path: 'myField', message: 'Server says no' };

    const result = looseValidate(form, tree.getRoot(), { serverErrors: [serverError] });

    const node = result.children[0]!;
    if (node.type === 'input') {
      const allErrors = node.errors.flat();
      expect(allErrors).toContainEqual({ message: 'Server says no', custom: true, server: true });
    }
  });

  it('attaches an indexed server error to its own occurrence', () => {
    const input = makeInput('tags', 0, 5);
    const form = new Form([input]);
    const tree = new PropertyTree();
    tree.getRoot().addProperty('tags', ValueTypes.STRING.newValue('a'));
    tree.getRoot().addProperty('tags', ValueTypes.STRING.newValue('b'));

    const result = looseValidate(form, tree.getRoot(), {
      serverErrors: [{ path: 'tags[1]', message: 'Second is bad' }],
    });

    const node = result.children[0]!;
    expect(node.type).toBe('input');
    if (node.type === 'input') {
      expect(node.errors[0]).toEqual([]);
      expect(node.errors[1]).toEqual([{ message: 'Second is bad', custom: true, server: true }]);
    }
  });

  it('keeps an optional Input valid when it has a client-only custom error (not server)', () => {
    mocks.getDefinition.mockReturnValue(
      makeDefinition({ validate: () => [{ message: 'Client custom', custom: true }] }),
    );

    const input = makeInput('email', 0, 1);
    const form = new Form([input]);
    const tree = new PropertyTree();
    tree.getRoot().addProperty('email', ValueTypes.STRING.newValue('bad'));

    const result = looseValidate(form, tree.getRoot());

    expect(result.isValid).toBe(true);
  });

  it('does not attach server errors that do not match path', () => {
    const input = makeInput('myField', 0, 1);
    const form = new Form([input]);
    const tree = new PropertyTree();
    tree.getRoot().addProperty('myField', ValueTypes.STRING.newValue('val'));

    const serverError = { path: 'otherField', message: 'Wrong field' };

    const result = looseValidate(form, tree.getRoot(), { serverErrors: [serverError] });

    const node = result.children[0]!;
    if (node.type === 'input') {
      const allErrors = node.errors.flat();
      expect(allErrors).not.toContainEqual(expect.objectContaining({ custom: true }));
    }
  });

  it('invalidates the form when an optional Input has a server error', () => {
    const input = makeInput('myField', 0, 1);
    const form = new Form([input]);
    const tree = new PropertyTree();
    tree.getRoot().addProperty('myField', ValueTypes.STRING.newValue('val'));

    const serverError = { path: 'myField', message: 'Server says no' };

    const result = looseValidate(form, tree.getRoot(), { serverErrors: [serverError] });

    expect(result.isValid).toBe(false);
  });

  it('does not match a server error on a different field with a shared prefix', () => {
    const input = makeInput('myField', 0, 1);
    const form = new Form([input]);
    const tree = new PropertyTree();
    tree.getRoot().addProperty('myField', ValueTypes.STRING.newValue('val'));

    const serverError = { path: 'myFieldExtra', message: 'Other' };

    const result = looseValidate(form, tree.getRoot(), { serverErrors: [serverError] });

    expect(result.isValid).toBe(true);
    const node = result.children[0]!;
    if (node.type === 'input') {
      expect(node.errors.flat()).not.toContainEqual(expect.objectContaining({ custom: true }));
    }
  });

  it('matches a server error on a field in a non-first FormItemSet occurrence', () => {
    const formItemSet = legacyItemSet({
      name: 'mySet',
      label: 'My Set',
      occurrences: { minimum: 0, maximum: 0 },
      helpText: '',
      items: [
        {
          Input: {
            name: 'title',
            inputType: 'TestType',
            label: 'Title',
            occurrences: { minimum: 0, maximum: 1 },
            config: {},
            helpText: '',
          },
        },
      ],
    });

    const form = new Form([formItemSet]);
    const tree = new PropertyTree();
    const first = tree.getRoot().addPropertySet('mySet');
    first.addProperty('title', ValueTypes.STRING.newValue('Hello'));
    const second = tree.getRoot().addPropertySet('mySet');
    second.addProperty('title', ValueTypes.STRING.newValue('World'));

    const serverError = { path: 'mySet[1].title', message: 'Server says no' };

    const result = looseValidate(form, tree.getRoot(), { serverErrors: [serverError] });

    expect(result.isValid).toBe(false);
    const node = result.children[0]!;
    expect(node.type).toBe('itemset');
    if (node.type === 'itemset') {
      expect(node.occurrences[0]!.isValid).toBe(true);
      expect(node.occurrences[1]!.isValid).toBe(false);
      const inputNode = node.occurrences[1]!.children[0]!;
      if (inputNode.type === 'input') {
        expect(inputNode.errors.flat()).toContainEqual({
          message: 'Server says no',
          custom: true,
          server: true,
        });
      }
    }
  });

  it('passes rawValue to descriptor.validate via RawValueMap', () => {
    const validate = vi.fn(() => []);
    mocks.getDefinition.mockReturnValue(makeDefinition({ validate }));

    const input = makeInput('raw', 0, 1);
    const form = new Form([input]);
    const tree = new PropertyTree();
    tree.getRoot().addProperty('raw', ValueTypes.STRING.newValue('typed'));

    const rawValues = new Map([['raw', ['raw-text']]]);
    looseValidate(form, tree.getRoot(), { rawValues });

    expect(validate).toHaveBeenCalledWith(expect.anything(), expect.anything(), 'raw-text');
  });

  it('returns valid node for unregistered input type', () => {
    mocks.getDefinition.mockReturnValue(undefined);

    const input = makeInput('unknown', 0, 1);
    const form = new Form([input]);
    const propertySet = new PropertyTree().getRoot();

    const result = looseValidate(form, propertySet);

    expect(result.isValid).toBe(true);
    const node = result.children[0]!;
    expect(node.type).toBe('input');
    if (node.type === 'input') {
      expect(node.errors).toEqual([]);
    }
  });
});
