import type { InputConfigJson, InputJson } from '@enonic/ui-types';

import { FormItem } from './form-item';
import { InputTypeName } from './input-type-name';
import { Occurrences } from './occurrences';

/** An item the user gives a value to, of one input type, with that type's config from the schema. */
export class Input extends FormItem {
  override readonly kind = 'input';

  private readonly inputType: InputTypeName;
  private readonly label: string;
  private readonly helpText: string | undefined;
  private readonly occurrences: Occurrences;
  private readonly inputTypeConfig: InputConfigJson | undefined;

  constructor(builder: InputBuilder) {
    super(builder.name);
    this.inputType = builder.inputType;
    this.label = builder.label;
    this.helpText = builder.helpText;
    this.occurrences = builder.occurrences;
    this.inputTypeConfig = builder.inputTypeConfig;
  }

  static create(): InputBuilder {
    return new InputBuilder();
  }

  static fromJson(json: InputJson): Input {
    return new InputBuilder().fromJson(json).build();
  }

  getInputType(): InputTypeName {
    return this.inputType;
  }

  getLabel(): string {
    return this.label;
  }

  getHelpText(): string | undefined {
    return this.helpText;
  }

  getOccurrences(): Occurrences {
    return this.occurrences;
  }

  getInputTypeConfig(): InputConfigJson | undefined {
    return this.inputTypeConfig;
  }

  override equals(other: unknown): boolean {
    return (
      super.equals(other) &&
      other instanceof Input &&
      other.inputType.equals(this.inputType) &&
      other.label === this.label &&
      other.helpText === this.helpText &&
      other.occurrences.equals(this.occurrences) &&
      JSON.stringify(other.inputTypeConfig) === JSON.stringify(this.inputTypeConfig)
    );
  }

  toJson(): InputJson {
    return {
      formItemType: 'Input',
      name: this.getName(),
      label: this.label,
      ...(this.helpText === undefined ? {} : { helpText: this.helpText }),
      inputType: this.inputType.toJson(),
      occurrences: this.occurrences.toJson(),
      ...(this.inputTypeConfig === undefined ? {} : { config: this.inputTypeConfig }),
    };
  }
}

export class InputBuilder {
  name = '';
  inputType = new InputTypeName('TextLine');
  label = '';
  helpText: string | undefined;
  occurrences = Occurrences.minmax(0, 1);
  inputTypeConfig: InputConfigJson | undefined;

  setName(value: string): this {
    this.name = value;
    return this;
  }

  setInputType(value: InputTypeName): this {
    this.inputType = value;
    return this;
  }

  setLabel(value: string): this {
    this.label = value;
    return this;
  }

  setHelpText(value: string | undefined): this {
    this.helpText = value;
    return this;
  }

  setOccurrences(value: Occurrences): this {
    this.occurrences = value;
    return this;
  }

  setInputTypeConfig(value: InputConfigJson | undefined): this {
    this.inputTypeConfig = value;
    return this;
  }

  fromJson(json: InputJson): this {
    this.name = json.name;
    this.inputType = InputTypeName.parseInputTypeName(json.inputType);
    this.label = json.label;
    this.helpText = json.helpText;
    this.occurrences = Occurrences.fromJson(json.occurrences);
    this.inputTypeConfig = json.config;
    return this;
  }

  build(): Input {
    return new Input(this);
  }
}
