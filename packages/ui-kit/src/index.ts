/**
 * `@enonic/ui-kit` — the composite React components: what `@enonic/ui` would be if its parts
 * carried behaviour. The dialog shell and its confirmations first; layouts, toolbars and browse
 * screens to follow.
 */

export { useActionDialog } from './dialog/action-dialog-context';
export type { ActionDialogContextValue } from './dialog/action-dialog-context';
export { ActionDialog } from './dialog/action-dialog';
export type {
  ActionDialogActionProps,
  ActionDialogBodyProps,
  ActionDialogContentProps,
  ActionDialogFooterProps,
  DialogIntent,
  DialogSize,
  FooterQuestion,
} from './dialog/action-dialog';
export { DeleteConfirm } from './dialog/delete-confirm';
export type { DeleteConfirmProps } from './dialog/delete-confirm';
export { deleteExpectation } from './dialog/delete-expectation';
export type { DeleteTarget } from './dialog/delete-expectation';
export { DialogPreset } from './dialog/dialog-preset';
export type { DialogPresetConfirmProps } from './dialog/dialog-preset';
export { Gate } from './dialog/gate';
export type { GateHintProps, GateInputProps } from './dialog/gate';
export { matchesExpected } from './dialog/gate-match';
export { useCloseGuard } from './dialog/use-close-guard';
export type { CloseGuard, CloseGuardOptions } from './dialog/use-close-guard';
export { fillPhrase } from './i18n/fill-phrase';
export { uiKitPhrases } from './i18n/phrases';
export type { UiKitPhraseKey } from './i18n/phrases';
export { useUiKitPhrases } from './i18n/use-phrases';
export type { UiKitTranslate } from './i18n/use-phrases';
