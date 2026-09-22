/** The text of a config entry: a string as is, a number or boolean spelled out, anything else empty. */
export function configText(value: unknown): string {
  switch (typeof value) {
    case 'string':
      return value;
    case 'number':
    case 'boolean':
      return String(value);
    default:
      return '';
  }
}
