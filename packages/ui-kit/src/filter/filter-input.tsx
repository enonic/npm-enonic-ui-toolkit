import {
  Button,
  cn,
  Combobox,
  IconButton,
  Listbox,
  Tag,
  useCombobox,
  useComposedRefs,
  useControlledState,
  usePhrases,
} from '@enonic/ui';
import { Check, ListFilter, X } from 'lucide-react';
import {
  forwardRef,
  type KeyboardEvent,
  type PointerEvent,
  type ReactElement,
  type Ref,
  useId,
  useRef,
  useState,
} from 'react';

import {
  fieldTyped,
  groupedValues,
  isOffered,
  matchingFields,
  matchingValues,
  termLabel,
  type FilterField,
  type FilterValue,
} from './filter-fields';
import { filterInputPhrases } from './filter-input.phrases';
import {
  EMPTY_FILTER,
  fieldTerm,
  isFieldTerm,
  termKey,
  textTerm,
  toggledTerm,
  valuesOf,
  withoutTerm,
  withTerm,
  type FilterQuery,
  type FilterTerm,
} from './filter-query';

export type FilterInputProps = {
  /** What the dropdown offers. None leaves the input a free-text search. */
  fields: readonly FilterField[];
  /** The query, controlled; leave it out and the input keeps its own, starting from `defaultValue`. */
  value?: FilterQuery;
  defaultValue?: FilterQuery;
  onChange?: (query: FilterQuery) => void;
  /** What the empty input invites, named for the list: `Search users`. Defaults to the kit's "Search". */
  placeholder?: string;
  disabled?: boolean;
  /** The tags are the whole content: no input, no crosses, no clearing. */
  readOnly?: boolean;
  /** The box reads as invalid; what is wrong with the query is the caller's to say beside it. */
  error?: boolean;
  className?: string;
  'data-component'?: string;
};

const FILTER_INPUT_NAME = 'FilterInput';

// One listbox holds both stages, so the ids say which kind of option was picked.
const FIELD_OPTION = 'field:';
const VALUE_OPTION = 'value:';

/**
 * The filter of a list: values of predefined fields combined with free text, every term a
 * tag. The dropdown opens on a click, a keystroke or an arrow — not on focus, so the focus the
 * library returns to the input on Escape does not reopen it. The fields come first; picking one, or
 * typing its label and a colon, opens its values with their hit counts, and the values stay open
 * across picks so several can be ticked. Enter picks the highlighted option, or adds typed text as
 * a tag when no field is entered. The ref is the text input's.
 */
const FilterInput = forwardRef<HTMLInputElement, FilterInputProps>(
  (
    {
      fields,
      value: controlledValue,
      defaultValue = EMPTY_FILTER,
      onChange: onValueChange,
      placeholder: ownPlaceholder,
      disabled = false,
      readOnly = false,
      error = false,
      className,
      'data-component': componentName = FILTER_INPUT_NAME,
    },
    ref,
  ): ReactElement => {
    const inputRef = useRef<HTMLInputElement>(null);
    const composedRef = useComposedRefs(ref, inputRef);
    const removeRefs = useRef<(HTMLButtonElement | null)[]>([]);
    const pickedRef = useRef(false);
    const keyboardPickRef = useRef(false);
    const headingId = useId();
    const [value, onChange] = useControlledState(controlledValue, defaultValue, onValueChange);
    const [text, setText] = useState('');
    const [open, setOpen] = useState(false);
    const [fieldId, setFieldId] = useState<string>();
    const [activeOption, setActiveOption] = useState<string | null>(null);
    const [announcement, setAnnouncement] = useState({ text: '', key: 0 });

    const t = usePhrases(filterInputPhrases);
    const filterLabel = t('enonic.uiKit.filterInput.label');
    const placeholder = ownPlaceholder ?? t('enonic.uiKit.filterInput.placeholder');
    const valuePlaceholder = t('enonic.uiKit.filterInput.valuePlaceholder');
    const clearLabel = t('enonic.uiKit.filterInput.clear');
    const clearedLabel = t('enonic.uiKit.filterInput.cleared');
    const noMatchesLabel = t('enonic.uiKit.filterInput.noMatches');
    const loadingLabel = t('enonic.uiKit.filterInput.loading');

    const field = fields.find(({ id }) => id === fieldId);
    const stage = field === undefined ? 'fields' : 'values';
    const offeredFields = field === undefined ? matchingFields(fields, text) : [];
    const offeredGroups =
      field === undefined ? [] : groupedValues(matchingValues(field.values, text));
    const offeredValues = offeredGroups.flatMap(({ values }) => values);
    const picked = field === undefined ? undefined : valuesOf(value, field.id);
    // The values stage always has something to say — a value, "no matches", the field's notice.
    const shown = !readOnly && open && (stage === 'values' || offeredFields.length > 0);
    const inert = disabled || readOnly;
    const active = !inert && (value.length > 0 || text.length > 0 || field !== undefined);

    // ? The library highlights an option only while it has the focus, so from the input Enter would act
    // ? on nothing the user can see. The active option is held here instead: the first one the list
    // ? offers, until the user moves it — except in the fields stage with text typed, where Enter is
    // ? the search and nothing is highlighted. It stays put across a pick, so Enter again takes it back.
    const optionIds =
      field === undefined
        ? text.length === 0
          ? offeredFields.map(({ id }) => `${FIELD_OPTION}${id}`)
          : []
        : offeredValues
            .filter((candidate) => isOffered(candidate) || picked?.has(candidate.id) === true)
            .map(({ id }) => `${VALUE_OPTION}${id}`);
    const highlighted =
      activeOption !== null && optionIds.includes(activeOption)
        ? activeOption
        : (optionIds[0] ?? null);

    // What a field is typed as to enter it: the form the tags show, and `Label:` whatever the locale.
    const fieldPrefixes = (label: string): string[] => [
      t('enonic.uiKit.filterInput.fieldPrefix', label),
      `${label}:`,
    ];

    const nameOf = (term: FilterTerm): string => {
      const { field: fieldName, value: valueName } = termLabel(term, fields);
      return fieldName === undefined
        ? valueName
        : t('enonic.uiKit.filterInput.term', fieldName, valueName);
    };

    const focusInput = (): void => {
      inputRef.current?.focus();
    };

    // Keyed, so the same message twice in a row is a new node the live region speaks again.
    const announce = (text: string): void => {
      setAnnouncement((previous) => ({ text, key: previous.key + 1 }));
    };

    const openList = (): void => {
      setOpen(true);
    };

    const enterField = (next: FilterField | undefined, typed = ''): void => {
      setFieldId(next?.id);
      setText(typed);
      if (next !== undefined) {
        openList();
      }
    };

    // A term already held changes nothing and says nothing: `withTerm` answers the same query.
    const add = (term: FilterTerm): void => {
      const next = withTerm(value, term);
      if (next === value) {
        return;
      }

      onChange(next);
      announce(t('enonic.uiKit.filterInput.added', nameOf(term)));
    };

    const remove = (index: number): void => {
      const term = value[index];
      if (term === undefined) {
        return;
      }

      onChange(withoutTerm(value, index));
      announce(t('enonic.uiKit.filterInput.removed', nameOf(term)));
    };

    // A value already picked is picked again to take it back, the way the tag's own cross does; a
    // single-choice field swaps its value. The stage stays, so the next value is one pick away.
    const pickValue = (candidate: FilterValue): void => {
      if (field === undefined) {
        return;
      }

      const term = fieldTerm(field.id, candidate.id);
      if (picked?.has(candidate.id) === true) {
        onChange(toggledTerm(value, term));
        announce(t('enonic.uiKit.filterInput.removed', nameOf(term)));
      } else if (field.multiple === false) {
        const ofField = (held: FilterTerm): boolean => isFieldTerm(held) && held.field === field.id;
        const previous = value.find(ofField);
        if (previous === undefined) {
          add(term);
        } else {
          onChange([...value.filter((held) => !ofField(held)), term]);
          announce(t('enonic.uiKit.filterInput.replaced', nameOf(previous), nameOf(term)));
        }
      } else {
        add(term);
      }
      // The pick stays highlighted once the text that narrowed the list is cleared and the list
      // widens again, so Enter again takes this value back rather than the first of the wider list.
      setActiveOption(`${VALUE_OPTION}${candidate.id}`);
      setText('');
    };

    const handleTextChange = (typed: string | undefined): void => {
      const named =
        field === undefined ? fieldTyped(fields, typed ?? '', fieldPrefixes) : undefined;
      if (named !== undefined) {
        enterField(named.field, named.text);
        return;
      }

      setText(typed ?? '');
      openList();
    };

    const handlePick = ([id]: readonly string[]): void => {
      if (id === undefined) {
        return;
      }

      const fromKeyboard = keyboardPickRef.current;
      keyboardPickRef.current = false;
      pickedRef.current = true;
      if (id.startsWith(FIELD_OPTION)) {
        enterField(fields.find((candidate) => candidate.id === id.slice(FIELD_OPTION.length)));
      } else if (field !== undefined) {
        const candidate = field.values.find(
          ({ id: valueId }) => valueId === id.slice(VALUE_OPTION.length),
        );
        if (candidate !== undefined) {
          pickValue(candidate);
        }
        // A value picked from the keyboard stays focused, so the arrows go on to the next value.
        if (fromKeyboard) {
          return;
        }
      }
      // ! Synchronously, before the library's blur check runs: the option that was clicked is about to
      // ! unmount with the focus on it, and a focus that landed on the body would read as leaving.
      focusInput();
    };

    // Runs on the item before the listbox's own handler toggles it, so the pick knows its source.
    const noteValueKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
      keyboardPickRef.current = event.key === 'Enter' || event.key === ' ';
    };

    const handleOpenChange = (next: boolean): void => {
      // ! A single-select combobox closes on a pick. Ours stays open — a pick swaps the stage, and a
      // ! value picked is one of several — so the close a pick asks for is the one to ignore.
      if (!next && pickedRef.current) {
        pickedRef.current = false;
        return;
      }

      // Leaving the filter abandons a field no value was picked for: a bare `Field:` prefix left in
      // the input would read as a term that narrows nothing.
      if (!next && field !== undefined) {
        enterField(undefined);
      }

      setOpen(next);
    };

    // Enter toggles the highlighted option while the list is open — the same option Enter on the
    // focused item toggles — or enters the highlighted field. Typed text with no field entered is a
    // search term. With nothing highlighted the stage stays — the "no matches" row says why — and a
    // closed list opens.
    const handleEnter = (listOpen: boolean): void => {
      if (field !== undefined) {
        if (!listOpen) {
          openList();
          return;
        }

        const candidate = offeredValues.find(({ id }) => `${VALUE_OPTION}${id}` === highlighted);
        if (candidate !== undefined) {
          pickValue(candidate);
        }
        return;
      }

      const term = textTerm(text);
      if (term !== undefined) {
        add(term);
        setText('');
        return;
      }

      const named = fields.find(({ id }) => `${FIELD_OPTION}${id}` === highlighted);
      if (listOpen && named !== undefined) {
        enterField(named);
      } else {
        openList();
      }
    };

    const handleBackspace = (): void => {
      if (field !== undefined) {
        enterField(undefined);
      } else if (value.length > 0) {
        remove(value.length - 1);
      }
    };

    const handleEscape = (): boolean => {
      if (field === undefined) {
        return false;
      }

      enterField(undefined);
      return true;
    };

    // The tags are one tab stop with the input: arrows walk the crosses, Backspace or Delete on a
    // cross takes its tag back and the focus moves one tag left, or home to the input.
    const focusTag = (index: number): boolean => {
      const cross = removeRefs.current[index];
      if (cross === null || cross === undefined) {
        return false;
      }

      cross.focus();
      return true;
    };

    const handleArrowLeft = (): boolean => focusTag(value.length - 1);

    const handleTagKeyDown = (index: number) => (event: KeyboardEvent<HTMLButtonElement>) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        focusTag(index - 1);
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        if (!focusTag(index + 1)) {
          focusInput();
        }
      } else if (event.key === 'Backspace' || event.key === 'Delete') {
        event.preventDefault();
        remove(index);
        if (!focusTag(index - 1)) {
          focusInput();
        }
      } else if (event.key === 'Escape') {
        event.preventDefault();
        focusInput();
      }
    };

    // A click on the box's own padding is a click on the field: the input takes the focus the body
    // would otherwise get, and the list opens.
    const handleBoxPointerDown = (event: PointerEvent<HTMLDivElement>): void => {
      if (inert || !(event.target instanceof Element) || event.target.closest('button, input')) {
        return;
      }

      event.preventDefault();
      focusInput();
      openList();
    };

    const clear = (): void => {
      if (value.length > 0) {
        onChange([]);
      }
      announce(clearedLabel);
      enterField(undefined);
      focusInput();
    };

    return (
      <Combobox
        open={shown}
        onOpenChange={handleOpenChange}
        value={text}
        onChange={handleTextChange}
        selection={[]}
        onSelectionChange={handlePick}
        active={highlighted}
        setActive={setActiveOption}
        contentType="listbox"
        disabled={disabled}
        error={error}
      >
        {/*
          ! The box is the Content, not the Control: the library anchors its popup to the Control and
          ! gives it the Control's width, so the Control is the input alone — the popup then opens under
          ! the caret, after the tags, and takes the width of what it lists. The border, hover and focus
          ! ring the Control would have drawn move out here, to the box the user sees as the field.
          ! `data-click-outside-ignore` makes the whole box "inside" for the library's outside-click
          ! check, which otherwise knows only the Control: a click on a tag's cross or the Filter button
          ! would close the list and drop the field.
        */}
        <Combobox.Content
          data-component={componentName}
          data-click-outside-ignore
          onPointerDown={handleBoxPointerDown}
          className={cn(
            'bg-surface-neutral border-bdr-subtle flex min-h-12 shrink-0 items-start gap-1.5 rounded-sm border p-1.5',
            'hover:outline-bdr-subtle hover:outline-2',
            'focus-within:ring-ring focus-within:ring-offset-ring-offset focus-within:ring-3 focus-within:ring-offset-3 focus-within:outline-none',
            'transition-highlight',
            shown && 'border-bdr-strong',
            error && 'border-error focus-within:ring-error hover:outline-error',
            disabled && 'pointer-events-none opacity-50',
            className,
          )}
        >
          <Button
            variant="text"
            size="sm"
            startIcon={ListFilter}
            label={filterLabel}
            disabled={inert}
            onClick={() => {
              focusInput();
              openList();
            }}
            className="shrink-0"
          />

          {/* Only this middle wraps; the button and the cross stay on the first line, at the edges. */}
          <div className="flex min-h-9 min-w-0 flex-1 flex-wrap content-center items-center gap-x-2 gap-y-1.5">
            {value.map((term, index) => {
              const { field: fieldName, value: valueName } = termLabel(term, fields);

              return (
                <Tag key={termKey(term)} disabled={disabled}>
                  {fieldName !== undefined && (
                    <Tag.Prefix>{t('enonic.uiKit.filterInput.fieldPrefix', fieldName)}</Tag.Prefix>
                  )}
                  <Tag.Label>{valueName}</Tag.Label>
                  {!readOnly && (
                    <Tag.Remove
                      ref={(node: HTMLButtonElement | null) => {
                        removeRefs.current[index] = node;
                      }}
                      tabIndex={-1}
                      aria-label={t('enonic.uiKit.filterInput.remove', nameOf(term))}
                      disabled={disabled}
                      onClick={() => {
                        remove(index);
                        focusInput();
                      }}
                      onKeyDown={handleTagKeyDown(index)}
                    />
                  )}
                </Tag>
              );
            })}

            {field !== undefined && (
              <span className="text-subtle shrink-0 whitespace-nowrap">
                {t('enonic.uiKit.filterInput.fieldPrefix', field.label)}
              </span>
            )}

            {/* Read-only, the tags are the whole content: an input that takes nothing would be a
                focus stop with nothing to do, and a placeholder that invites a search it cannot take. */}
            {!readOnly && (
              <Combobox.Control className="h-auto min-h-0 min-w-40 flex-1 rounded-none border-0 bg-transparent focus-within:ring-0 focus-within:ring-offset-0">
                <Combobox.Search className="h-auto bg-transparent px-1 py-0 hover:outline-none">
                  <FilterTextInput
                    inputRef={composedRef}
                    text={text}
                    placeholder={field === undefined ? placeholder : valuePlaceholder}
                    // The field the values belong to is in the name, since the prefix beside the
                    // input is not associated with it.
                    label={
                      field === undefined
                        ? placeholder
                        : t('enonic.uiKit.filterInput.term', field.label, valuePlaceholder)
                    }
                    onOpen={openList}
                    onEnter={handleEnter}
                    onBackspace={handleBackspace}
                    onEscape={handleEscape}
                    onArrowLeft={handleArrowLeft}
                  />
                </Combobox.Search>
              </Combobox.Control>
            )}
          </div>

          {active && (
            <IconButton
              icon={X}
              variant="text"
              iconSize={28}
              iconStrokeWidth={1.25}
              title={clearLabel}
              aria-label={clearLabel}
              disabled={disabled}
              onClick={clear}
              className="text-subtle my-1 mr-1 size-7 shrink-0"
            />
          )}

          <div aria-live="polite" className="sr-only">
            <span key={announcement.key}>{announcement.text}</span>
          </div>

          <Combobox.Portal>
            {/* ? `width: auto` undoes the Control's width the library sets inline; the list sizes to its labels. */}
            <Combobox.Popup style={{ width: 'auto' }} className="max-w-md min-w-72">
              {/* Keyed by stage, so the list activates its first option again when the options swap. */}
              <Combobox.ListContent
                key={stage}
                aria-label={field === undefined ? filterLabel : field.label}
                // ? The listbox is left in single mode so Enter on a focused option picks it; what the
                // ? values stage is — several ticks at once — is said here instead.
                aria-multiselectable={
                  field !== undefined && field.multiple !== false ? true : undefined
                }
                className="max-h-72 gap-y-0.5 overflow-y-auto p-2"
              >
                {offeredFields.map(({ id, label, icon: Icon }) => (
                  <Listbox.Item
                    key={id}
                    value={`${FIELD_OPTION}${id}`}
                    className="data-[active]:bg-surface-neutral-hover gap-2.5 rounded-sm px-3 py-2"
                  >
                    {Icon !== undefined && (
                      <Icon
                        size={16}
                        strokeWidth={1.5}
                        className="text-subtle shrink-0"
                        aria-hidden
                      />
                    )}
                    <span className="truncate">{label}</span>
                  </Listbox.Item>
                ))}

                {field?.notice !== undefined && (
                  <div role="presentation" className="text-subtle px-3 py-2 text-xs">
                    {field.notice}
                  </div>
                )}

                {field?.loading === true && (
                  <div role="presentation" aria-busy className="text-subtle px-3 py-2">
                    {loadingLabel}
                  </div>
                )}

                {field !== undefined && field.loading !== true && offeredValues.length === 0 && (
                  <div role="presentation" className="text-subtle px-3 py-2">
                    {noMatchesLabel}
                  </div>
                )}

                {offeredGroups.map(({ label: groupLabel, values }, groupIndex) => {
                  const groupHeadingId =
                    groupLabel === undefined ? undefined : `${headingId}-group-${groupIndex}`;

                  return (
                    <div
                      key={groupLabel === undefined ? 'ungrouped' : `group:${groupLabel}`}
                      role="group"
                      aria-labelledby={groupHeadingId}
                      className="contents"
                    >
                      {groupLabel !== undefined && (
                        <div
                          role="presentation"
                          className="flex w-full items-baseline gap-2.5 px-3 pt-2.5 pb-1"
                        >
                          <span
                            id={groupHeadingId}
                            className="text-subtle min-w-0 truncate text-xs tracking-wider uppercase"
                          >
                            {groupLabel}
                          </span>
                          <span className="border-bdr-subtle min-w-6 flex-1 border-b" />
                        </div>
                      )}

                      {values.map((candidate) => {
                        const selected = picked?.has(candidate.id) === true;

                        return (
                          <Listbox.Item
                            key={candidate.id}
                            value={`${VALUE_OPTION}${candidate.id}`}
                            // Picked or not, the value stays pickable: picking it again takes the term back.
                            disabled={!selected && !isOffered(candidate)}
                            // ? The listbox's own selection stays empty, so Enter keeps picking the option;
                            // ? the item spreads props after its own, which is what lets the state be said here.
                            aria-selected={selected}
                            className="data-[active]:bg-surface-neutral-hover rounded-sm px-3 py-2"
                            onKeyDown={noteValueKeyDown}
                          >
                            <span className="grow truncate">{candidate.label}</span>
                            {selected && (
                              <Check size={16} strokeWidth={2} className="shrink-0" aria-hidden />
                            )}
                            {candidate.count !== undefined && (
                              <span className="text-subtle tabular-nums">({candidate.count})</span>
                            )}
                          </Listbox.Item>
                        );
                      })}
                    </div>
                  );
                })}
              </Combobox.ListContent>
            </Combobox.Popup>
          </Combobox.Portal>
        </Combobox.Content>
      </Combobox>
    );
  },
);

FilterInput.displayName = FILTER_INPUT_NAME;

export { FilterInput };

//
// * Internal
//

/**
 * Whether the key belongs to an IME composition. React keeps the flag on `nativeEvent`, Preact on
 * the event itself; 229 is the key code every browser reports for a composing key.
 */
function isComposing(event: {
  isComposing?: boolean;
  keyCode?: number;
  nativeEvent?: { isComposing?: boolean; keyCode?: number };
}): boolean {
  const native = event.nativeEvent ?? event;
  return native.isComposing === true || native.keyCode === 229;
}

type FilterTextInputProps = {
  inputRef: Ref<HTMLInputElement>;
  text: string;
  placeholder: string;
  label: string;
  onOpen: () => void;
  /** With whether the list is open. */
  onEnter: (listOpen: boolean) => void;
  onBackspace: () => void;
  /** Answers whether it consumed the key; otherwise the library closes the dropdown. */
  onEscape: () => boolean;
  /** Answers whether a tag took the focus. */
  onArrowLeft: () => boolean;
};

/**
 * The input, with the keys a tag input adds to a combobox's: Enter picks or commits, Backspace on an
 * empty input takes the last tag back, Escape steps out of a field, ArrowLeft at the start walks into
 * the tags. Everything else — the arrows into the list, Escape closing — is the library's, reached
 * through its context. A key pressed mid-composition is the IME's.
 */
const FilterTextInput = ({
  inputRef,
  text,
  placeholder,
  label,
  onOpen,
  onEnter,
  onBackspace,
  onEscape,
  onArrowLeft,
}: FilterTextInputProps): ReactElement => {
  const { keyHandler, open } = useCombobox();

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (isComposing(event)) {
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      onEnter(open);
      return;
    }

    if (event.key === 'Backspace' && text.length === 0 && !event.repeat) {
      onBackspace();
      return;
    }

    if (event.key === 'Escape' && onEscape()) {
      event.preventDefault();
      return;
    }

    const atStart =
      event.currentTarget.selectionStart === 0 && event.currentTarget.selectionEnd === 0;
    if (event.key === 'ArrowLeft' && atStart && onArrowLeft()) {
      event.preventDefault();
      return;
    }

    keyHandler(event);
  };

  return (
    <Combobox.Input
      ref={inputRef}
      // The library's input names itself `Search` in English; the caller's own prompt is the name here.
      aria-label={label}
      placeholder={placeholder}
      className="bg-transparent"
      onClick={onOpen}
      onKeyDown={handleKeyDown}
    />
  );
};
FilterTextInput.displayName = 'FilterInput.TextInput';
