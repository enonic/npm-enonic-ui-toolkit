import { useEffect, useRef } from 'react';

/** Closes a floating thing on any scroll, since it would otherwise drift away from its anchor. */
export function useCloseOnScroll(open: boolean, onClose: () => void): void {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return undefined;
    const handle = (): void => onCloseRef.current();
    window.addEventListener('scroll', handle, true);
    return () => window.removeEventListener('scroll', handle, true);
  }, [open]);
}
