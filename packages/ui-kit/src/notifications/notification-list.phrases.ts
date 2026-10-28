/** The stack's own English, keyed `enonic.uiKit.notifications.<name>`; see `uiKitPhrases`. */
export const notificationListPhrases = {
  'enonic.uiKit.notifications.label': 'Notifications',
} as const;

export type NotificationListPhraseKey = keyof typeof notificationListPhrases;
