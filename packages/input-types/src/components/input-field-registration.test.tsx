// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/preact';
import { afterEach, describe, expect, it } from 'vitest';

import { FieldRegistryProvider } from '../context/field-registry-context';
import { InputTypeRegistryProvider } from '../context/input-type-registry-context';
import { PropertyTree, ValueTypes } from '../data';
import { FieldRegistry } from '../field-registry';
import { registerBuiltInTypes } from '../register-built-in-types';
import { InputTypeRegistry } from '../registry';
import { InputBuilder, InputTypeName, Occurrences } from '../schema';
import { CheckboxInput } from './checkbox-input';
import { InputField } from './input-field';

afterEach(cleanup);

const flush = (): Promise<void> => new Promise((resolve) => queueMicrotask(resolve));

function renderField(fieldRegistry: FieldRegistry, name: string, typeName: string) {
  const types = new InputTypeRegistry();
  registerBuiltInTypes(types);
  const input = new InputBuilder()
    .setName(name)
    .setInputType(new InputTypeName(typeName, false))
    .setLabel(name)
    .setOccurrences(Occurrences.minmax(0, 1))
    .setHelpText('')
    .setInputTypeConfig({})
    .build();
  const propertySet = new PropertyTree().getRoot();
  render(
    <InputTypeRegistryProvider registry={types}>
      <FieldRegistryProvider registry={fieldRegistry}>
        <InputField input={input} propertySet={propertySet} enabled />
      </FieldRegistryProvider>
    </InputTypeRegistryProvider>,
  );
  return screen.getByLabelText(name);
}

const renderTitleField = (fieldRegistry: FieldRegistry) =>
  renderField(fieldRegistry, 'title', 'TextLine');

describe('InputField registration', () => {
  it('keeps the field active while the user types in it', async () => {
    const fieldRegistry = new FieldRegistry();
    const activePaths: Array<string | undefined> = [];
    fieldRegistry.subscribeActivePath((path) => activePaths.push(path));
    const textbox = renderTitleField(fieldRegistry);

    textbox.focus();
    await flush();
    fireEvent.input(textbox, { target: { value: 'H' } });
    await flush();
    fireEvent.input(textbox, { target: { value: 'He' } });
    await flush();

    expect(activePaths).toEqual(['.title']);
  });

  it('focuses an occurrence the registry asks for after the values changed', async () => {
    const fieldRegistry = new FieldRegistry();
    const textbox = renderTitleField(fieldRegistry);

    fireEvent.input(textbox, { target: { value: 'H' } });
    await flush();

    expect(fieldRegistry.focus('.title')).toBe(true);
    expect(document.activeElement).toBe(textbox);
  });

  it('reports focus and takes the processing lock on a number input as on a text line', async () => {
    const fieldRegistry = new FieldRegistry();
    const activePaths: Array<string | undefined> = [];
    fieldRegistry.subscribeActivePath((path) => activePaths.push(path));
    const spinbutton = renderField(fieldRegistry, 'amount', 'Double') as HTMLInputElement;

    spinbutton.focus();
    await flush();
    expect(activePaths).toEqual(['.amount']);

    const [occurrenceId] = fieldRegistry.getOccurrenceIds('.amount') ?? [];
    const token = fieldRegistry.acquireProcessing('.amount', occurrenceId!);
    await flush();
    expect(spinbutton.readOnly).toBe(true);
    expect(spinbutton.tabIndex).toBe(-1);

    fieldRegistry.releaseProcessing(token!);
    await flush();
    expect(spinbutton.readOnly).toBe(false);
  });

  it('keeps a disabled checkbox out of reach when nothing marks it read-only', () => {
    const input = new InputBuilder()
      .setName('agree')
      .setInputType(new InputTypeName('Checkbox', false))
      .setLabel('agree')
      .setOccurrences(Occurrences.minmax(0, 1))
      .setHelpText('')
      .setInputTypeConfig({})
      .build();
    render(
      <CheckboxInput
        value={ValueTypes.BOOLEAN.newNullValue()}
        onChange={() => undefined}
        config={{ alignment: 'LEFT' }}
        input={input}
        enabled={false}
        index={0}
        errors={[]}
      />,
    );

    expect((screen.getByLabelText('agree') as HTMLInputElement).disabled).toBe(true);
  });
});
