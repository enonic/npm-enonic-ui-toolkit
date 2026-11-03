import { type FocusEventHandler, type MouseEventHandler, type Ref, useRef } from 'react';

// Inside a shadow root `document.activeElement` is the host, so the focus is read from the root
// the element is in.
function activeElementAround(element: Element): Element | null {
  return (element.getRootNode() as Document | ShadowRoot).activeElement;
}

export function hasFocus(element: Element): boolean {
  return element.contains(activeElementAround(element));
}

export type FocusHandOff = {
  /** Spread on the element that holds the toasts. */
  stackProps: {
    ref: Ref<HTMLDivElement>;
    onFocusCapture: FocusEventHandler<HTMLDivElement>;
    onBlurCapture: FocusEventHandler<HTMLDivElement>;
    onClickCapture: MouseEventHandler<HTMLDivElement>;
  };
  /**
   * Called before a toast's wrapper goes: a toast closed from the keyboard while it has the focus
   * hands it to the toast next to it, or back to where the focus came from when the stack was
   * entered.
   */
  handOff: (wrapper: HTMLElement | undefined) => void;
};

export function useFocusHandOff(): FocusHandOff {
  const stack = useRef<HTMLDivElement>(null);
  const enteredFrom = useRef<HTMLElement | null>(null);
  const focusInside = useRef(false);
  // ! A pointer click focuses the button in most browsers, so the focus alone does not tell a
  // ! keyboard close from a mouse one; `detail` is 0 for a key press and an assistive-tech click.
  const closedByKeyboard = useRef(false);

  // A window regaining focus reports no `relatedTarget` although the focus never left the stack.
  const onFocusCapture: FocusEventHandler<HTMLDivElement> = ({ relatedTarget }) => {
    const from = relatedTarget instanceof HTMLElement ? relatedTarget : null;
    if (from == null ? !focusInside.current : !stack.current?.contains(from)) {
      enteredFrom.current = from;
    }
    focusInside.current = true;
  };

  const onBlurCapture: FocusEventHandler<HTMLDivElement> = ({ relatedTarget }) => {
    if (relatedTarget instanceof Node && !stack.current?.contains(relatedTarget)) {
      focusInside.current = false;
    }
  };

  const onClickCapture: MouseEventHandler<HTMLDivElement> = ({ detail }) => {
    closedByKeyboard.current = detail === 0;
  };

  const handOff = (wrapper: HTMLElement | undefined): void => {
    if (wrapper == null || !closedByKeyboard.current || !hasFocus(wrapper)) {
      return;
    }
    const neighbour = wrapper.nextElementSibling ?? wrapper.previousElementSibling;
    const target = neighbour?.querySelector('button') ?? enteredFrom.current;
    if (target?.isConnected) {
      target.focus();
    }
  };

  return {
    stackProps: { ref: stack, onFocusCapture, onBlurCapture, onClickCapture },
    handOff,
  };
}
