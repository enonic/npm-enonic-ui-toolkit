import {
  Button,
  Combobox,
  FocusContainerContext,
  type FocusContainerRegistry,
  Listbox,
  useFocusContainerRegistry,
  usePortalContainer,
} from '@enonic/ui';
import { FocusTrap } from 'focus-trap-react';
import {
  type CSSProperties,
  forwardRef,
  type ReactElement,
  type ReactNode,
  type RefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

import { useInputTypesPhrases } from '../i18n/use-phrases';
import type { FormOptionSet } from '../schema';
import type { ComponentWithRef } from '../types';
import { ItemLabel } from './item-label';

export type ConfirmPosition = { top: number; left: number; width: number };

type UseConfirmPositionParams = {
  enabled: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  confirmationRef: RefObject<HTMLElement | null>;
};

/** Fixed coordinates for a bar centred above its anchor, following it through resize and scroll. */
export function useConfirmPosition({
  enabled,
  anchorRef,
  confirmationRef,
}: UseConfirmPositionParams): ConfirmPosition | undefined {
  const [position, setPosition] = useState<ConfirmPosition | undefined>(undefined);

  useLayoutEffect(() => {
    if (!enabled) {
      setPosition(undefined);
      return undefined;
    }
    const update = (): void => {
      const anchor = anchorRef.current?.getBoundingClientRect();
      const confirmation = confirmationRef.current?.getBoundingClientRect();
      if (!anchor) return;
      const barHeight = confirmation?.height ?? 0;
      setPosition({ top: anchor.top - barHeight - 20, left: anchor.left, width: anchor.width });
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [enabled, anchorRef, confirmationRef]);

  return position;
}

/** Escape cancels, caught in the capture phase before a popup inside can swallow it. */
export function useConfirmKeyboard(onCancel: () => void, enabled = true): void {
  const onCancelRef = useRef(onCancel);
  onCancelRef.current = onCancel;

  useEffect(() => {
    if (!enabled) return undefined;
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      onCancelRef.current();
    };
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [enabled]);
}

export const SetConfirmOverlay = (): ReactElement => (
  <div className="fixed inset-0 z-30 bg-overlay backdrop-blur-xs" aria-hidden="true" />
);
SetConfirmOverlay.displayName = 'SetConfirmOverlay';

type ConfirmFocusTrapProps = {
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
};

/**
 * A registry that answers to the enclosing one as well as its own: what the confirmation's popup
 * registers with has to reach the dialog around the form, or the dialog reads a click in that
 * popup as one outside itself and closes.
 */
export function chainFocusContainerRegistry(
  parent: FocusContainerRegistry | null,
  own: FocusContainerRegistry,
): FocusContainerRegistry {
  if (parent === null) return own;
  return {
    register: (element) => {
      parent.register(element);
      own.register(element);
    },
    unregister: (element) => {
      parent.unregister(element);
      own.unregister(element);
    },
  };
}

/**
 * A focus trap around a confirmation's portal, with `@enonic/ui`'s focus container so a popup it
 * opens in another portal stays reachable by Tab — as `Dialog.Content` does it. Both the trap and
 * that popup also register with the enclosing container, so a dialog around the form keeps them
 * as its own.
 */
const ConfirmFocusTrap = forwardRef<HTMLDivElement, ConfirmFocusTrapProps>(
  ({ className, style, children }, ref): ReactElement => {
    const [container, setContainer] = useState<HTMLDivElement | null>(null);
    const [portalContainers, setPortalContainers] = useState<HTMLElement[]>([]);

    const setRefs = useCallback(
      (node: HTMLDivElement | null) => {
        setContainer(node);
        if (typeof ref === 'function') ref(node);
        else if (ref != null) ref.current = node;
      },
      [ref],
    );

    const parentRegistry = useFocusContainerRegistry();
    const registry = useMemo(
      () =>
        chainFocusContainerRegistry(parentRegistry, {
          register: (el: HTMLElement) =>
            setPortalContainers((prev) => (prev.includes(el) ? prev : [...prev, el])),
          unregister: (el: HTMLElement) =>
            setPortalContainers((prev) => prev.filter((e) => e !== el)),
        }),
      [parentRegistry],
    );

    useEffect(() => {
      if (container === null || parentRegistry === null) return undefined;
      parentRegistry.register(container);
      return () => parentRegistry.unregister(container);
    }, [container, parentRegistry]);

    const containerElements = useMemo(() => {
      const all: HTMLElement[] = container
        ? [container, ...portalContainers]
        : [...portalContainers];
      return all.length > 0 ? all : undefined;
    }, [container, portalContainers]);

    return (
      <FocusContainerContext.Provider value={registry}>
        <FocusTrap
          active={container != null}
          containerElements={containerElements}
          focusTrapOptions={{
            initialFocus: () => container ?? false,
            fallbackFocus: () => container ?? document.body,
            escapeDeactivates: false,
            clickOutsideDeactivates: false,
            allowOutsideClick: true,
            returnFocusOnDeactivate: true,
            preventScroll: false,
          }}
        >
          <div ref={setRefs} tabIndex={-1} className={className} style={style}>
            {children}
          </div>
        </FocusTrap>
      </FocusContainerContext.Provider>
    );
  },
);
ConfirmFocusTrap.displayName = 'ConfirmFocusTrap';

function positionStyle(position: ConfirmPosition | undefined): CSSProperties {
  return {
    top: position?.top ?? 0,
    left: position?.left ?? 0,
    width: position?.width,
    visibility: position ? 'visible' : 'hidden',
  };
}

export type SetConfirmDeleteProps = {
  position: ConfirmPosition | undefined;
  onCancel: () => void;
  onConfirm: () => void;
};

/** Cancel or Delete, floating above the occurrence about to go. */
const SetConfirmDeleteImpl = forwardRef<HTMLDivElement, SetConfirmDeleteProps>(
  ({ position, onCancel, onConfirm }, ref): ReactElement => {
    const t = useInputTypesPhrases();
    const portalTarget = usePortalContainer() ?? document.body;
    useConfirmKeyboard(onCancel);
    return createPortal(
      <ConfirmFocusTrap
        ref={ref}
        className="fixed z-40 flex justify-center gap-2 outline-none"
        style={positionStyle(position)}
      >
        <Button variant="filled" label={t('enonic.inputTypes.action.cancel')} onClick={onCancel} />
        <Button
          variant="solid"
          label={t('enonic.inputTypes.set.delete')}
          onClick={onConfirm}
          className="bg-btn-error hover:bg-btn-error-hover focus-visible:ring-error/50 active:bg-btn-error-active"
        />
      </ConfirmFocusTrap>,
      portalTarget,
    );
  },
);
SetConfirmDeleteImpl.displayName = 'SetConfirmDelete';

export const SetConfirmDelete: ComponentWithRef<SetConfirmDeleteProps, HTMLDivElement> =
  SetConfirmDeleteImpl;

export type OptionSetConfirmAddProps = {
  optionSet: FormOptionSet;
  position: ConfirmPosition | undefined;
  onCancel: () => void;
  onConfirm: (selectedName: string) => void;
};

/** The option to select for a new radio occurrence, chosen before the occurrence exists. */
const OptionSetConfirmAddImpl = forwardRef<HTMLDivElement, OptionSetConfirmAddProps>(
  ({ optionSet, position, onCancel, onConfirm }, ref): ReactElement => {
    const t = useInputTypesPhrases();
    const portalTarget = usePortalContainer() ?? document.body;
    const [value, setValue] = useState('');
    const filteredOptions = useMemo(
      () =>
        optionSet
          .getOptions()
          .filter((option) =>
            (option.getLabel() || option.getName()).toLowerCase().includes(value.toLowerCase()),
          ),
      [optionSet, value],
    );

    useConfirmKeyboard(onCancel);

    const handleSelectionChange = useCallback(
      (names: readonly string[]) => {
        const first = names[0];
        if (first !== undefined) onConfirm(first);
      },
      [onConfirm],
    );

    return createPortal(
      <ConfirmFocusTrap
        ref={ref}
        className="fixed z-40 flex flex-col gap-5"
        style={positionStyle(position)}
      >
        <div className="flex justify-center">
          <Button
            variant="filled"
            label={t('enonic.inputTypes.action.cancel')}
            onClick={onCancel}
          />
        </div>
        <Combobox.Root
          defaultOpen
          value={value}
          onChange={(next) => setValue(next ?? '')}
          onSelectionChange={handleSelectionChange}
        >
          <Combobox.Content className="w-full">
            <Combobox.Control>
              <Combobox.Search>
                <Combobox.SearchIcon />
                <Combobox.Input placeholder={t('enonic.inputTypes.field.optionPlaceholder')} />
                <Combobox.Toggle />
              </Combobox.Search>
            </Combobox.Control>
            <Combobox.Portal>
              <Combobox.Popup>
                <Listbox.Content className="rounded-sm">
                  {filteredOptions.map((option) => (
                    <Listbox.Item key={option.getName()} value={option.getName()}>
                      <ItemLabel
                        primary={option.getLabel() || option.getName()}
                        secondary={option.getHelpText()}
                      />
                    </Listbox.Item>
                  ))}
                </Listbox.Content>
              </Combobox.Popup>
            </Combobox.Portal>
          </Combobox.Content>
        </Combobox.Root>
      </ConfirmFocusTrap>,
      portalTarget,
    );
  },
);
OptionSetConfirmAddImpl.displayName = 'OptionSetConfirmAdd';

export const OptionSetConfirmAdd: ComponentWithRef<OptionSetConfirmAddProps, HTMLDivElement> =
  OptionSetConfirmAddImpl;
