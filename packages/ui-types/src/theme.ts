/**
 * The theme a user picks, as the applications that share it store it: `system` follows the OS.
 * The stored entry is a contract between separately released applications, kept in
 * `@enonic/ui-utils`.
 */
export type Theme = 'light' | 'dark' | 'system';

/** The theme a page paints: a `Theme` with `system` answered by the OS. */
export type ResolvedTheme = 'light' | 'dark';
