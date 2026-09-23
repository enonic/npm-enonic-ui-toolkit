import { type ReactElement, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useFieldRegistry } from '../context/field-registry-context';
import { useInputTypeRegistry } from '../context/input-type-registry-context';
import { useRawValueMap } from '../context/raw-value';
import { useServerErrors } from '../context/server-errors';
import {
  useValidationVisibility,
  type ValidationVisibility,
} from '../context/validation-visibility';
import {
  PropertyArray,
  PropertyPath,
  PropertyPathElement,
  type PropertySet,
  type Value,
} from '../data';
import { computeDefaultValue } from '../descriptor/default-value';
import { getEffectiveOccurrences } from '../descriptor/get-effective-occurrences';
import type { OccurrenceValidationState } from '../descriptor/occurrence-manager';
import type { ValidationResult } from '../descriptor/validation-result';
import {
  generateProcessingToken,
  type ProcessingToken,
  type RevealOptions,
} from '../field-registry';
import { useIsMobile } from '../hooks/use-is-mobile';
import { useOccurrenceManager } from '../hooks/use-occurrence-manager';
import { usePropertyArray } from '../hooks/use-property-array';
import type { Input } from '../schema';
import type {
  InputTypeComponent,
  InputTypeDefinition,
  SelfManagedInputTypeComponent,
} from '../types';
import { getNextMobileFocusTarget } from '../utils/accessibility';
import { bucketServerErrorsByOccurrence, mergeServerErrors } from '../utils/server-errors';
import { getOccurrenceError } from '../utils/validation';
import { FieldError } from './field-error';
import { InputLabel } from './input-label';
import { OccurrenceList } from './occurrence-list';
import { UnsupportedInput } from './unsupported-input';

const INPUT_FIELD_NAME = 'InputField';

export type InputFieldProps = {
  input: Input;
  propertySet: PropertySet;
  enabled: boolean;
};

type SupportedInputTypeDefinition =
  | { mode: 'list'; descriptor: InputTypeDefinition['descriptor']; component: InputTypeComponent }
  | { mode: 'single'; descriptor: InputTypeDefinition['descriptor']; component: InputTypeComponent }
  | {
      mode: 'internal';
      descriptor: InputTypeDefinition['descriptor'];
      component: SelfManagedInputTypeComponent;
    };

export type InputFieldResolvedProps = InputFieldProps & {
  definition: SupportedInputTypeDefinition;
};

function hasComponent(
  definition: InputTypeDefinition | undefined,
): definition is SupportedInputTypeDefinition {
  return definition?.component != null;
}

/**
 * What the visibility lets through: everything on `all`, the touched occurrences on `interactive`,
 * nothing on `none` — except a transient error, which is a system's message and shows regardless.
 * A suppressed occurrence also stops breaking `required`, so no min/max error appears early.
 */
function filterErrors(
  validation: OccurrenceValidationState[],
  visibility: ValidationVisibility,
  touched: Set<number>,
): OccurrenceValidationState[] {
  if (visibility === 'all') return validation;
  return validation.map((entry, index) => {
    if (visibility !== 'none' && touched.has(index)) return entry;
    const transientOnly = entry.validationResults.filter((result) => result.transient === true);
    return { ...entry, breaksRequired: false, validationResults: transientOnly };
  });
}

function moveIndex(index: number, fromIndex: number, toIndex: number): number {
  if (index === fromIndex) return toIndex;
  if (fromIndex < toIndex && index > fromIndex && index <= toIndex) return index - 1;
  if (fromIndex > toIndex && index >= toIndex && index < fromIndex) return index + 1;
  return index;
}

function moveTouchedIndexes(touched: Set<number>, fromIndex: number, toIndex: number): Set<number> {
  if (touched.size === 0 || fromIndex === toIndex) return touched;
  let changed = false;
  const next = new Set<number>();
  touched.forEach((index) => {
    const moved = moveIndex(index, fromIndex, toIndex);
    if (moved !== index) changed = true;
    next.add(moved);
  });
  return changed ? next : touched;
}

function removeTouchedIndex(touched: Set<number>, removedIndex: number): Set<number> {
  if (touched.size === 0) return touched;
  let changed = false;
  const next = new Set<number>();
  touched.forEach((index) => {
    if (index === removedIndex) {
      changed = true;
      return;
    }
    const shifted = index > removedIndex ? index - 1 : index;
    if (shifted !== index) changed = true;
    next.add(shifted);
  });
  return changed ? next : touched;
}

function moveArrayItem<T>(items: T[], fromIndex: number, toIndex: number): T[] {
  if (
    fromIndex < 0 ||
    fromIndex >= items.length ||
    toIndex < 0 ||
    toIndex >= items.length ||
    fromIndex === toIndex
  ) {
    return items;
  }
  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved as T);
  return next;
}

function removeArrayItem<T>(items: T[], index: number): T[] {
  if (index < 0 || index >= items.length) return items;
  const next = items.slice();
  next.splice(index, 1);
  return next;
}

// An internal-mode input is not filled to the minimum, so its configured default is applied
// once here, where the user can still remove it.
function seedInitialDefault(
  propertyArray: PropertyArray,
  mode: SupportedInputTypeDefinition['mode'],
  defaultValue: Value,
): void {
  if (mode !== 'internal' || defaultValue.isNull()) return;
  propertyArray.add(defaultValue);
}

function stripLeadingDot(path: string): string {
  return path.startsWith('.') ? path.slice(1) : path;
}

/**
 * One input of the form, with its array in the tree: reads the schema config, keeps the array
 * filled to the minimum, validates on every change, routes the server's errors to the right
 * occurrence, and registers with the `FieldRegistry` so code outside the form can reach it.
 */
export const InputFieldResolved = ({
  input,
  propertySet,
  enabled,
  definition,
}: InputFieldResolvedProps): ReactElement => {
  const inputName = input.getName();
  const descriptor = definition.descriptor;
  const config = useMemo(
    () => descriptor.readConfig(input.getInputTypeConfig() ?? {}),
    [descriptor, input],
  );
  const occurrences = useMemo(
    () => getEffectiveOccurrences(definition.mode, input.getOccurrences()),
    [definition.mode, input],
  );
  const visibility = useValidationVisibility();
  const isMobile = useIsMobile();
  const rawValueMap = useRawValueMap();
  const [touched, setTouched] = useState<Set<number>>(() => new Set());

  const defaultValue = useMemo(
    (): Value => computeDefaultValue(input, descriptor, config),
    [input, descriptor, config],
  );

  const propertyArray = useMemo(() => {
    let array = propertySet.getPropertyArray(inputName);
    if (array === undefined) {
      array = new PropertyArray({
        parent: propertySet,
        name: inputName,
        type: descriptor.getValueType(),
      });
      propertySet.addPropertyArray(array);
      seedInitialDefault(array, definition.mode, defaultValue);
    }
    return array;
  }, [propertySet, inputName, descriptor, definition.mode, defaultValue]);

  const { values } = usePropertyArray(propertyArray);

  const {
    state,
    minFill,
    add,
    remove,
    move,
    set,
    sync,
    setTransientError,
    clearTransientError,
    clearAllTransientErrors,
    getOccurrenceIds,
  } = useOccurrenceManager({
    occurrences,
    descriptor,
    config,
    initialValues: values,
    autoSeed: definition.mode !== 'internal',
    defaultValue,
  });

  const inputRefsRef = useRef<Map<string, HTMLElement>>(new Map());
  const inputRefCallbacksRef = useRef<Map<string, (el: HTMLElement | null) => void>>(new Map());
  const processingTokensRef = useRef<Map<string, ProcessingToken>>(new Map());
  const suppressBlurNotifyRef = useRef(false);
  const activeNotifierRef = useRef<((path: string | undefined) => void) | null>(null);
  const [, setTick] = useState(0);
  const forceRender = useCallback((): void => setTick((tick) => tick + 1), []);
  const [highlightTrigger, setHighlightTrigger] = useState<
    { occurrenceId: string; count: number } | undefined
  >();

  // Drops the tokens and ref callbacks of occurrences that are gone; the maps are small.
  useEffect(() => {
    const ids = new Set(state.ids);
    let pruned = false;
    processingTokensRef.current.forEach((_token, occurrenceId) => {
      if (!ids.has(occurrenceId)) {
        processingTokensRef.current.delete(occurrenceId);
        pruned = true;
      }
    });
    inputRefCallbacksRef.current.forEach((_callback, occurrenceId) => {
      if (!ids.has(occurrenceId)) inputRefCallbacksRef.current.delete(occurrenceId);
    });
    if (pruned) forceRender();
  }, [state.ids, forceRender]);

  const fieldRegistry = useFieldRegistry();
  const serverErrors = useServerErrors();
  // Not memoized: a parent's reorder changes the set's index without changing its identity.
  const fieldPath = PropertyPath.fromParent(
    propertySet.getPropertyPath(),
    new PropertyPathElement(inputName, 0),
  ).toString();
  const fieldDataPath = stripLeadingDot(fieldPath);
  const fieldPropertyPath = useMemo(() => PropertyPath.fromString(fieldPath), [fieldPath]);
  const serverEntries = serverErrors?.entries;
  const serverErrorsByOccurrence = useMemo(
    () => bucketServerErrorsByOccurrence(serverEntries ?? [], fieldDataPath),
    [serverEntries, fieldDataPath],
  );
  const hasServerErrors = serverErrorsByOccurrence.size > 0;

  // `values` is the trigger; the live array is what is read: under fast typing the hook's
  // snapshot lags the manager, and a stale sync would blank the input.
  useEffect(() => {
    sync(propertyArray.getProperties().map((property) => property.getValue()));
    while (propertyArray.getSize() < minFill) {
      propertyArray.add(defaultValue);
    }
  }, [values, sync, propertyArray, minFill, defaultValue]);

  const markTouched = useCallback((index: number) => {
    setTouched((prev) => {
      if (prev.has(index)) return prev;
      const next = new Set(prev);
      next.add(index);
      return next;
    });
  }, []);

  const handleChange = useCallback(
    (index: number, value: Value, rawValue?: string) => {
      markTouched(index);
      if (rawValueMap != null) {
        let raws = rawValueMap.get(inputName);
        if (raws === undefined) {
          raws = [];
          rawValueMap.set(inputName, raws);
        }
        raws[index] = rawValue;
      }
      // A value that fails validation is stored as null, as an unparseable one already is.
      const stored =
        !value.isNull() && descriptor.validate(value, config, rawValue).length > 0
          ? descriptor.getValueType().newNullValue()
          : value;
      set(index, stored, rawValue);
      propertyArray.set(index, stored);
      if (serverErrorsByOccurrence.has(index)) {
        const occurrencePath = PropertyPath.fromParent(
          propertySet.getPropertyPath(),
          new PropertyPathElement(inputName, index),
        ).toString();
        serverErrors?.clear(stripLeadingDot(occurrencePath));
      }
    },
    [
      markTouched,
      rawValueMap,
      inputName,
      set,
      propertyArray,
      descriptor,
      config,
      serverErrors,
      serverErrorsByOccurrence,
      propertySet,
    ],
  );

  const handleBlur = useCallback((index: number) => markTouched(index), [markTouched]);

  const handleAdd = useCallback(
    (value?: Value) => {
      const newValue = value ?? defaultValue;
      if (!add(newValue)) return;
      propertyArray.add(newValue);
      if (hasServerErrors) serverErrors?.clearField(fieldDataPath);
    },
    [add, propertyArray, defaultValue, hasServerErrors, serverErrors, fieldDataPath],
  );

  const handleRemove = useCallback(
    (index: number) => {
      if (!remove(index)) return;
      setTouched((prev) => removeTouchedIndex(prev, index));
      const raws = rawValueMap?.get(inputName);
      if (rawValueMap != null && raws !== undefined)
        rawValueMap.set(inputName, removeArrayItem(raws, index));
      propertyArray.remove(index);
      if (hasServerErrors) serverErrors?.clearField(fieldDataPath);
    },
    [remove, rawValueMap, inputName, propertyArray, hasServerErrors, serverErrors, fieldDataPath],
  );

  const handleMove = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (!move(fromIndex, toIndex)) return;
      setTouched((prev) => moveTouchedIndexes(prev, fromIndex, toIndex));
      const raws = rawValueMap?.get(inputName);
      if (rawValueMap != null && raws !== undefined) {
        rawValueMap.set(inputName, moveArrayItem(raws, fromIndex, toIndex));
      }
      propertyArray.move(fromIndex, toIndex);
      if (hasServerErrors) serverErrors?.clearField(fieldDataPath);
    },
    [move, rawValueMap, inputName, propertyArray, hasServerErrors, serverErrors, fieldDataPath],
  );

  const filteredValidation = filterErrors(state.occurrenceValidation, visibility, touched);
  const displayValidation = mergeServerErrors(filteredValidation, serverErrorsByOccurrence);
  const filteredState =
    visibility === 'all' && !hasServerErrors
      ? state
      : { ...state, occurrenceValidation: displayValidation };

  const handleMobileComplete = useCallback(
    (index: number, element: HTMLElement): void => {
      for (let nextIndex = index + 1; nextIndex < state.ids.length; nextIndex += 1) {
        const nextId = state.ids[nextIndex];
        const nextOccurrence = nextId === undefined ? undefined : inputRefsRef.current.get(nextId);
        if (
          nextId !== undefined &&
          nextOccurrence !== undefined &&
          !processingTokensRef.current.has(nextId)
        ) {
          requestAnimationFrame(() => nextOccurrence.focus());
          return;
        }
      }
      const nextTarget = getNextMobileFocusTarget(element);
      requestAnimationFrame(() => nextTarget?.focus());
    },
    [state.ids],
  );

  const isOccurrenceProcessing = useCallback(
    (occurrenceId: string | undefined): boolean =>
      occurrenceId !== undefined && processingTokensRef.current.has(occurrenceId),
    [],
  );

  const getInputRefCallback = useCallback(
    (occurrenceId: string): ((el: HTMLElement | null) => void) => {
      const cached = inputRefCallbacksRef.current.get(occurrenceId);
      if (cached !== undefined) return cached;
      const callback = (el: HTMLElement | null): void => {
        if (el == null) {
          inputRefsRef.current.delete(occurrenceId);
        } else {
          inputRefsRef.current.set(occurrenceId, el);
        }
      };
      inputRefCallbacksRef.current.set(occurrenceId, callback);
      return callback;
    },
    [],
  );

  const handleOccurrenceFocus = useCallback((): void => {
    activeNotifierRef.current?.(fieldPath);
  }, [fieldPath]);

  const handleOccurrenceBlur = useCallback(
    (occurrenceIndex: number): void => {
      if (suppressBlurNotifyRef.current) {
        suppressBlurNotifyRef.current = false;
      } else {
        activeNotifierRef.current?.(undefined);
      }
      handleBlur(occurrenceIndex);
    },
    [handleBlur],
  );

  const handleAcquireProcessing = useCallback(
    (occurrenceId: string): ProcessingToken | undefined => {
      if (!state.ids.includes(occurrenceId) || processingTokensRef.current.has(occurrenceId))
        return undefined;
      const token = generateProcessingToken();
      processingTokensRef.current.set(occurrenceId, token);
      // Blur on acquire, without telling subscribers of a blur the user never made.
      const el = inputRefsRef.current.get(occurrenceId);
      if (el !== undefined && document.activeElement === el) {
        suppressBlurNotifyRef.current = true;
        el.blur();
      }
      forceRender();
      return token;
    },
    [state.ids, forceRender],
  );

  const handleReleaseProcessing = useCallback(
    (token: ProcessingToken): boolean => {
      for (const [occurrenceId, stored] of processingTokensRef.current.entries()) {
        if (stored === token) {
          processingTokensRef.current.delete(occurrenceId);
          forceRender();
          return true;
        }
      }
      return false;
    },
    [forceRender],
  );

  const handleIsProcessing = useCallback(
    (occurrenceId: string): boolean => processingTokensRef.current.has(occurrenceId),
    [],
  );

  const handleReveal = useCallback(
    (occurrenceId?: string, options?: RevealOptions): boolean => {
      const targetId = occurrenceId ?? state.ids[0];
      if (targetId === undefined || !state.ids.includes(targetId)) return false;
      const el = inputRefsRef.current.get(targetId);
      if (el === undefined) return false;
      if (
        options?.focus === true &&
        (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) &&
        el.readOnly
      ) {
        return false;
      }
      if (options?.scroll !== false) {
        el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
      setHighlightTrigger((prev) => ({
        occurrenceId: targetId,
        count: (prev?.occurrenceId === targetId ? prev.count : 0) + 1,
      }));
      if (options?.focus === true) {
        el.focus({ preventScroll: true });
      }
      return true;
    },
    [state.ids],
  );

  const handleFocus = useCallback(
    (occurrenceId?: string): boolean => {
      const targetId = occurrenceId ?? state.ids[0];
      if (targetId === undefined || !state.ids.includes(targetId)) return false;
      const el = inputRefsRef.current.get(targetId);
      if (el === undefined) return false;
      if ((el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) && el.readOnly)
        return false;
      el.focus();
      return true;
    },
    [state.ids],
  );

  useEffect(() => {
    if (fieldRegistry === undefined) {
      activeNotifierRef.current = null;
      return undefined;
    }
    const { unregister, notifyActivePath } = fieldRegistry.register(fieldPath, {
      setTransientError,
      clearTransientError,
      clearAllTransientErrors,
      getOccurrenceIds,
      acquireProcessing: handleAcquireProcessing,
      releaseProcessing: handleReleaseProcessing,
      isProcessing: handleIsProcessing,
      reveal: handleReveal,
      focus: handleFocus,
    });
    activeNotifierRef.current = notifyActivePath;
    return () => {
      notifyActivePath(undefined);
      activeNotifierRef.current = null;
      unregister();
    };
  }, [
    fieldRegistry,
    fieldPath,
    setTransientError,
    clearTransientError,
    clearAllTransientErrors,
    getOccurrenceIds,
    handleAcquireProcessing,
    handleReleaseProcessing,
    handleIsProcessing,
    handleReveal,
    handleFocus,
  ]);

  switch (definition.mode) {
    case 'single': {
      const Component = definition.component;
      const occurrenceId = state.ids[0];
      const processing = isOccurrenceProcessing(occurrenceId);
      const fieldErrors = displayValidation[0]?.validationResults ?? [];
      const occurrenceError = getOccurrenceError(occurrences, filteredValidation);
      const allErrors: ValidationResult[] =
        occurrenceError === undefined ? fieldErrors : [...fieldErrors, occurrenceError];
      return (
        <div data-component={INPUT_FIELD_NAME}>
          <Component
            value={state.values[0] ?? descriptor.getValueType().newNullValue()}
            rawValue={state.rawValues[0]}
            onChange={(value: Value, rawValue?: string) => handleChange(0, value, rawValue)}
            onBlur={() => handleOccurrenceBlur(0)}
            onFocus={handleOccurrenceFocus}
            config={config}
            input={input}
            enabled={enabled}
            index={0}
            errors={allErrors}
            readOnly={!enabled || processing}
            processing={processing}
            inputRef={occurrenceId === undefined ? undefined : getInputRefCallback(occurrenceId)}
            highlight={
              occurrenceId !== undefined && highlightTrigger?.occurrenceId === occurrenceId
                ? highlightTrigger.count
                : undefined
            }
          />
        </div>
      );
    }

    case 'internal': {
      const Component = definition.component;
      // A selector does not seed entries, so `interactive` cannot suppress the min breach of an
      // empty field; it shows on `all` only, as a text input's does.
      const occurrenceError =
        visibility === 'all' ? getOccurrenceError(occurrences, filteredValidation) : undefined;
      return (
        <div data-component={INPUT_FIELD_NAME} className="flex flex-col">
          <InputLabel className="mb-2" input={input} />
          <Component
            occurrenceIds={state.ids}
            values={state.values}
            onChange={handleChange}
            onAdd={handleAdd}
            onRemove={handleRemove}
            onMove={handleMove}
            occurrences={occurrences}
            config={config}
            input={input}
            dataPath={fieldPropertyPath}
            enabled={enabled}
            errors={displayValidation}
          />
          <FieldError className="mt-2" error={occurrenceError} />
        </div>
      );
    }

    case 'list': {
      const Component = definition.component;
      // A fresh set per render: the keys live in a ref, so the prop reflects acquire and release.
      const processingOccurrenceIds = new Set(processingTokensRef.current.keys());
      return (
        <div data-component={INPUT_FIELD_NAME}>
          <OccurrenceList.Root
            Component={Component}
            state={filteredState}
            onAdd={() => handleAdd()}
            onRemove={handleRemove}
            onMove={handleMove}
            onChange={handleChange}
            onBlur={handleOccurrenceBlur}
            onFocus={handleOccurrenceFocus}
            onMobileComplete={isMobile ? handleMobileComplete : undefined}
            config={config}
            input={input}
            enabled={enabled}
            processingOccurrenceIds={processingOccurrenceIds}
            getInputRef={getInputRefCallback}
            highlight={highlightTrigger}
          />
        </div>
      );
    }
  }
};
InputFieldResolved.displayName = 'InputFieldResolved';

/** An input by its registered type; a type the registry lacks, or one with no component, renders as unsupported. */
export const InputField = ({ input, propertySet, enabled }: InputFieldProps): ReactElement => {
  const registry = useInputTypeRegistry();
  const definition = registry.getDefinition(input.getInputType().getName());
  if (!hasComponent(definition)) {
    return (
      <div data-component={INPUT_FIELD_NAME}>
        <UnsupportedInput input={input} />
      </div>
    );
  }
  return (
    <InputFieldResolved
      input={input}
      propertySet={propertySet}
      enabled={enabled}
      definition={definition}
    />
  );
};
InputField.displayName = INPUT_FIELD_NAME;
