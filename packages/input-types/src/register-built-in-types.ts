import { CheckboxInput } from './components/checkbox-input';
import { ComboBoxInput } from './components/combo-box-input';
import { DateInput } from './components/date-input';
import { DateTimeInput } from './components/date-time-input';
import { DoubleInput } from './components/double-input';
import { GeoPointInput } from './components/geo-point-input';
import { InstantInput } from './components/instant-input';
import { LongInput } from './components/long-input';
import { RadioButtonInput } from './components/radio-button-input';
import { TagInput } from './components/tag-input';
import { TextAreaInput } from './components/text-area-input';
import { TextLineInput } from './components/text-line-input';
import { TimeInput } from './components/time-input';
import { CheckboxDescriptor } from './descriptor/checkbox-descriptor';
import {
  DateDescriptor,
  DateTimeDescriptor,
  InstantDescriptor,
  TimeDescriptor,
} from './descriptor/date-descriptors';
import { DateTimeRangeDescriptor } from './descriptor/date-time-range-descriptor';
import { GeoPointDescriptor } from './descriptor/geo-point-descriptor';
import { DoubleDescriptor, LongDescriptor } from './descriptor/number-descriptors';
import { ComboBoxDescriptor, RadioButtonDescriptor } from './descriptor/option-descriptors';
import { PrincipalSelectorDescriptor } from './descriptor/principal-selector-descriptor';
import { TagDescriptor } from './descriptor/tag-descriptor';
import { TextAreaDescriptor } from './descriptor/text-area-descriptor';
import { TextLineDescriptor } from './descriptor/text-line-descriptor';
import { type InputTypeRegistry, inputTypeRegistry } from './registry';

/**
 * Registers XP's built-in input types, replacing any earlier registration of the same names.
 * `PrincipalSelector` and `DateTimeRange` come as descriptors only: their components need
 * what only an application has — a principal source, a rich date-range widget.
 */
export function registerBuiltInTypes(registry: InputTypeRegistry = inputTypeRegistry): void {
  registry.registerType(
    { mode: 'single', descriptor: CheckboxDescriptor, component: CheckboxInput },
    true,
  );
  registry.registerType({ mode: 'list', descriptor: DateDescriptor, component: DateInput }, true);
  registry.registerType(
    { mode: 'list', descriptor: DateTimeDescriptor, component: DateTimeInput },
    true,
  );
  registry.registerType(
    { mode: 'list', descriptor: DoubleDescriptor, component: DoubleInput },
    true,
  );
  registry.registerType(
    { mode: 'list', descriptor: GeoPointDescriptor, component: GeoPointInput },
    true,
  );
  registry.registerType(
    { mode: 'list', descriptor: InstantDescriptor, component: InstantInput },
    true,
  );
  registry.registerType({ mode: 'list', descriptor: LongDescriptor, component: LongInput }, true);
  registry.registerType({ mode: 'list', descriptor: TimeDescriptor, component: TimeInput }, true);
  registry.registerType(
    { mode: 'single', descriptor: RadioButtonDescriptor, component: RadioButtonInput },
    true,
  );
  registry.registerType(
    { mode: 'list', descriptor: TextAreaDescriptor, component: TextAreaInput },
    true,
  );
  registry.registerType(
    { mode: 'list', descriptor: TextLineDescriptor, component: TextLineInput },
    true,
  );
  registry.registerType({ mode: 'internal', descriptor: TagDescriptor, component: TagInput }, true);
  registry.registerType(
    { mode: 'internal', descriptor: ComboBoxDescriptor, component: ComboBoxInput },
    true,
  );
  registry.registerType({ mode: 'internal', descriptor: PrincipalSelectorDescriptor }, true);
  registry.registerType({ mode: 'list', descriptor: DateTimeRangeDescriptor }, true);
}
